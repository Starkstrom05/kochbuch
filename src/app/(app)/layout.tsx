import type { ReactNode } from "react";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import { WhatsNewMount } from "@/components/layout/WhatsNewMount";
import { AppHeader } from "@/components/layout/AppHeader";
import { Providers } from "@/components/layout/Providers";

// All pages under (app)/ touch the database and rely on the session,
// so prerendering them at build time would fail (no DATABASE_URL,
// no session cookie). Force dynamic for the whole group.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <UpdateBanner />
      <WhatsNewMount variant="auto" />
      <AppHeader />
      {children}
    </Providers>
  );
}
