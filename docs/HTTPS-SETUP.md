# HTTPS für das Kochbuch (Tailscale + MagicDNS)

Die PWA-Installation auf iPad/iPhone funktioniert nur über HTTPS mit gültigem Zertifikat. Im Heim-LAN heißt der einfachste Weg dazu **Tailscale** mit **MagicDNS** und HTTPS — Tailscale stellt automatisch ein gültiges Cert für `<hostname>.<tailnet>.ts.net` aus (Let's-Encrypt im Hintergrund), kostenlos für Privatnutzung.

> **Warum HTTPS auch sonst wichtig ist:** Browser geben Web-APIs wie **Web Share**
> (`navigator.share`) und die **Zwischenablage** (`navigator.clipboard`) nur in einem
> *Secure Context* frei — also über `https://` oder `http://localhost`, **nicht** über
> eine LAN-IP wie `http://192.168.x.x:3000`. Solange das Kochbuch nur über die nackte
> LAN-IP läuft, fällt der „Teilen"-Button der Einkaufsliste auf das manuelle
> Kopier-Overlay zurück. Mit HTTPS (Tailscale) funktioniert natives Teilen direkt.

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

## 4. AUTH_URL anpassen

Das Kochbuch nutzt **NextAuth v5** — die maßgebliche Variable heißt **`AUTH_URL`**
(nicht `NEXTAUTH_URL`). Damit Login-Redirects und Cookies auf den HTTPS-Host zeigen,
in `docker-compose.truenas.yml` setzen:

```yaml
environment:
  AUTH_URL: "https://nas.<tailnet>.ts.net"
  AUTH_TRUST_HOST: "true"   # nötig hinter dem Tailscale-Serve-Proxy
```

`AUTH_TRUST_HOST: "true"` ist bereits im Compose gesetzt und sorgt dafür, dass
NextAuth dem vom Proxy weitergereichten Host/Protokoll vertraut. Sobald `AUTH_URL`
auf `https://…` zeigt, setzt NextAuth automatisch *secure* Cookies.

…danach Container neu starten.

## Bekannte Stolperfallen

- **Tailscale-Knoten offline → kein Zertifikat:** Wenn der NAS stundenlang offline war, prüft `tailscale up`. Erst dann lässt sich das Cert erneuern.
- **iPad zeigt 502 / weiße Seite:** Wahrscheinlich ist der Kochbuch-Container down. Auf der NAS-Shell `docker ps | grep kochbuch` prüfen.
- **MagicDNS-Name löst nicht auf:** Auf dem iPad in den Tailscale-App-Einstellungen MagicDNS aktivieren.
- **Apple-Pencil-Latenz hoch:** Vermutlich nicht Tailscale, sondern PWA-Standalone-Modus. Test auch in Safari direkt.

## Alternative: mkcert + Caddy-Reverse-Proxy (reines LAN, ohne Tailnet)

Wer kein Tailscale will, kann lokal ein vertrauenswürdiges Cert mit
[`mkcert`](https://github.com/FiloSottile/mkcert) erzeugen und einen schlanken
**Caddy**-Reverse-Proxy davorschalten:

```bash
# Auf einem Rechner mit mkcert:
mkcert -install                       # lokale Root-CA anlegen
mkcert kochbuch.lan 192.168.188.50    # Cert + Key fuer Hostname/IP
# erzeugte .pem-Dateien auf den NAS in ./certs/ legen
```

`Caddyfile`:

```
kochbuch.lan {
  tls /certs/kochbuch.lan.pem /certs/kochbuch.lan-key.pem
  reverse_proxy kochbuch:3000
}
```

Als Sidecar im Compose (Ports 443→Caddy, Caddy→`kochbuch:3000`), dann
`AUTH_URL: "https://kochbuch.lan"` setzen. **Caveat:** Die mkcert-Root-CA muss auf
**jedem** Gerät installiert/vertraut werden (auf iOS umständlich) — deshalb ist für
iPad-Familien Tailscale meist die bessere Wahl.

## Weitere Alternativen (kurz)

- **eigene Domain + Let's-Encrypt-via-Cloudflare-DNS-01:** mehr Aufwand, eigene Domain nötig
- **selbst signiertes Cert + Cert auf iPad installieren:** funktioniert, aber Cert läuft 365 Tage und Apple-Cert-Trust ist umständlich
- **HTTP only im LAN:** PWA-Install fällt flach, kein Service-Worker, kein Apple-Pencil-Persist, und natives Teilen/Clipboard (Secure Context) fehlt

Tailscale ist für ein Familien-NAS der pragmatische Sweet-Spot.
