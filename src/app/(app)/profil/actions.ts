"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { changePasswordSchema, createUserSchema } from "@/lib/schemas/profile";
import { seedNutrition } from "@/lib/nutrition/seed";
import { deleteRecipeImageFiles } from "@/lib/images/upload";

// Kostenfaktor 12 statt 10 — robuster gegen Offline-Cracking bei einem
// DB-Leak, bei vertretbarer Mehrkosten pro Hash auf Server-Hardware.
const BCRYPT_COST = 12;

export type ChangePasswordState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Nicht angemeldet" };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { status: "error", message: "Benutzer nicht gefunden" };

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return { status: "error", message: "Aktuelles Passwort ist falsch" };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Sicherheitshalber abmelden, damit ein evtl. anderer Browser den
  // alten Session-Token verliert. (JWT-Strategie hat keine serverseitige
  // Invalidierung — Re-Login ist der pragmatische Weg.)
  await signOut({ redirect: false });
  redirect("/login?passwordChanged=1");
}

export type CreateUserState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Nicht angemeldet" };
  }
  if (session.user.role !== "ADMIN") {
    return { status: "error", message: "Nur Admins dürfen Benutzer anlegen" };
  }

  const parsed = createUserSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "MEMBER"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { status: "error", message: "E-Mail ist bereits vergeben" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
    },
  });

  // Jeder neue User bekommt ein eigenes Kochbuch und es wird als aktiv gesetzt.
  // Damit ist die Schreib-Berechtigung beim ersten Login bereits gegeben.
  const cookbook = await prisma.cookbook.create({
    data: { ownerId: user.id, name: `${parsed.data.name} Kochbuch` },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { activeCookbookId: cookbook.id },
  });

  revalidatePath("/profil");
  return {
    status: "success",
    message: `Benutzer „${parsed.data.name}" angelegt`,
  };
}

export async function updateAppNameAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  if (session.user.role !== "ADMIN") throw new Error("Keine Berechtigung");

  const name = String(formData.get("appName") ?? "").trim();
  if (!name) throw new Error("Name darf nicht leer sein");

  await prisma.appMeta.upsert({
    where: { key: "appName" },
    update: { value: name },
    create: { key: "appName", value: name },
  });

  revalidatePath("/", "layout");
}

export async function deleteUserAction(targetId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  if (session.user.role !== "ADMIN") throw new Error("Keine Berechtigung");
  if (session.user.id === targetId) {
    throw new Error("Du kannst dich nicht selbst löschen");
  }
  // Vor dem Löschen prüfen, dass mindestens ein Admin übrig bleibt.
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true },
  });
  if (!target) return;
  if (target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: targetId } },
    });
    if (otherAdmins === 0) {
      throw new Error("Der letzte Admin kann nicht gelöscht werden");
    }
  }

  // Recipe.createdById ist Restrict — ein User mit eigenen Rezepten kann nicht
  // einfach geloescht werden, ohne dass Prisma mit P2003 wirft. Vorab pruefen
  // und konkret melden, damit der Admin weiss, was zu tun ist (Rezepte in ein
  // anderes Cookbook klonen oder den User vorher entleeren).
  const ownedRecipes = await prisma.recipe.count({ where: { createdById: targetId } });
  if (ownedRecipes > 0) {
    throw new Error(
      `User besitzt noch ${ownedRecipes} Rezept${ownedRecipes === 1 ? "" : "e"} — bitte zuerst in ein anderes Kochbuch klonen oder loeschen.`,
    );
  }

  // Vor dem harten Delete alle Bildpfade der eigenen Cookbooks einsammeln —
  // die DB-Cascade (Cookbook -> Recipe -> RecipeImage, alles onDelete:
  // Cascade) räumt nur Zeilen weg, die Dateien im UPLOAD_DIR blieben sonst
  // als Waisen liegen. Löschen erst NACH erfolgreichem DB-Delete (best-effort,
  // analog zu deleteCookbook in lib/cookbooks/server.ts).
  const ownedCookbooks = await prisma.cookbook.findMany({
    where: { ownerId: targetId },
    select: {
      coverImagePath: true,
      recipes: { select: { handwrittenPath: true, images: { select: { path: true } } } },
    },
  });

  await prisma.user.delete({ where: { id: targetId } });

  const imagePaths: string[] = [];
  for (const cookbook of ownedCookbooks) {
    if (cookbook.coverImagePath) imagePaths.push(cookbook.coverImagePath);
    for (const recipe of cookbook.recipes) {
      if (recipe.handwrittenPath) imagePaths.push(recipe.handwrittenPath);
      for (const img of recipe.images) imagePaths.push(img.path);
    }
  }
  await Promise.all(imagePaths.map((p) => deleteRecipeImageFiles(p).catch(() => undefined)));

  revalidatePath("/profil");
}

export async function createCategoryAction(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Keine Berechtigung");
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;
  if (!name) throw new Error("Name fehlt");
  const cookbookId = session.user.activeCookbookId ?? null;

  // @@unique([cookbookId, name]) greift bei cookbookId=null NICHT (SQLite
  // behandelt NULL im Unique-Index als paarweise distinct) — ohne diesen
  // App-Level-Check könnten beliebig viele globale Duplikate entstehen.
  const existing = await prisma.category.findFirst({
    where: { cookbookId, name },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Kategorie „${name}" existiert bereits`);
  }

  try {
    await prisma.category.create({
      data: { name, icon, cookbookId },
    });
  } catch {
    throw new Error(`Kategorie „${name}" existiert bereits`);
  }
  revalidatePath("/profil");
  revalidatePath("/rezepte");
}

export async function reloadNutritionAction(): Promise<{ count: number }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Keine Berechtigung");
  // Spielt die gebündelte Nährwert-Tabelle (idempotent) ein — für Bestands-
  // Installationen, bei denen der Seed nicht erneut läuft.
  return seedNutrition(prisma);
}
