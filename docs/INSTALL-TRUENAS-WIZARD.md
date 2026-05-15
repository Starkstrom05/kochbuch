# Kochbuch in TrueNAS Scale per Wizard installieren

Setup über **Apps → Discover → Custom App → Wizard** (statt YAML einfügen).
Du füllst nur Formularfelder aus.

> **Einschränkung dieses Wegs:** Single-Container, kein Ollama → KI-Features
> (Web-Import-KI-Fallback, "Was kann ich kochen?"-Vorschläge) sind nicht
> verfügbar. Die übrigen ~90 % der App funktionieren normal. Für volle
> KI-Funktion → siehe [`INSTALL-TRUENAS.md`](INSTALL-TRUENAS.md) (YAML-Weg).

---

## 1. Datasets anlegen

**TrueNAS-UI → Datasets** → Pool wählen → zwei Datasets verschachtelt anlegen:

```
<pool>/apps/kochbuch/db
<pool>/apps/kochbuch/images
```

## 2. AUTH_SECRET erzeugen

Auf deinem Rechner:

```bash
openssl rand -base64 32
```

Den Output für Schritt 4 (Environment Variables) merken.

## 3. Custom App starten

**TrueNAS-UI → Apps → Discover Apps** → oben rechts **Custom App** klicken →
im Dialog **Install Type: Configure Container Image** wählen (nicht YAML).

## 4. Wizard-Felder ausfüllen

### Application Name

| Feld                  | Wert       |
| --------------------- | ---------- |
| **Application Name**  | `kochbuch` |

### Container Images

| Feld                  | Wert                              |
| --------------------- | --------------------------------- |
| **Image Repository**  | `ghcr.io/starkstrom05/kochbuch`   |
| **Image Tag**         | `latest`                          |
| **Image Pull Policy** | `Only pull image if not present` |

### Container Entrypoint

Leer lassen (Dockerfile-Default).

### Container Environment Variables

Pro Eintrag **Add** klicken und Name/Value setzen:

| Name              | Value                                |
| ----------------- | ------------------------------------ |
| `DATABASE_URL`    | `file:/data/db/kochbuch.db`         |
| `AUTH_SECRET`     | *(dein Wert aus Schritt 2)*         |
| `AUTH_URL`        | `http://<NAS-IP>:3000`              |
| `AUTH_TRUST_HOST` | `true`                              |
| `UPLOAD_DIR`      | `/data/images`                      |
| `TZ`              | `Europe/Berlin`                     |

### Networking

| Feld               | Wert       |
| ------------------ | ---------- |
| **Host Network**   | aus (off)  |

Unter **Port Forwarding** → **Add**:

| Feld             | Wert  |
| ---------------- | ----- |
| Container Port   | `3000` |
| Node Port        | `3000` |
| Protocol         | `TCP`  |

### Storage

Zwei **Add**-Klicks unter **Storage**:

**Mount 1** — Datenbank:

| Feld         | Wert                                    |
| ------------ | --------------------------------------- |
| Type         | `Host Path`                             |
| Host Path    | `/mnt/<pool>/apps/kochbuch/db`         |
| Mount Path   | `/data/db`                              |
| Read Only    | aus                                     |

**Mount 2** — Bilder:

| Feld         | Wert                                       |
| ------------ | ------------------------------------------ |
| Type         | `Host Path`                                |
| Host Path    | `/mnt/<pool>/apps/kochbuch/images`        |
| Mount Path   | `/data/images`                             |
| Read Only    | aus                                        |

### Resources (optional aber empfohlen)

| Feld          | Wert    |
| ------------- | ------- |
| Memory Limit  | `2GB`   |
| CPU Limit     | `2`     |

### Portal Configuration (optional)

| Feld     | Wert                  |
| -------- | --------------------- |
| Use Node IP | aktivieren         |
| Port     | `3000`                |
| Scheme   | `http`                |

## 5. Install klicken

TrueNAS pullt das Image (~1.2 GB) und startet den Container.

## 6. Admin-User anlegen (einmalig)

Mit der aktuellen `:latest`-Version legt der Container den Default-Admin
noch **nicht** selbst an — du musst das einmal anstoßen.

**TrueNAS-UI → Apps → Installed → kochbuch → ⋮ → Shell** → in der
Container-Shell folgendes ausführen:

```bash
node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts
```

Output sollte sein:

```
Admin-User: admin@kochbuch.local (PW: kochbuch)
8 Kategorien angelegt
12 Basis-Zutaten angelegt
```

> **Alternative:** Nach Release von `v0.2.2` (mit Auto-Seed im Entrypoint)
> ist dieser Schritt nicht mehr nötig.

## 7. Erster Login

Im Browser:

```
http://<NAS-IP>:3000
```

| Feld     | Wert                   |
| -------- | ---------------------- |
| E-Mail   | `admin@kochbuch.local` |
| Passwort | `kochbuch`             |

**Sofort unter `/profil` Passwort ändern.**

---

## Updates

**Apps → Installed → kochbuch → Edit** → unter **Container Images** den
Tag auf `:v0.2.2` (oder neuere Version) ändern → **Save**.

Migration + DB-Backup laufen beim Container-Restart automatisch.

## Bekannte Einschränkungen ohne Ollama

- Web-Import von Rezept-URLs funktioniert nur für Sites mit
  strukturierten Daten (Chefkoch.de JSON-LD, Rewe etc.)
- KI-Fallback bei unstrukturierten Sites schlägt fehl mit Fehlermeldung
- "Was kann ich aus diesen Zutaten kochen?" → nicht verfügbar

Diese Features lassen sich später nachrüsten — siehe
[`OLLAMA-NACHRUESTEN.md`](OLLAMA-NACHRUESTEN.md).
