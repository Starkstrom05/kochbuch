import { auth } from "@/lib/auth/auth";

/** Wirft, wenn nicht angemeldet. Liefert den Session-User (inkl. familyId). */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  return session.user;
}

/** Wirft, wenn nicht Admin. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Keine Berechtigung");
  return user;
}
