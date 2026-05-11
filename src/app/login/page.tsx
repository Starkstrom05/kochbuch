import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth/auth";
import { auth } from "@/lib/auth/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) redirect(params.redirect ?? "/rezepte");

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const target = String(formData.get("redirect") ?? "/rezepte");
    await signIn("credentials", { email, password, redirectTo: target });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <h1 className="font-hand text-5xl text-ink ink-text">Willkommen zurück</h1>
      <p className="mt-2 font-written text-ink-faded">Bitte melde dich an</p>

      <form
        action={loginAction}
        className="paper-card mt-8 w-full space-y-4 p-6 hand-tilt-3"
      >
        <input type="hidden" name="redirect" value={params.redirect ?? "/rezepte"} />

        <label className="block">
          <span className="font-written text-sm text-ink-faded">E-Mail</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-sm border-b-2 border-dotted border-ink-light bg-transparent px-2 py-2 font-serif text-ink outline-none focus:border-ribbon"
          />
        </label>

        <label className="block">
          <span className="font-written text-sm text-ink-faded">Passwort</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-sm border-b-2 border-dotted border-ink-light bg-transparent px-2 py-2 font-serif text-ink outline-none focus:border-ribbon"
          />
        </label>

        {params.error ? (
          <p className="font-written text-sm text-ribbon">Anmeldung fehlgeschlagen.</p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-sm bg-ribbon px-4 py-2 font-hand text-2xl text-paper-50 shadow-card hover:rotate-[-0.5deg]"
        >
          Anmelden
        </button>
      </form>

      <Link
        href="/"
        className="mt-6 font-written text-sm text-ink-faded underline underline-offset-4"
      >
        zurück zur Startseite
      </Link>
    </main>
  );
}
