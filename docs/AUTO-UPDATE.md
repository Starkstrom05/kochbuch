# Auto-Update via Watchtower

TrueNAS Scale pullt Custom-App-Images **nicht** automatisch, wenn ein Tag-Move
stattfindet (`:latest` zeigt auf eine neue Version). Aktuelle Lösung ist manuell:
App → Edit → Save. Mit einem **Watchtower-Sidecar** läuft das automatisch.

## Empfehlung

Watchtower nur dann, wenn du `:latest` (oder einen rolling-Tag wie `:0.1`) auf
der NAS einsetzt. Bei festen Patch-Tags (`:v0.1.7`) muss man das Image sowieso
manuell hochziehen — Watchtower bringt dort nichts.

## Compose-Erweiterung

In `docker-compose.truenas.yml` zusätzlich:

```yaml
  watchtower:
    image: containrrr/watchtower
    container_name: kochbuch-watchtower
    restart: unless-stopped
    environment:
      TZ: "Europe/Berlin"
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_POLL_INTERVAL: "3600"    # einmal pro Stunde prüfen
      WATCHTOWER_INCLUDE_RESTARTING: "true"
      WATCHTOWER_LABEL_ENABLE: "true"     # nur Container mit Label updaten
      WATCHTOWER_NOTIFICATIONS: "shoutrrr"
      WATCHTOWER_NOTIFICATION_URL: ""     # optional: ntfy/Telegram-Push-URL
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

Und beim App-Service das Label setzen:

```yaml
  app:
    labels:
      com.centurylinklabs.watchtower.enable: "true"
```

Und in der Compose das App-Image auf einen rolling-Tag stellen, z. B. `:latest`
oder `:0.1`:

```yaml
    image: ghcr.io/starkstrom05/kochbuch:latest
```

## Verhalten

- Stündlich (`POLL_INTERVAL: 3600`) prüft Watchtower, ob `:latest` im Registry
  ein neueres Image hat als das aktuell laufende.
- Falls ja: Image pullen, Container stoppen, mit neuer Version starten.
- Migrationen laufen automatisch über den Entrypoint (`prisma migrate deploy`).
- `WATCHTOWER_CLEANUP: true` entfernt das alte Image, damit ZFS-Dataset nicht
  vollläuft.

## Risiko

Wenn ein neues Release einen Migrations-Fehler hat, kann der Container in einer
Restart-Schleife landen. Backup vorher prüfen:

```bash
# auf NAS, vor jedem Watchtower-Update unbedingt:
zfs snapshot tank/apps/kochbuch/db@before-update-$(date +%Y%m%d)
```

Ideal: ZFS-Snapshot-Schedule auf das DB-Dataset (TrueNAS: Periodic Snapshots).
Dann kann man im Notfall via `zfs rollback` zurück.

## Pull-Notification ohne Auto-Update

Wenn dir die Auto-Restart-Logik nicht ganz geheuer ist:

```yaml
    environment:
      WATCHTOWER_MONITOR_ONLY: "true"
      WATCHTOWER_NOTIFICATION_URL: "ntfy://ntfy.sh/dein-private-topic"
```

Dann erhältst du nur eine Push-Nachricht, wenn ein Update verfügbar ist, ohne
dass automatisch neugestartet wird.
