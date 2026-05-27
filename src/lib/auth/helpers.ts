import { auth } from "@/lib/auth/auth";
import { isRole } from "@/lib/db/enums";
import type { Actor } from "@/lib/cookbooks/permissions";

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

/**
 * Baut den `Actor` fuer Permission-Checks aus einer Session — mit Runtime-
 * Validierung der Rolle, statt sie blind in das `Role`-Union zu casten. Wenn
 * die DB irgendwann eine neue/unbekannte Rolle liefert, faellt das sofort
 * auf, statt sich in spaeteren Permission-Vergleichen als false-positive
 * zu verstecken.
 */
export function actorFromSession(session: { user: { id: string; role: string } }): Actor {
  if (!isRole(session.user.role)) {
    throw new Error(`Unbekannte User-Rolle: ${session.user.role}`);
  }
  return { id: session.user.id, role: session.user.role };
}
