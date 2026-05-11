import type { ReactNode } from "react";

// All pages under (app)/ touch the database and rely on the session,
// so prerendering them at build time would fail (no DATABASE_URL,
// no session cookie). Force dynamic for the whole group.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
