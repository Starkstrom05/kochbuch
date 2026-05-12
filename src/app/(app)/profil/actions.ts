"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { changePasswordSchema } from "@/lib/schemas/profile";

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
