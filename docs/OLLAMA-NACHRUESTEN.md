# Ollama als zweite Custom App nachrüsten

Wenn Kochbuch bereits als Single-Container-Wizard-App läuft (siehe
[`INSTALL-TRUENAS-WIZARD.md`](INSTALL-TRUENAS-WIZARD.md)) und du jetzt
die KI-Features (Web-Import-Fallback, "Was kann ich kochen?"-Vorschläge)
nachrüsten möchtest, installierst du Ollama als zweite Custom App und
verlinkst die Kochbuch-App damit.

**Vorbereitung:** Notiere dir die LAN-IP deines NAS (gleich wie im
Kochbuch-`AUTH_URL`).

---

## 1. Dataset für Ollama anlegen

**TrueNAS-UI → Datasets** → Pool wählen → ein Dataset anlegen:

```
<pool>/apps/kochbuch/ollama
```

Standard-Eigenschaften reichen. Hier landen die ~2.3 GB des
Sprachmodells, damit sie bei Container-Restart erhalten bleiben.

## 2. Ollama als Custom App installieren

**Apps → Discover Apps** → oben rechts **Custom App** → **Configure
Container Image** wählen.

### Wizard-Felder

| Sektion / Feld          | Wert                                  |
| ----------------------- | ------------------------------------- |
| **Application Name**    | `ollama`                              |

**Container Images**

| Feld                  | Wert                              |
| --------------------- | --------------------------------- |
| Image Repository      | `ollama/ollama`                   |
| Image Tag             | `latest`                          |
| Image Pull Policy     | `Only pull image if not present` |

**Container Environment Variables** — pro Eintrag **Add**:

| Name                   | Value  |
| ---------------------- | ------ |
| `OLLAMA_KEEP_ALIVE`    | `30m`  |
| `OLLAMA_NUM_PARALLEL`  | `1`    |

**Port Forwarding** — **Add**:

| Feld           | Wert  |
| -------------- | ----- |
| Container Port | `11434` |
| Node Port      | `11434` |
| Protocol       | `TCP`   |

**Storage** — **Add** für das Modell-Volume:

| Feld         | Wert                                       |
| ------------ | ------------------------------------------ |
| Type         | `Host Path`                                |
| Host Path    | `/mnt/<pool>/apps/kochbuch/ollama`         |
| Mount Path   | `/root/.ollama`                            |
| Read Only    | aus                                        |

**Resources** — wichtig für den Celeron-N5095:

| Feld          | Wert  |
| ------------- | ----- |
| Memory Limit  | `7GB` |
| CPU Limit     | `3`   |

→ **Install** klicken. Image-Pull dauert 2–3 min.

## 3. Sprachmodell pullen (einmalig)

Nach erfolgreichem Start in **Apps → Installed → ollama → ⋮ → Shell**:

```bash
ollama pull phi3:3.8b-mini-4k-instruct-q4_K_M
```

~2.3 GB Download, dauert je nach Anbindung 5–15 min. Output endet mit
`success`.

**Test, dass das Modell läuft:**

```bash
ollama list
# NAME                                       ID    SIZE  ...
# phi3:3.8b-mini-4k-instruct-q4_K_M          ...   2.2 GB
```

## 4. Kochbuch-App mit Ollama verbinden

**Apps → Installed → kochbuch → Edit** → zur Sektion **Container
Environment Variables** scrollen → **Add**:

| Name                | Value                          |
| ------------------- | ------------------------------ |
| `OLLAMA_BASE_URL`   | `http://<NAS-IP>:11434`        |
| `OLLAMA_MODEL`      | `phi3:3.8b-mini-4k-instruct-q4_K_M` |

`<NAS-IP>` ist dieselbe LAN-IP wie in `AUTH_URL`. Container und Container
unterschiedlicher Custom Apps in TrueNAS Scale erreichen sich
**nicht** per Container-Name (eigene Bridge-Networks pro App), deshalb
geht der Umweg über die Host-IP.

→ **Save** unten. TrueNAS startet den Kochbuch-Container automatisch neu.

## 5. Test im Kochbuch

Öffne `http://<NAS-IP>:3000`, logge dich ein, gehe auf
**Rezepte → Neu → Aus URL importieren**. Eine URL einer Site **ohne**
JSON-LD versuchen (z.B. ein älterer Familien-Blog). Wenn der KI-Fallback
sauber greift und ein Rezept extrahiert, läuft die Verbindung.

Alternativ: **Vorräte → "Was kann ich kochen?"** liefert jetzt
LLM-basierte Vorschläge.

---

## Troubleshooting

**Web-Import schlägt fehl mit Connection-Refused**
→ Prüfen, ob `OLLAMA_BASE_URL` wirklich die NAS-IP enthält, nicht
`localhost` oder `ollama`. Per `curl http://<NAS-IP>:11434/api/tags`
auf einem anderen LAN-Gerät testen.

**Ollama-Container hängt bei 300%+ CPU**
→ War der v0.1.7-Bug (vor `stream: true` + `num_predict: 512`). Stelle
sicher, dass das Kochbuch-Image mindestens `v0.1.9` ist (`Apps →
Installed → kochbuch → Edit → Image Tag`).

**Modell wird bei jedem Neustart neu geladen**
→ Storage-Mount prüfen: Host-Path muss exakt
`/mnt/<pool>/apps/kochbuch/ollama` sein, Mount-Path
`/root/.ollama`.

**Andere LAN-Geräte sehen den Ollama-Port 11434**
→ TrueNAS legt Node-Ports immer auf alle Interfaces. Wenn das stört,
in den Firewall-Regeln des Routers den Port nur fürs interne LAN
zulassen oder Ollama nur über die TrueNAS-internen Bridge-Networks
exponieren (dann brauchst du den YAML-Weg statt Wizard, siehe
`INSTALL-TRUENAS.md`).

## Resource-Erwartungen auf dem N5095

- Idle: ~50 MB RAM
- Modell geladen, idle: ~3.5 GB RAM
- Aktive Inferenz (1 Rezept-Extraktion): 80–100 % CPU für 30–90 s
- Antwortzeit für ein Rezept: 30–60 s (phi3-mini, q4)

Bei mehr als 2 parallelen Requests → langsam, aber stabil
(`OLLAMA_NUM_PARALLEL=1` serialisiert).
