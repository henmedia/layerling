# layerling mit eigenem Serverspeicher in Docker betreiben

**Lokal oder im Heimnetz, mit geprüften automatischen Updates**

| | |
|---|---|
| **Autor** | Jürgen Keller, erstellt mit Unterstützung von KI |
| **Datum** | 24.10.2026 |
| **Getestet** | macOS mit OrbStack, Update von layerling 1.106.1 auf 1.108.0 |
| **Quelle** | [henmedia/layerling](https://github.com/henmedia/layerling), Docker-Image `ghcr.io/henmedia/layerling` |

---

## Inhalt

1. [Warum?](#1-warum)
2. [Was diese Anleitung einrichtet](#2-was-diese-anleitung-einrichtet)
3. [Wo liegen meine Daten?](#3-wo-liegen-meine-daten)
4. [Voraussetzungen](#4-voraussetzungen)
5. [Einrichtung](#5-einrichtung)
6. [Entwürfe aus dem Browser übernehmen](#6-entwürfe-aus-dem-browser-übernehmen)
7. [Welche Entwürfe landen wo?](#7-welche-entwürfe-landen-wo)
8. [Updates](#8-updates)
9. [Updates automatisieren](#9-updates-automatisieren)
10. [Datensicherung](#10-datensicherung)
11. [Zugriff von anderen Geräten](#11-zugriff-von-anderen-geräten)
12. [Fehlerbehebung](#12-fehlerbehebung)
13. [Deinstallation](#13-deinstallation)
14. [Anhang: Dateien](#14-anhang-dateien)

---

## 1. Warum?

Ohne Serverspeicher liegen alle Entwürfe nur im Speicher des Browsers (IndexedDB und localStorage). Dieser Speicher ist kein dauerhafter Datenspeicher:

- **Safari** löscht ihn automatisch, wenn eine Website 7 Tage lang nicht benutzt wurde. Ausgenommen sind nur installierte Web-Apps.
- **Alle Browser** dürfen ihn bei Speicherplatzmangel räumen.
- „Verlauf löschen“, Aufräumprogramme oder ein neues Gerät entfernen ihn ebenfalls.

Wer nicht regelmäßig „Alle sichern“ benutzt, kann so alle Entwürfe verlieren.

layerling bringt dafür einen **Serverspeicher** mit. Ist er eingeschaltet, liegt jeder Entwurf als normale `.lyl`-Datei in einem Ordner auf der Festplatte. Er speichert sich wenige Sekunden nach jeder Änderung automatisch, und der Ordner lässt sich mit jedem üblichen Backup sichern. Diese Anleitung richtet das mit Docker ein, auf dem eigenen Rechner oder einem Server.

## 2. Was diese Anleitung einrichtet

- Das **offizielle, unveränderte Docker-Image** von layerling.
- **Kein Eingriff in den Quellcode.** Alles läuft über die dokumentierten Umgebungsvariablen:

  | Variable | Wert | Wirkung |
  |---|---|---|
  | `LAYERLING_SHARED_PROJECTS_DIR` | `/shared-projects` | schaltet den Serverspeicher ein |
  | `LAYERLING_NEW_DESIGNS_ON_SERVER` | `always` | jeder neue Entwurf entsteht auf dem Server |

- **Nur vom eigenen Rechner erreichbar** (`127.0.0.1`), denn der Serverspeicher hat keine Anmeldung.
- Ein **Update-Skript**. Es spielt neue Versionen nur ein, wenn die eigene Konfiguration noch passt. Davor legt es eine Sicherung an, und schlägt der Start fehl, kehrt es automatisch zur alten Version zurück.

Die Konfiguration hängt an den **Namen** der Umgebungsvariablen. Würde eine Variable in einer neuen Version umbenannt, ignorierte layerling die Einstellung stillschweigend, und neue Entwürfe landeten unbemerkt wieder nur im Browser. Das Update-Skript prüft deshalb vor jedem Update, ob die neue Version die verwendeten Variablen noch kennt.

## 3. Wo liegen meine Daten?

> **Dauerhaft gespeichert werden Ihre Entwürfe im Projektordner `LL_PROJECTS_DIR`.** In dieser Anleitung ist das `~/Documents/layerling`, unter macOS also `/Users/<name>/Documents/layerling`. Nur dieser Ordner muss ins Backup.

| Was | Wo | Dauerhaft? |
|---|---|---|
| Entwürfe unter „Auf dem Server“ | `~/Documents/layerling` als `.lyl`-Dateien. Ordner unter „Auf dem Server“ sind dort echte Unterordner. | **ja**, mit dem Backup sichern |
| Eigene Formen auf dem Server | `~/Documents/layerling/Custom shapes` | **ja** |
| Vorschaubilder der Startseite | Docker-Volume `layerling-thumbnails` | ja, werden bei Bedarf neu erzeugt |
| Sicherungen vor Updates | `~/layerling-docker/backups` | ja, aber auf derselben Festplatte |
| Entwürfe und Ordner auf Browser-Ebene (außerhalb von „Auf dem Server“) | Speicher des Browsers | **nein**, siehe [Abschnitt 7](#7-welche-entwürfe-landen-wo) |

Den Ordner können Sie frei wählen. Ändern Sie dazu `LL_PROJECTS_DIR` in `.env` und führen Sie `docker compose up -d` aus.

## 4. Voraussetzungen

| | macOS | Linux | Windows |
|---|---|---|---|
| Docker | [OrbStack](https://orbstack.dev) (empfohlen) oder Docker Desktop | Docker Engine mit Compose-Plugin | Docker Desktop mit WSL2 (Skript in WSL ausführen, nicht getestet) |
| Shell | bash ab 3.2 (vorhanden) | bash | bash in WSL |
| Werkzeuge | `curl` (vorhanden), optional `jq` (`brew install jq`) | `curl`, optional `jq` | wie Linux |

Prüfen, ob Compose v2 vorhanden ist:

```sh
docker compose version
```

Die Ausgabe muss `v2.x` zeigen.

## 5. Einrichtung

### 5.1 Ordner anlegen

```sh
mkdir -p ~/layerling-docker        # Konfiguration und Skript
mkdir -p ~/Documents/layerling     # Ihre Entwürfe
cd ~/layerling-docker
```

> **OrbStack:** Die Dateien **nicht** in `~/OrbStack` ablegen. Dort bindet OrbStack seine Container und Volumes ein, und der Ordner ist nicht beschreibbar.

### 5.2 Dateien anlegen

Legen Sie in `~/layerling-docker` zwei Dateien an: `compose.yaml` und `update.sh`. Den Inhalt beider Dateien finden Sie im [Anhang](#14-anhang-dateien). Danach das Skript ausführbar machen:

```sh
chmod +x update.sh
```

### 5.3 Einstellungen in `.env`

```sh
cat > .env <<EOF
LL_IMAGE_TAG=1.106.1
LL_PROJECTS_DIR=$HOME/Documents/layerling
LL_BIND=127.0.0.1
LL_PORT=3000
LL_BACKUP_DIR=./backups
LL_BACKUP_KEEP=14
EOF
```

| Einstellung | Bedeutung |
|---|---|
| `LL_IMAGE_TAG` | Startversion (eine beliebige vorhandene Version, ohne „v“). Danach pflegt `update.sh` den Wert selbst, der erste Lauf bringt die neueste Version. |
| `LL_PROJECTS_DIR` | Ordner für die Entwürfe, als absoluter Pfad |
| `LL_BIND` | `127.0.0.1` = nur dieser Rechner (siehe [Abschnitt 11](#11-zugriff-von-anderen-geräten)) |
| `LL_PORT` | Port im Browser |
| `LL_BACKUP_DIR`, `LL_BACKUP_KEEP` | Ablage und Anzahl der Sicherungen vor Updates |

**Nur Linux:** Der Container läuft als Benutzer 999 und muss in den Projektordner schreiben dürfen:

```sh
sudo chown 999:999 ~/Documents/layerling
```

Alternativ setzen Sie in `compose.yaml` bei `user:` Ihre eigenen Nummern (`id -u`, `id -g`). Unter macOS mit OrbStack oder Docker Desktop ist beides nicht nötig.

### 5.4 Starten

```sh
docker compose up -d
```

### 5.5 Prüfen

```sh
docker compose ps
curl -s http://127.0.0.1:3000/api/shared-projects
```

Die zweite Ausgabe muss `"enabled":true` enthalten. Öffnen Sie dann **http://localhost:3000**. Auf der Startseite erscheint die Kachel **„Auf dem Server“**.

## 6. Entwürfe aus dem Browser übernehmen

Bisherige Entwürfe liegen noch im Speicher des Browsers unter der alten Adresse. Jede Adresse (z. B. `layerling.com` oder `localhost:3000`) hat ihren eigenen Browser-Speicher.

1. In der **bisherigen** layerling-Adresse auf der Startseite **„Alle sichern“** wählen. Es entsteht eine ZIP-Datei als Notfallkopie.
2. Unter **http://localhost:3000** die ZIP-Datei über **„Sicherung wiederherstellen“** (im Hinweis auf der Startseite) oder über „Entwurf öffnen oder Geometrie importieren“ laden. Mit `always` kommen die Entwürfe direkt in den Serverordner, jeder in den Ordner, den er im Browser hatte.
3. Prüfen: `ls ~/Documents/layerling` zeigt die `.lyl`-Dateien, und die Startseite meldet „0 in diesem Browser“.

Ein Entwurf, dessen Name auf dem Server schon vergeben ist, kommt als Kopie („… (Kopie)“) hinein. Ist der Server beim Wiederherstellen nicht erreichbar, bleiben die Entwürfe im Browser, und die Meldung sagt warum; dann, sobald er wieder da ist, **„Alle auf den Server legen“** wählen.

## 7. Welche Entwürfe landen wo?

Die Startseite zeigt zwei Ebenen: den Bereich **„Auf dem Server“** (dauerhaft, im Projektordner) und die **Browser-Ebene** („… in diesem Browser“, nicht dauerhaft). Seit layerling 1.110.0 lenkt `LAYERLING_NEW_DESIGNS_ON_SERVER=always` jeden Weg, auf dem ein Entwurf oder Ordner entsteht, auf den Server:

| Aktion | Landet in |
|---|---|
| Kachel **„Neuen 3D-Entwurf anlegen“** | **Server** (im zuletzt geöffneten Serverordner) |
| Neuer Entwurf oder Ordner **innerhalb** von „Auf dem Server“ | **Server** |
| **„Neuer Ordner“** auf der Startseite | **Server** (der Knopf sagt dann „Einen Ordner im Serverordner anlegen“) |
| „Entwurf öffnen oder Geometrie importieren“ (STL, 3MF, OBJ, `.lyl` …) | **Server** |
| „Sicherung wiederherstellen“ (ZIP) | **Server**, mit den Ordnern der Sicherung |
| Verlaufsansicht: Stand als neuen Entwurf übernehmen | **Server** |
| „Duplizieren“, eines Server- oder eines Browser-Entwurfs | **Server** |
| Klick auf „Neuen 3D-Entwurf anlegen“, während die Startseite noch lädt | **Server**: Die Startseite wartet auf die Antwort des Servers, bevor sie entscheidet |
| Neuer Entwurf, während der Server nicht erreichbar ist (z. B. während eines Updates) | Browser, mit Fehlermeldung |

Mit einer älteren Version (1.109.0 und davor) gingen nur die ersten beiden Zeilen auf den Server; vor dem Verlass auf die übrigen also aktualisieren.

### Arbeitsregeln

1. **Prüfen, dass `always` greift:** Der Haken „Neue Entwürfe auf dem Server“ muss gesetzt **und ausgegraut** sein.
2. **Erscheint ein Entwurf auf Browser-Ebene** (weil der Server nicht erreichbar war), **„Alle auf den Server legen“** wählen oder seine Kachel auf „Auf dem Server“ ziehen. Die Schaltfläche „Alle auf den Server legen“ erscheint nur, wenn Browser-Entwürfe existieren. Ihr Auftauchen ist das Warnsignal.
3. Zielzustand auf der Startseite: **„0 in diesem Browser“**.

Liegt kein Entwurf im Browser, lautet der Hinweis auf der Startseite „Deine Entwürfe liegen auf dem Server“ statt zur Sicherung des Browsers aufzurufen; die übernimmt das Backup des Projektordners ([Abschnitt 10](#10-datensicherung)). Seine Schaltfläche **„Sicherung wiederherstellen“** bleibt: Mit ihr werden Sicherungsdateien (ZIP aus „Alle sichern“) eingelesen, die früher in der reinen Browser-Version entstanden sind, direkt in den Serverordner.

**Die Vorgabe für neue Entwürfe** („Als Vorgabe sichern“ in den Arbeitsbereich-Einstellungen) liegt seit der Version nach 1.113.0 ebenfalls im Projektordner, als `.settings/default.json`. Leert man den Browser-Speicher oder öffnet layerling in einem anderen Browser, holt die Startseite sie beim Laden zurück; neue Entwürfe beginnen wieder mit den eigenen Einstellungen. Es gibt eine Vorgabe für den ganzen Projektordner, die zuletzt gesicherte gilt. Das Backup des Projektordners nimmt sie mit.

Die Schaltfläche **„Zurück zu den Entwürfen in diesem Browser“** in der Serveransicht führt nur zurück zur Startseite. Sie bedeutet nicht, dass dort Entwürfe im Browser liegen.

**Immer dieselbe Adresse verwenden**, z. B. `http://localhost:3000`. OrbStack bietet zusätzlich eine Adresse wie `http://layerling.layerling-docker.orb.local` an. Jede Adresse hat ihren eigenen Browser-Speicher. Die Entwürfe auf dem Server sind unter beiden gleich, Browser-Entwürfe aber nur unter der Adresse sichtbar, unter der sie entstanden sind.

## 8. Updates

```sh
cd ~/layerling-docker
./update.sh --check    # nur prüfen, nichts ändern
./update.sh            # prüfen und einspielen
./update.sh 1.110.0    # eine bestimmte Version
```

### Ablauf

1. Die neueste Version wird aus dem Image-Label gelesen.
2. **Variablenabgleich:** Das Skript vergleicht die in der Konfiguration verwendeten `LAYERLING_*`-Variablen mit denen, die das neue Image tatsächlich kennt. Die Namen werden in einem Wegwerf-Container ohne Netzwerk direkt aus dem Programmcode gelesen.
3. **Release-Notes:** Hinweise zu Docker oder Variablen aus allen übersprungenen Versionen werden angezeigt (nur mit `jq`).
4. **Sicherung** des Projektordners als `backups/projects-<version>-<zeit>.tar.gz`.
5. Umstellung auf die neue Version.
6. **Funktionsprüfung:** Der Serverspeicher muss eingeschaltet sein, und es muss die neue Version laufen.
7. Schlägt die Prüfung fehl: **automatische Rückkehr** zur alten Version.

### Reaktion auf Abweichungen

| Situation | Reaktion | Exit-Code |
|---|---|---|
| Bereits aktuell | Meldung, nichts geschieht | 0 |
| Variablen unverändert | Update wird eingespielt | 0 |
| Neue Variable in der neuen Version | wird angezeigt (`+`), Update läuft | 0 |
| Variable entfallen, aber nicht verwendet | wird angezeigt (`-`), Update läuft | 0 |
| **Verwendete Variable fehlt in der neuen Version** | **Abbruch.** Die Variable wird genannt, die alte Version läuft weiter. | **2** |
| Variablen im Image nicht lesbar | **Abbruch** zur Sicherheit | **2** |
| Neue Version ist älter als die installierte | Abbruch (mit `--force` übergehbar) | 1 |
| Image nicht ladbar, Sicherung fehlgeschlagen | Abbruch vor jeder Änderung | 1 |
| **Neue Version startet nicht korrekt** | Log-Auszug, **Rückkehr zur alten Version** | **3** |

**Bei Exit-Code 2:** Prüfen Sie die Release-Notes, passen Sie `compose.yaml` an die neuen Variablennamen an und führen Sie `./update.sh --check` erneut aus. `--force` übergeht die Prüfung und ist nur für bewusst geprüfte Fälle gedacht.

## 9. Updates automatisieren

### macOS (launchd)

Datei `~/Library/LaunchAgents/local.layerling.update.plist` anlegen. Sie läuft täglich um 04:17 Uhr und meldet Fehler als Mitteilung:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>local.layerling.update</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>export PATH="$HOME/.orbstack/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"; cd "$HOME/layerling-docker" &amp;&amp; ./update.sh &gt;&gt; update.log 2&gt;&amp;1 || osascript -e 'display notification "Update blockiert oder fehlgeschlagen, siehe update.log" with title "layerling"'</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>17</integer></dict>
</dict>
</plist>
```

```sh
launchctl load ~/Library/LaunchAgents/local.layerling.update.plist
launchctl start local.layerling.update     # einmal sofort testen
tail ~/layerling-docker/update.log
```

Schläft der Mac zur geplanten Zeit, holt launchd den Lauf nach dem Aufwachen nach.

OrbStack muss beim Anmelden starten (OrbStack → Settings → „Start at login“), sonst ist Docker nicht erreichbar. Bei Docker Desktop gilt dasselbe.

### Linux (cron)

```cron
17 4 * * * cd $HOME/layerling-docker && ./update.sh >> update.log 2>&1 || echo "layerling-Update: siehe update.log" | mail -s "layerling" ich@example.org
```

## 10. Datensicherung

Die Entwürfe sind normale Dateien in `LL_PROJECTS_DIR` und laufen damit in jedem gewöhnlichen Backup mit: Time Machine, Restic, Borg oder NAS-Snapshots.

- Die Sicherungen von `update.sh` in `backups/` schützen vor fehlerhaften Updates. Sie ersetzen **kein** Backup, weil sie auf derselben Festplatte liegen.
- Den Projektordner nicht von mehreren layerling-Installationen gleichzeitig beschreiben lassen, auch nicht über iCloud oder Nextcloud. Ein Sync-Dienst eignet sich nur als Backup-Ziel.

## 11. Zugriff von anderen Geräten

> **Wichtig:** Der Serverspeicher von layerling hat **keine Anmeldung**. Wer die Seite erreicht, kann alle Entwürfe lesen, ändern und löschen.

Mit `LL_BIND=127.0.0.1` ist layerling nur vom eigenen Rechner erreichbar. Sollen weitere Geräte zugreifen (iPad, zweiter Rechner), läuft der Container am besten auf einem dauerhaft eingeschalteten Rechner oder einer NAS. Für den Zugriff gibt es zwei sichere Wege:

1. **VPN (empfohlen):** Tailscale oder WireGuard. `LL_BIND` auf die VPN-Adresse des Servers setzen, kein offener Port im Router.
2. **Reverse-Proxy mit Anmeldung**, z. B. Caddy:

   ```caddyfile
   layerling.example.lan {
       basic_auth {
           ich <hash von: caddy hash-password>
       }
       reverse_proxy 127.0.0.1:3000
   }
   ```

   Ein Proxy muss `Host` und `X-Forwarded-Proto` weitergeben (bei Caddy der Standard). Schreibt er den Host um, die Adresse in `LAYERLING_ALLOWED_ORIGINS` eintragen.

   Jedem Benutzer seinen eigenen Serverordner geben: den Proxy den angemeldeten Namen als Header mitschicken lassen (Caddy: `reverse_proxy 127.0.0.1:3000 { header_up X-Remote-User {http.auth.user.id} }`) und in `compose.yml` `LAYERLING_USER_HEADER: "X-Remote-User"` setzen. Die Entwürfe liegen dann unter `.users/<Benutzer>/`. Nur sicher, wenn layerling allein über den Proxy erreichbar ist (`LL_BIND` bleibt `127.0.0.1`).

`LL_BIND=0.0.0.0` ohne einen dieser beiden Wege macht alle Entwürfe für das gesamte Netz offen. layerling nie direkt aus dem Internet erreichbar machen.

## 12. Fehlerbehebung

| Problem | Ursache und Lösung |
|---|---|
| `permission denied: .env` | Der Ordner ist nicht beschreibbar, z. B. `~/OrbStack`. Einen eigenen Ordner verwenden ([5.1](#51-ordner-anlegen)). |
| `LL_IMAGE_TAG fehlt in .env` | `.env` fehlt oder liegt nicht neben `compose.yaml`. |
| Kachel „Auf dem Server“ fehlt | `curl -s http://127.0.0.1:3000/api/shared-projects` zeigt den Grund. `docker exec layerling printenv LAYERLING_SHARED_PROJECTS_DIR` muss `/shared-projects` liefern. |
| Speichern auf dem Server schlägt fehl (Linux) | Projektordner nicht für Benutzer 999 beschreibbar, siehe [5.3](#53-einstellungen-in-env). |
| „Der Serverspeicher nimmt nur Anfragen von dieser Seite an“ | Ein Reverse-Proxy schreibt den Host um, siehe [Abschnitt 11](#11-zugriff-von-anderen-geräten). |
| Ein Entwurf erscheint auf Browser-Ebene statt unter „Auf dem Server“ | Siehe [Abschnitt 7](#7-welche-entwürfe-landen-wo). „Alle auf den Server legen“ wählen. |
| Ein neuer Ordner erscheint nicht im Projektordner | `always` greift nicht, oder die Version ist älter als 1.110.0: Dann legt „Neuer Ordner“ auf der Startseite einen Browser-Ordner an. Ordner innerhalb von „Auf dem Server“ anlegen. |
| Haken „Neue Entwürfe auf dem Server“ lässt sich anklicken | `always` ist nicht aktiv. `docker exec layerling printenv LAYERLING_NEW_DESIGNS_ON_SERVER` muss `always` liefern. |
| `update.sh` findet keine neue Version, obwohl auf GitHub eine erschienen ist | Das Docker-Image wird einige Minuten nach dem Release gebaut. Später erneut versuchen. |
| `update.sh --check` spielt nichts ein | So gewollt: `--check` prüft nur. |
| `Update läuft bereits` | Ein früherer Lauf wurde abgebrochen. `rmdir ~/layerling-docker/.update.lock` |
| Nach `docker compose restart` gilt eine geänderte Einstellung nicht | `docker compose up -d` verwenden. `restart` übernimmt keine Änderungen. |
| Port 3000 belegt | `LL_PORT` in `.env` ändern, dann `docker compose up -d`. |

Logs ansehen: `docker compose logs -f`

## 13. Deinstallation

```sh
cd ~/layerling-docker
docker compose down -v      # Container und Vorschaubilder-Volume entfernen
```

Die Entwürfe in `LL_PROJECTS_DIR` bleiben erhalten. Löschen Sie sie nur bewusst und von Hand.

## 14. Anhang: Dateien

### `compose.yaml`

```yaml
# Eigene Compose-Datei für layerling. Das Original-Repo bleibt unverändert.
# Version wird ausschließlich über LL_IMAGE_TAG in .env gesteuert (gepinnt, kein :latest).
services:
  layerling:
    image: ghcr.io/henmedia/layerling:${LL_IMAGE_TAG:?LL_IMAGE_TAG fehlt in .env}
    container_name: layerling
    restart: unless-stopped
    ports:
      # Nur lokal erreichbar. Für VPN/LAN LL_BIND in .env bewusst ändern.
      - "${LL_BIND:-127.0.0.1}:${LL_PORT:-3000}:3000"
    # Linux: Projektordner muss für UID 999 beschreibbar sein (chown 999:999) oder eigene UID setzen.
    # macOS (OrbStack, Docker Desktop): nicht nötig.
    # user: "${LL_UID}:${LL_GID}"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    environment:
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
      NEXT_TELEMETRY_DISABLED: "1"
      LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"
      LAYERLING_NEW_DESIGNS_ON_SERVER: "always"
    volumes:
      - "${LL_PROJECTS_DIR:?LL_PROJECTS_DIR fehlt in .env}:/shared-projects"
      - layerling-thumbnails:/app/.codex/project-thumbnails

volumes:
  layerling-thumbnails:
```

### `update.sh`

```bash
#!/usr/bin/env bash
# layerling Docker-Update mit Prüfung der Umgebungsvariablen.
#
#   ./update.sh            neueste Version prüfen und einspielen
#   ./update.sh --check    nur prüfen, nichts ändern
#   ./update.sh 1.107.0    bestimmte Version
#   ./update.sh --force    Abbruchgründe (fehlende Variable, Downgrade) übergehen
#
# Exit-Codes: 0 ok/aktuell · 1 Fehler · 2 Variablenprüfung blockiert · 3 Healthcheck fehlgeschlagen, Rollback erfolgt
#
# Kompatibel mit bash 3.2 (macOS). Benötigt: docker (compose v2), curl. Optional: jq (Release-Notes).

set -euo pipefail

IMAGE="ghcr.io/henmedia/layerling"
REPO_API="https://api.github.com/repos/henmedia/layerling/releases?per_page=50"
cd "$(dirname "$0")"

CHECK_ONLY=0; FORCE=0; TARGET=""
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --force) FORCE=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) TARGET="${arg#v}" ;;
  esac
done

log()  { printf '%s  %s\n' "$(date '+%F %T')" "$*"; }
die()  { log "FEHLER: $*"; exit "${2:-1}"; }

[ -f .env ] || die ".env fehlt (siehe Anleitung, Abschnitt 5.3)"
command -v docker >/dev/null || die "docker nicht gefunden"
command -v curl >/dev/null   || die "curl nicht gefunden"

# Parallele Läufe verhindern
LOCK=".update.lock"
mkdir "$LOCK" 2>/dev/null || die "Update läuft bereits ($LOCK entfernen, falls verwaist)"
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

env_get() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
env_set() {
  local tmp; tmp="$(mktemp)"
  if grep -qE "^$1=" .env; then
    sed "s|^$1=.*|$1=$2|" .env > "$tmp"
  else
    cat .env > "$tmp"; echo "$1=$2" >> "$tmp"
  fi
  cat "$tmp" > .env; rm -f "$tmp"
}
image_version() {
  docker image inspect -f '{{ index .Config.Labels "org.opencontainers.image.version" }}' "$1" 2>/dev/null | sed 's/^v//'
}
# Alle LAYERLING_*-Namen, die der gebaute Code eines Images kennt
image_vars() {
  docker run --rm --network none --entrypoint sh "$1" -c \
    "grep -rhoaE 'LAYERLING_[A-Z0-9_]+' /app/apps/web/.next 2>/dev/null; true" | sort -u
}
# Alle LAYERLING_*-Variablen, die die eigene Konfiguration setzt
config_vars() { docker compose config 2>/dev/null | grep -oE 'LAYERLING_[A-Z0-9_]+' | sort -u; }
version_le() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n1)" = "$1" ]; }

CUR="$(env_get LL_IMAGE_TAG)"
[ -n "$CUR" ] || die "LL_IMAGE_TAG in .env leer"
PORT="$(env_get LL_PORT)"; PORT="${PORT:-3000}"
BIND="$(env_get LL_BIND)"; BIND="${BIND:-127.0.0.1}"; [ "$BIND" = "0.0.0.0" ] && BIND="127.0.0.1"

# --- Zielversion bestimmen -------------------------------------------------
if [ -z "$TARGET" ]; then
  log "Prüfe neueste Version …"
  docker pull -q "$IMAGE:latest" >/dev/null
  TARGET="$(image_version "$IMAGE:latest")"
  [ -n "$TARGET" ] || die "Version aus Image-Label nicht lesbar"
fi
log "Installiert: $CUR · Ziel: $TARGET"

if [ "$TARGET" = "$CUR" ]; then log "Bereits aktuell."; exit 0; fi
if version_le "$TARGET" "$CUR" && [ "$FORCE" -ne 1 ]; then
  die "Ziel $TARGET ist älter als $CUR (Downgrade nur mit --force)"
fi

docker pull -q "$IMAGE:$TARGET" >/dev/null || die "Image $IMAGE:$TARGET nicht verfügbar"
docker image inspect "$IMAGE:$CUR" >/dev/null 2>&1 || docker pull -q "$IMAGE:$CUR" >/dev/null || true

# --- Variablenprüfung -------------------------------------------------------
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"; rmdir "$LOCK" 2>/dev/null || true' EXIT
config_vars              > "$TMP/config"
image_vars "$IMAGE:$TARGET" > "$TMP/new"
image_vars "$IMAGE:$CUR"    > "$TMP/old" 2>/dev/null || : > "$TMP/old"

[ -s "$TMP/new" ] || die "Keine Variablen im neuen Image gefunden – Image-Struktur geändert? Prüfung nicht möglich." 2

MISSING="$(comm -23 "$TMP/config" "$TMP/new")"
ADDED="$(comm -13 "$TMP/old" "$TMP/new")"
REMOVED="$(comm -23 "$TMP/old" "$TMP/new" | comm -23 - "$TMP/config")"

BLOCK=0
if [ -n "$MISSING" ]; then
  log "BLOCKIERT: Konfigurierte Variablen sind im neuen Image unbekannt:"
  printf '    - %s\n' $MISSING
  BLOCK=1
fi
[ -n "$REMOVED" ] && { log "Entfernt in $TARGET (nicht konfiguriert):"; printf '    - %s\n' $REMOVED; }
[ -n "$ADDED" ]   && { log "Neu in $TARGET:"; printf '    + %s\n' $ADDED; }
[ -z "$MISSING$REMOVED$ADDED" ] && log "Variablen unverändert."

# --- Release-Notes auf Konfigurationshinweise prüfen -------------------------
if command -v jq >/dev/null; then
  NOTES="$(curl -fsS "$REPO_API" 2>/dev/null | jq -r --arg cur "$CUR" --arg tgt "$TARGET" '
      .[] | (.tag_name | ltrimstr("v")) as $v
      | select(($v|split(".")|map(tonumber? // 0)) >  ($cur|split(".")|map(tonumber? // 0))
           and ($v|split(".")|map(tonumber? // 0)) <= ($tgt|split(".")|map(tonumber? // 0)))
      | .body | split("\n")[] | select(test("LAYERLING_|[Dd]ocker|compose|environment|Umgebungsvariable|breaking|BREAKING|migrat"))
      | "    " + .' 2>/dev/null || true)"
  if [ -n "$NOTES" ]; then
    log "Konfigurationsrelevante Hinweise in den Release-Notes $CUR → $TARGET:"
    printf '%s\n' "$NOTES" | cut -c1-200 | sort -u
  fi
else
  log "Hinweis: jq fehlt, Release-Notes nicht ausgewertet."
fi

if [ "$BLOCK" -eq 1 ] && [ "$FORCE" -ne 1 ]; then
  die "Update abgebrochen. Konfiguration anpassen oder mit --force übergehen." 2
fi
if [ "$CHECK_ONLY" -eq 1 ]; then log "Nur Prüfung (--check), keine Änderung."; exit 0; fi

# --- Vorab-Sicherung des Projektordners ------------------------------------
PROJ="$(env_get LL_PROJECTS_DIR)"
BDIR="$(env_get LL_BACKUP_DIR)"; BDIR="${BDIR:-./backups}"
KEEP="$(env_get LL_BACKUP_KEEP)"; KEEP="${KEEP:-14}"
if [ -n "$PROJ" ] && [ -d "$PROJ" ]; then
  mkdir -p "$BDIR"
  ARCHIVE="$BDIR/projects-$CUR-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar -czf "$ARCHIVE" -C "$PROJ" . || die "Sicherung fehlgeschlagen, Update abgebrochen"
  log "Sicherung: $ARCHIVE"
  ls -1t "$BDIR"/projects-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do rm -f "$old"; done
else
  die "LL_PROJECTS_DIR ($PROJ) nicht gefunden"
fi

# --- Umstellen, Healthcheck, ggf. Rollback ----------------------------------
health() {
  local _
  for _ in $(seq 1 30); do
    if curl -fsS "http://$BIND:$PORT/api/shared-projects" 2>/dev/null | grep -q '"enabled":true'; then
      [ "$(image_version "$(docker inspect -f '{{.Config.Image}}' layerling)")" = "$1" ] && return 0
    fi
    sleep 2
  done
  return 1
}

env_set LL_IMAGE_TAG "$TARGET"
log "Starte $TARGET …"
docker compose up -d --remove-orphans >/dev/null

if health "$TARGET"; then
  log "OK: layerling $TARGET läuft, Serverspeicher aktiv."
  exit 0
fi

log "Healthcheck fehlgeschlagen – Rollback auf $CUR"
docker compose logs --tail 30 layerling || true
env_set LL_IMAGE_TAG "$CUR"
docker compose up -d >/dev/null
health "$CUR" && log "Rollback erfolgreich." || log "WARNUNG: Auch $CUR startet nicht sauber, manuell prüfen."
exit 3
```

---

*Diese Anleitung und die enthaltenen Dateien werden dem layerling-Projekt zur freien Verwendung, Änderung und Veröffentlichung zur Verfügung gestellt. Nutzung auf eigene Verantwortung, ohne Gewähr.*
