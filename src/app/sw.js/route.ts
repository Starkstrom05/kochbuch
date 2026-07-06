import packageJson from "../../../package.json";
import { buildServiceWorkerSource } from "@/lib/pwa/service-worker";

// `/sw.js` wird dynamisch mit der App-Version im Cache-Namen ausgeliefert, damit
// jeder Release den PWA-Cache invalidiert. `no-cache` sorgt dafuer, dass iOS den
// neuen Worker zuegig zieht statt eine alte Kopie zu behalten.
export const dynamic = "force-dynamic";

export function GET() {
  const body = buildServiceWorkerSource(packageJson.version);
  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
