# HTTPS für das Kochbuch (Tailscale + MagicDNS)

Die PWA-Installation auf iPad/iPhone funktioniert nur über HTTPS mit gültigem Zertifikat. Im Heim-LAN heißt der einfachste Weg dazu **Tailscale** mit **MagicDNS** und HTTPS — Tailscale stellt automatisch ein gültiges Cert für `<hostname>.<tailnet>.ts.net` aus (Let's-Encrypt im Hintergrund), kostenlos für Privatnutzung.

## Voraussetzungen

- TrueNAS Scale mit dem Kochbuch-Container (siehe `README.md`)
- Tailscale-Account (gratis, https://login.tailscale.com)
- iPad/iPhone, auf dem das Tailscale-Profil installiert wird

## 1. Tailscale auf TrueNAS installieren

TrueNAS Scale 24+ bringt Tailscale als System-App mit. Sonst über die Apps-Library:

1. **Apps → Discover → Tailscale → Install**
2. Im Install-Dialog:
   - `Tailscale Auth Key`: leer lassen — erste Authentifizierung läuft per Browser
   - `Accept Routes`: an
3. Nach dem Start: **Apps → Tailscale → Shell** öffnen
4. `tailscale up` → URL kopieren, im Browser öffnen, Account verknüpfen
5. In der Tailscale-Admin-Console:
   - Den NAS-Knoten umbenennen, z. B. `nas`
   - **DNS → MagicDNS** aktivieren (falls noch nicht an)
   - **DNS → HTTPS Certificates** aktivieren

Der NAS hat jetzt die Adresse `nas.<tailnet>.ts.net`, wobei `<tailnet>` automatisch vergeben wird (z. B. `tail1234.ts.net`).

## 2. Tailscale-Serve vor das Kochbuch schalten

Auf der NAS-Shell (Tailscale-App):

```bash
tailscale serve --bg --https=443 --set-path=/ http://localhost:3000
```

`--bg` läuft persistent über Container-Neustarts (Tailscale speichert die Config). Der HTTP-Port 3000 ist der, auf dem der Kochbuch-Container im Host-Netz erreichbar ist (siehe `docker-compose.truenas.yml`).

Prüfen:

```bash
tailscale serve status
# erwartet: https://nas.<tailnet>.ts.net (tailnet only) → http://localhost:3000
```

## 3. iPad einrichten

1. App Store → **Tailscale** installieren
2. Anmelden mit demselben Account
3. Safari öffnen → `https://nas.<tailnet>.ts.net` → Kochbuch öffnet sich mit gültigem Schloss-Symbol
4. **Teilen → Zum Home-Bildschirm hinzufügen** → die PWA installiert sich

## 4. NEXTAUTH_URL anpassen

Damit NextAuth-Redirects auf den richtigen Host zeigen, setze in `docker-compose.truenas.yml`:

```yaml
environment:
  NEXTAUTH_URL: "https://nas.<tailnet>.ts.net"
```

…und Container neu starten.

## Bekannte Stolperfallen

- **Tailscale-Knoten offline → kein Zertifikat:** Wenn der NAS stundenlang offline war, prüft `tailscale up`. Erst dann lässt sich das Cert erneuern.
- **iPad zeigt 502 / weiße Seite:** Wahrscheinlich ist der Kochbuch-Container down. Auf der NAS-Shell `docker ps | grep kochbuch` prüfen.
- **MagicDNS-Name löst nicht auf:** Auf dem iPad in den Tailscale-App-Einstellungen MagicDNS aktivieren.
- **Apple-Pencil-Latenz hoch:** Vermutlich nicht Tailscale, sondern PWA-Standalone-Modus. Test auch in Safari direkt.

## Alternativen (kurz)

- **eigene Domain + Let's-Encrypt-via-Cloudflare-DNS-01:** mehr Aufwand, eigene Domain nötig
- **selbst signiertes Cert + Cert auf iPad installieren:** funktioniert, aber Cert läuft 365 Tage und Apple-Cert-Trust ist umständlich
- **HTTP only im LAN:** PWA-Install fällt flach, kein Service-Worker, kein Apple-Pencil-Persist

Tailscale ist für ein Familien-NAS der pragmatische Sweet-Spot.
