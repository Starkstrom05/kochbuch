import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <Link
          href="/rezepte"
          className="font-written text-sm text-ribbon underline underline-offset-4"
        >
          ← zurück
        </Link>
        <h1 className="mt-2 font-hand text-6xl text-ink ink-text">Profil</h1>
        <p className="font-written text-ink-faded">
          {session.user.name ? `${session.user.name} · ` : ""}
          {session.user.email}
        </p>
      </header>

      <ChangePasswordForm />
    </main>
  );
}
