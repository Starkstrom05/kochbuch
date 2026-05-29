# Kochbuch auf TrueNAS Scale installieren (YAML-Modus, mit Ollama)

Komplettes Setup in ca. 10 Minuten + Modell-Pull. Vorausgesetzt wird TrueNAS
Scale **Electric Eel** oder neuer (Custom App per YAML).

> Wenn du **kein Ollama** brauchst und stattdessen den Wizard-Modus mit
> Formularfeldern bevorzugst, siehe
> [`INSTALL-TRUENAS-WIZARD.md`](INSTALL-TRUENAS-WIZARD.md).

---

## 1. Datasets anlegen

In der TrueNAS-UI unter **Datasets** → deinen Pool wählen → drei Datasets
verschachtelt anlegen:

```
<dein-pool>/apps/kochbuch/db
<dein-pool>/apps/kochbuch/images
<dein-pool>/apps/kochbuch/ollama
```

Standard-Eigenschaften reichen.

## 2. Compose-YAML erzeugen

Auf deinem Rechner im Projekt-Root:

```bash
bash scripts/install-truenas.sh -o kochbuch-truenas.yml
```

Das Skript fragt Pool-Name und NAS-IP ab, generiert das AUTH_SECRET per
`openssl rand -base64 32` und schreibt eine fertige Datei.

Alternativ ohne Skript: `docker-compose.truenas.yml` öffnen und die drei
Platzhalter `<POOL>`, `<NAS-IP>`, `<AUTH_SECRET>` per Suchen & Ersetzen
durch deine Werte tauschen.

## 3. Custom App in TrueNAS anlegen

TrueNAS-UI:

1. **Apps** → **Discover** → **Custom App** → **Install via YAML**.
2. Inhalt von `kochbuch-truenas.yml` einfügen.
3. **Save**.

TrueNAS pullt das App-Image (~1.2 GB) und das Ollama-Image (~200 MB), startet
beide Container, und der `ollama-pull`-Init-Container lädt anschließend das
Sprachmodell (~2.3 GB). Beim ersten Start können das insgesamt **5–20 Minuten**
sein, je nach Internet-Anbindung. Der Status ist unter **Apps → Installed**
einsehbar.

## 4. Erstes Login

Sobald die App auf **Running** steht, im Browser öffnen:

```
http://<NAS-IP>:3000
```

Default-Zugang:

| Feld     | Wert                   |
| -------- | ---------------------- |
| E-Mail   | `admin@kochbuch.local` |
| Passwort | `kochbuch`             |

**Sofort unter `/profil` ändern.**

## 5. iPad / PWA

Im LAN reicht `http://<NAS-IP>:3000`, für PWA-Install ist allerdings HTTPS
erforderlich. Siehe `docs/HTTPS-SETUP.md` (Tailscale + MagicDNS ist der
einfachste Weg ohne Domain).

---

## Was passiert automatisch?

- **DB-Migrationen** beim Start (`entrypoint.sh` → `prisma migrate deploy`).
- **DB-Backup** vor jeder Migration unter `/data/db/backups/`.
- **Seed** (Admin-User, Kategorien, Standard-Zutaten) — idempotent, läuft
  bei jedem Start. Mit `KOCHBUCH_SKIP_SEED=1` abschaltbar.
- **Modell-Pull** durch den `ollama-pull`-Init-Container — pullt nur, wenn
  das Modell fehlt.

## Update auf neue Version

Die Compose-Dateien setzen `pull_policy: always` auf `app`/`app-init` → der NAS
zieht das aktuelle `:latest` (bzw. `:latest-slim`) bei jedem Start automatisch.
**Update genügt daher: TrueNAS-UI → Apps → Installed → Kochbuch → Stop → Start.**

Backup + Migration laufen beim Container-Restart automatisch.

> **Wichtig — kein manuelles Tag-Jonglieren:** Vor `pull_policy: always` musste
> man `sudo docker pull …:latest` manuell ausführen, sonst lief ein **gecachtes
> Alt-Image** gegen die bereits migrierte DB (Seed-Crash `column … does not exist`,
> `[EFAULT] Failed 'up'`). Beim **Wechsel der Image-Variante** (`:latest` ↔
> `:latest-slim`) gilt weiterhin: `:latest-slim` braucht den Browserless-Sidecar,
> ohne Sidecar `:latest` (mit Chromium) nutzen.

## Troubleshooting

- **App startet nicht** → in TrueNAS auf **Apps → Installed → Kochbuch →
  Logs** schauen. Häufige Ursachen: `AUTH_SECRET` leer, Datasets noch nicht
  angelegt, NAS-IP in `AUTH_URL` falsch.
- **Ollama-Pull hängt** → Logs des `kochbuch-ollama-pull`-Containers
  prüfen. Wenn das Modell schon da ist, beendet sich der Container in <2s.
- **Web-Import-Hänger** (Ollama bei 300%+ CPU) → war v0.1.7-Bug, in v0.1.9+
  gefixt (`stream: true` + `num_predict: 512`).
- **PDF-Render OOM** → für den Celeron N5095 ist der Puppeteer-Sidecar
  empfehlenswert, siehe `docs/PUPPETEER-SIDECAR.md`.

## Backup-Strategie

Die SQLite-DB liegt unter `/mnt/<POOL>/apps/kochbuch/db/kochbuch.db`.
Snapshot-Replikation in TrueNAS auf dieses Dataset einrichten reicht.
Bilder liegen daneben unter `.../images/`. Beides separat sichern, da
die DB klein und die Bilder groß werden können.
