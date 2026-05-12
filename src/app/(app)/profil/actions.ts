"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  changePasswordSchema,
  createUserSchema,
} from "@/lib/schemas/profile";

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
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
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

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
    },
  });

  revalidatePath("/profil");
  return {
    status: "success",
    message: `Benutzer „${parsed.data.name}" angelegt`,
  };
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
  await prisma.user.delete({ where: { id: targetId } });
  revalidatePath("/profil");
}
