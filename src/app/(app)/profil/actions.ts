"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signOut } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { changePasswordSchema, createUserSchema, createFamilySchema } from "@/lib/schemas/profile";
import { seedNutrition } from "@/lib/nutrition/seed";

const assignUserFamilySchema = z.object({
  userId: z.string().min(1).max(64),
  familyId: z.string().min(1).max(64).nullable(),
});

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

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
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
    familyId: String(formData.get("familyId") ?? "") || undefined,
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

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
      familyId: parsed.data.familyId ?? null,
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

  await prisma.user.delete({ where: { id: targetId } });
  revalidatePath("/profil");
}

export async function createFamilyAction(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Keine Berechtigung");
  const parsed = createFamilySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültiger Name");
  }
  await prisma.family.create({ data: { name: parsed.data.name } });
  revalidatePath("/profil");
}

export async function assignUserFamilyAction(userId: string, familyId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Keine Berechtigung");
  const parsed = assignUserFamilySchema.parse({
    userId,
    familyId: familyId ? familyId : null,
  });
  const fam = parsed.familyId
    ? await prisma.family.findUnique({
        where: { id: parsed.familyId },
        select: { id: true },
      })
    : null;
  await prisma.user.update({
    where: { id: parsed.userId },
    data: { familyId: fam?.id ?? null },
  });
  revalidatePath("/profil");
}

export async function createCategoryAction(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Keine Berechtigung");
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;
  if (!name) throw new Error("Name fehlt");
  try {
    await prisma.category.create({
      data: { name, icon, familyId: session.user.familyId ?? null },
    });
  } catch {
    // Name ist global eindeutig — Kollision freundlich melden.
    throw new Error(`Kategorie „${name}" existiert bereits`);
  }
  revalidatePath("/profil");
  revalidatePath("/rezepte");
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function parseColor(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return HEX_COLOR.test(s) ? s.toLowerCase() : null;
}

export async function updateBrandingAction(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Keine Berechtigung");
  const familyId = session.user.familyId;
  if (!familyId) throw new Error("Du bist keiner Familie zugeordnet");

  const name = String(formData.get("name") ?? "").trim();
  const useColors = formData.get("customColors") === "on";

  await prisma.family.update({
    where: { id: familyId },
    data: {
      ...(name ? { name } : {}),
      accentColor: useColors ? parseColor(formData.get("accentColor")) : null,
      inkColor: useColors ? parseColor(formData.get("inkColor")) : null,
      paperColor: useColors ? parseColor(formData.get("paperColor")) : null,
    },
  });

  // Theme (layout) + Profil neu rendern.
  revalidatePath("/", "layout");
  revalidatePath("/profil");
}

export async function reloadNutritionAction(): Promise<{ count: number }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Keine Berechtigung");
  // Spielt die gebündelte Nährwert-Tabelle (idempotent) ein — für Bestands-
  // Installationen, bei denen der Seed nicht erneut läuft.
  return seedNutrition(prisma);
}
