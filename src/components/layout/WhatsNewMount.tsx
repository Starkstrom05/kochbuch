import packageJson from "../../../package.json";
import { loadChangelog } from "@/lib/changelog/load";
import { WhatsNewButton, WhatsNewDrawer } from "./WhatsNewDrawer";

type Variant = "auto" | "button";

/**
 * Server-Wrapper fuer den Whats-New-Drawer: laedt CHANGELOG.md serverseitig
 * und reicht das Ergebnis an die Client-Komponente weiter. So muss der Drawer
 * weder zur Laufzeit fetchen noch grosse Markdown-Strings im Bundle bekommen.
 *
 * variant=auto → Drawer, der sich nach Update einmal automatisch oeffnet
 * variant=button → Knopf (z.B. im Profil), der den Drawer manuell oeffnet
 */
export function WhatsNewMount({ variant = "auto" }: { variant?: Variant }) {
  const releases = loadChangelog();
  if (releases.length === 0) return null;
  const currentVersion = packageJson.version;
  if (variant === "button") {
    return <WhatsNewButton currentVersion={currentVersion} releases={releases} />;
  }
  return <WhatsNewDrawer currentVersion={currentVersion} releases={releases} />;
}
