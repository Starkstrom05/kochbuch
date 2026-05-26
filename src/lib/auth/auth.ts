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
      familyId: string | null;
      activeCookbookId: string | null;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          familyId: user.familyId,
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
        token.familyId = (user as { familyId?: string | null }).familyId ?? null;
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
        session.user.familyId = (token.familyId as string | null) ?? null;
        session.user.activeCookbookId = (token.activeCookbookId as string | null) ?? null;
      }
      return session;
    },
  },
});
