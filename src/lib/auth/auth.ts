import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/lib/db/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      activeCookbookId: string | null;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Einfaches In-Memory-Rate-Limit gegen Credential-Stuffing/Brute-Force, ohne
// externen Dienst oder neue DB-Tabelle: pro (E-Mail + IP) sind maximal
// MAX_ATTEMPTS Fehlversuche innerhalb WINDOW_MS erlaubt, danach wird bis zum
// Fensterende abgelehnt, noch bevor bcrypt.compare (teuerste Operation)
// läuft. Reicht für die Familien-Instanz mit einem Node-Prozess; bei
// mehreren Prozessen/Replicas (hier nicht der Fall) müsste das in einen
// gemeinsamen Store wandern. Bewusst kein Lockout nach Erfolg — der Zähler
// wird bei einem korrekten Login zurückgesetzt.
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function loginRateLimitKey(email: string, ip: string): string {
  return `${email.toLowerCase()}:${ip}`;
}

function isLoginRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.windowStart > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const ip = clientIpFromRequest(request);
        const rateLimitKey = loginRateLimitKey(parsed.data.email, ip);
        if (isLoginRateLimited(rateLimitKey)) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) {
          recordFailedLogin(rateLimitKey);
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          recordFailedLogin(rateLimitKey);
          return null;
        }
        clearLoginAttempts(rateLimitKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          activeCookbookId: user.activeCookbookId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "MEMBER";
        token.activeCookbookId =
          (user as { activeCookbookId?: string | null }).activeCookbookId ?? null;
      }
      // Bei Cookbook-Wechsel triggern wir update({ activeCookbookId }) clientseitig;
      // hier landet der neue Wert im Token.
      if (trigger === "update" && session && typeof session === "object") {
        const next = (session as { activeCookbookId?: string | null }).activeCookbookId;
        if (typeof next === "string" || next === null) token.activeCookbookId = next;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.activeCookbookId = (token.activeCookbookId as string | null) ?? null;
      }
      return session;
    },
  },
});
