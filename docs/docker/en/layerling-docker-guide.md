# Running layerling with its own shared folder in Docker

**On your own computer or in your home network, with checked automatic updates**

| | |
|---|---|
| **Author** | Jürgen Keller, written with AI assistance |
| **Date** | 2026-10-24 |
| **Tested** | macOS with OrbStack, update from layerling 1.106.1 to 1.108.0 |
| **Source** | [henmedia/layerling](https://github.com/henmedia/layerling), Docker image `ghcr.io/henmedia/layerling` |

---

## Contents

1. [Why?](#1-why)
2. [What this guide sets up](#2-what-this-guide-sets-up)
3. [Where is my data?](#3-where-is-my-data)
4. [Requirements](#4-requirements)
5. [Setup](#5-setup)
6. [Moving designs out of the browser](#6-moving-designs-out-of-the-browser)
7. [Which designs end up where?](#7-which-designs-end-up-where)
8. [Updates](#8-updates)
9. [Automating updates](#9-automating-updates)
10. [Backup](#10-backup)
11. [Access from other devices](#11-access-from-other-devices)
12. [Troubleshooting](#12-troubleshooting)
13. [Uninstalling](#13-uninstalling)
14. [Appendix: files](#14-appendix-files)

---

## 1. Why?

Without the shared folder, all designs live only in the browser's storage (IndexedDB and localStorage). That storage is not permanent:

- **Safari** deletes it automatically when a website has not been used for 7 days. Only installed web apps are exempt.
- **Every browser** may clear it when disk space runs low.
- "Clear history", cleanup tools or a new device remove it as well.

Anyone who does not use "Back up all" regularly can lose all their designs this way.

layerling has a **shared folder** for this. When it is switched on, every design is a regular `.lyl` file in a folder on disk. It saves itself a few seconds after each change, and the folder can be included in any ordinary backup. This guide sets that up with Docker, on your own computer or on a server.

## 2. What this guide sets up

- The **official, unmodified Docker image** of layerling.
- **No changes to the source code.** Everything uses the documented environment variables:

  | Variable | Value | Effect |
  |---|---|---|
  | `LAYERLING_SHARED_PROJECTS_DIR` | `/shared-projects` | switches the shared folder on |
  | `LAYERLING_NEW_DESIGNS_ON_SERVER` | `always` | new designs are created on the server |

- **Reachable from this computer only** (`127.0.0.1`), because the shared folder has no login.
- An **update script**. It installs a new version only if your configuration still fits it. Before that it makes a backup, and if the new version fails to start, it rolls back automatically.

The configuration depends on the **names** of the environment variables. If a new version renamed a variable, layerling would silently ignore the setting, and new designs would end up in the browser again without anyone noticing. The update script therefore checks before every update that the new version still knows the variables in use.

## 3. Where is my data?

> **Your designs are stored permanently in the projects folder `LL_PROJECTS_DIR`.** In this guide that is `~/Documents/layerling`, on macOS `/Users/<name>/Documents/layerling`. Only this folder needs to be backed up.

| What | Where | Permanent? |
|---|---|---|
| Designs under "On the server" | `~/Documents/layerling` as `.lyl` files. Folders under "On the server" are real subfolders there. | **yes**, include it in your backup |
| Custom shapes on the server | `~/Documents/layerling/Custom shapes` | **yes** |
| Preview pictures on the start page | Docker volume `layerling-thumbnails` | yes, recreated when needed |
| Backups made before updates | `~/layerling-docker/backups` | yes, but on the same disk |
| Designs and folders at browser level (outside "On the server") | browser storage | **no**, see [section 7](#7-which-designs-end-up-where) |

You can choose any folder. Change `LL_PROJECTS_DIR` in `.env` and run `docker compose up -d`.

## 4. Requirements

| | macOS | Linux | Windows |
|---|---|---|---|
| Docker | [OrbStack](https://orbstack.dev) (recommended) or Docker Desktop | Docker Engine with the Compose plugin | Docker Desktop with WSL2 (run the script in WSL, not tested) |
| Shell | bash 3.2 or later (built in) | bash | bash in WSL |
| Tools | `curl` (built in), optional `jq` (`brew install jq`) | `curl`, optional `jq` | as Linux |

Check that Compose v2 is installed:

```sh
docker compose version
```

The output must show `v2.x`.

## 5. Setup

### 5.1 Create the folders

```sh
mkdir -p ~/layerling-docker        # configuration and script
mkdir -p ~/Documents/layerling     # your designs
cd ~/layerling-docker
```

> **OrbStack:** Do **not** put the files in `~/OrbStack`. OrbStack mounts its containers and volumes there, and the folder is not writable.

### 5.2 Create the files

Create two files in `~/layerling-docker`: `compose.yaml` and `update.sh`. Their contents are in the [appendix](#14-appendix-files). Then make the script executable:

```sh
chmod +x update.sh
```

### 5.3 Settings in `.env`

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

| Setting | Meaning |
|---|---|
| `LL_IMAGE_TAG` | Version to start with (any existing version, without "v"). `update.sh` maintains it from then on, and its first run brings the newest version. |
| `LL_PROJECTS_DIR` | Folder for the designs, as an absolute path |
| `LL_BIND` | `127.0.0.1` = this computer only (see [section 11](#11-access-from-other-devices)) |
| `LL_PORT` | Port in the browser |
| `LL_BACKUP_DIR`, `LL_BACKUP_KEEP` | Location and number of backups made before updates |

**Linux only:** The container runs as user 999 and must be allowed to write to the projects folder:

```sh
sudo chown 999:999 ~/Documents/layerling
```

Alternatively, set your own IDs under `user:` in `compose.yaml` (`id -u`, `id -g`). On macOS with OrbStack or Docker Desktop neither is needed.

### 5.4 Start

```sh
docker compose up -d
```

### 5.5 Check

```sh
docker compose ps
curl -s http://127.0.0.1:3000/api/shared-projects
```

The second output must contain `"enabled":true`. Then open **http://localhost:3000**. The start page shows the **"On the server"** tile.

## 6. Moving designs out of the browser

Existing designs are still in the browser's storage under the old address. Every address (for example `layerling.com` or `localhost:3000`) has its own browser storage.

1. At the **previous** layerling address, choose **"Back up all"** on the start page. This creates a ZIP file as an emergency copy.
2. At **http://localhost:3000**, load the ZIP file with **"Restore backup"** (in the notice on the start page) or with "Open a design or import geometry". With `always` the designs go straight into the server folder, each in the folder it had in the browser.
3. Check: `ls ~/Documents/layerling` lists the `.lyl` files, and the start page says "0 in this browser".

A design whose name is already taken on the server comes in as a copy ("… (copy)"). If the server cannot be reached while restoring, the designs stay in the browser and the message says why; choose **"Put all on the server"** once it is back.

## 7. Which designs end up where?

The start page has two levels: the **"On the server"** area (permanent, in the projects folder) and the **browser level** ("… in this browser", not permanent). Since layerling 1.110.0, `LAYERLING_NEW_DESIGNS_ON_SERVER=always` routes every way a design or folder is made to the server:

| Action | Ends up in |
|---|---|
| **"Create new 3D design"** tile | **server** (in the server folder opened last) |
| New design or folder **inside** "On the server" | **server** |
| **"New folder"** on the start page | **server** (its button then says "Make a folder in the server folder") |
| "Open a design or import geometry" (STL, 3MF, OBJ, `.lyl` …) | **server** |
| "Restore backup" (ZIP) | **server**, with the backup's folders |
| History view: take a state as a new design | **server** |
| "Duplicate", of a server design or a browser design | **server** |
| "Create new 3D design" clicked while the start page is still loading | **server**: the start page waits for the server's answer before it decides |
| New design while the server cannot be reached (e.g. during an update) | browser, with an error message |

With an older version (1.109.0 and before) only the first two rows went to the server; update before relying on the others.

### Rules of thumb

1. **Check that `always` is active:** the "New designs on the server" checkbox must be ticked **and greyed out**.
2. **If a design appears at browser level** (after the server could not be reached), choose **"Put all on the server"** or drag its tile onto "On the server". The "Put all on the server" button only appears when browser designs exist, so its appearance is the warning sign.
3. Target state on the start page: **"0 in this browser"**.

With no designs in the browser, the notice on the start page reads "Your designs are kept on the server" instead of asking for a backup of the browser; the backup of the projects folder takes care of them ([section 10](#10-backup)). Its **"Restore backup"** button stays: it reads in backup files (ZIP from "Back up all") made earlier with the browser-only version, straight into the server folder.

**The default for new designs** ("Make default" in the workspace settings) is kept in the projects folder too since the version after 1.113.0, as `.settings/default.json`. When the browser storage is cleared, or layerling is opened in another browser, the start page brings it back when it loads, and new designs start with your own settings again. There is one default for the whole projects folder; the last one saved wins. The backup of the projects folder takes it along.

The **"Back to designs in this browser"** button in the server view only leads back to the start page. It does not mean that there are designs in the browser.

**Always use the same address**, e.g. `http://localhost:3000`. OrbStack also offers an address such as `http://layerling.layerling-docker.orb.local`. Every address has its own browser storage. Designs on the server are the same under both, but browser designs are only visible under the address where they were created.

## 8. Updates

```sh
cd ~/layerling-docker
./update.sh --check    # check only, change nothing
./update.sh            # check and install
./update.sh 1.110.0    # a specific version
```

### What happens

1. The newest version is read from the image label.
2. **Variable check:** the script compares the `LAYERLING_*` variables used in the configuration with those the new image actually knows. The names are read directly from the program code, in a throw-away container without network access.
3. **Release notes:** notes about Docker or variables from all skipped versions are shown (requires `jq`).
4. **Backup** of the projects folder as `backups/projects-<version>-<time>.tar.gz`.
5. Switch to the new version.
6. **Health check:** the shared folder must be switched on, and the new version must be running.
7. If the check fails: **automatic rollback** to the old version.

### How the script reacts

| Situation | Reaction | Exit code |
|---|---|---|
| Already up to date | message, nothing happens | 0 |
| Variables unchanged | update is installed | 0 |
| New variable in the new version | shown (`+`), update proceeds | 0 |
| Variable removed but not used | shown (`-`), update proceeds | 0 |
| **A variable in use is missing from the new version** | **aborted.** The variable is named, the old version keeps running. | **2** |
| Variables cannot be read from the image | **aborted** to be safe | **2** |
| New version is older than the installed one | aborted (can be overridden with `--force`) | 1 |
| Image cannot be pulled, backup failed | aborted before any change | 1 |
| **New version does not start correctly** | log excerpt, **rollback to the old version** | **3** |

**On exit code 2:** Read the release notes, update `compose.yaml` to the new variable names and run `./update.sh --check` again. `--force` skips the check and is meant only for deliberately reviewed cases.

## 9. Automating updates

### macOS (launchd)

Create `~/Library/LaunchAgents/local.layerling.update.plist`. It runs daily at 04:17 and reports failures as a notification:

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
    <string>export PATH="$HOME/.orbstack/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"; cd "$HOME/layerling-docker" &amp;&amp; ./update.sh &gt;&gt; update.log 2&gt;&amp;1 || osascript -e 'display notification "Update blocked or failed, see update.log" with title "layerling"'</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>17</integer></dict>
</dict>
</plist>
```

```sh
launchctl load ~/Library/LaunchAgents/local.layerling.update.plist
launchctl start local.layerling.update     # test once right away
tail ~/layerling-docker/update.log
```

If the Mac is asleep at the scheduled time, launchd runs the job after it wakes up.

OrbStack must start at login (OrbStack → Settings → "Start at login"), otherwise Docker is not available. The same applies to Docker Desktop.

### Linux (cron)

```cron
17 4 * * * cd $HOME/layerling-docker && ./update.sh >> update.log 2>&1 || echo "layerling update: see update.log" | mail -s "layerling" me@example.org
```

## 10. Backup

The designs are regular files in `LL_PROJECTS_DIR` and are therefore included in any ordinary backup: Time Machine, Restic, Borg or NAS snapshots.

- The backups made by `update.sh` in `backups/` protect against faulty updates. They do **not** replace a real backup, because they sit on the same disk.
- Do not let several layerling installations write to the projects folder at the same time, not even through iCloud or Nextcloud. A sync service is suitable only as a backup target.

## 11. Access from other devices

> **Important:** layerling's shared folder has **no login**. Anyone who can reach the page can read, change and delete every design.

With `LL_BIND=127.0.0.1`, layerling is reachable from this computer only. If other devices need access (an iPad, a second computer), the container is best run on a computer that is always on, or on a NAS. There are two safe ways to give access:

1. **VPN (recommended):** Tailscale or WireGuard. Set `LL_BIND` to the server's VPN address, with no port opened in the router.
2. **Reverse proxy with a login**, e.g. Caddy:

   ```caddyfile
   layerling.example.lan {
       basic_auth {
           me <hash from: caddy hash-password>
       }
       reverse_proxy 127.0.0.1:3000
   }
   ```

   A proxy must pass on `Host` and `X-Forwarded-Proto` (Caddy does by default). If it rewrites the host, enter the address in `LAYERLING_ALLOWED_ORIGINS`.

   To give each user a server folder of their own, have the proxy pass the signed-in name as a header (Caddy: `reverse_proxy 127.0.0.1:3000 { header_up X-Remote-User {http.auth.user.id} }`) and set `LAYERLING_USER_HEADER: "X-Remote-User"` in `compose.yml`. The designs then live under `.users/<user>/`. Only safe when layerling can be reached through the proxy alone (`LL_BIND` stays `127.0.0.1`).

`LL_BIND=0.0.0.0` without one of these two exposes all designs to the whole network. Never make layerling reachable directly from the internet.

## 12. Troubleshooting

| Problem | Cause and fix |
|---|---|
| `permission denied: .env` | The folder is not writable, e.g. `~/OrbStack`. Use a folder of your own ([5.1](#51-create-the-folders)). |
| `LL_IMAGE_TAG missing in .env` | `.env` is missing or not next to `compose.yaml`. |
| "On the server" tile is missing | `curl -s http://127.0.0.1:3000/api/shared-projects` shows the reason. `docker exec layerling printenv LAYERLING_SHARED_PROJECTS_DIR` must return `/shared-projects`. |
| Saving to the server fails (Linux) | The projects folder is not writable for user 999, see [5.3](#53-settings-in-env). |
| "Shared projects only accept requests from this site." | A reverse proxy rewrites the host, see [section 11](#11-access-from-other-devices). |
| A design appears at browser level instead of under "On the server" | The server could not be reached when it was made, or the version is older than 1.110.0, see [section 7](#7-which-designs-end-up-where). Choose "Put all on the server". |
| A new folder does not appear in the projects folder | `always` is not active, or the version is older than 1.110.0: then "New folder" on the start page makes a browser folder. Create folders inside "On the server". |
| The "New designs on the server" checkbox can be clicked | `always` is not active. `docker exec layerling printenv LAYERLING_NEW_DESIGNS_ON_SERVER` must return `always`. |
| `update.sh` finds no new version although one was released on GitHub | The Docker image is built a few minutes after the release. Try again later. |
| `update.sh --check` installs nothing | Intended: `--check` only checks. |
| `Update already running` | An earlier run was interrupted. `rmdir ~/layerling-docker/.update.lock` |
| A changed setting does not apply after `docker compose restart` | Use `docker compose up -d`. `restart` does not pick up changes. |
| Port 3000 is in use | Change `LL_PORT` in `.env`, then `docker compose up -d`. |

View the logs: `docker compose logs -f`

## 13. Uninstalling

```sh
cd ~/layerling-docker
docker compose down -v      # remove the container and the preview-picture volume
```

The designs in `LL_PROJECTS_DIR` are kept. Delete them only deliberately and by hand.

## 14. Appendix: files

### `compose.yaml`

```yaml
# Own Compose file for layerling. The original repository stays unchanged.
# The version is set only through LL_IMAGE_TAG in .env (pinned, never :latest).
services:
  layerling:
    image: ghcr.io/henmedia/layerling:${LL_IMAGE_TAG:?LL_IMAGE_TAG missing in .env}
    container_name: layerling
    restart: unless-stopped
    ports:
      # Reachable from this computer only. Change LL_BIND in .env deliberately for VPN/LAN.
      - "${LL_BIND:-127.0.0.1}:${LL_PORT:-3000}:3000"
    # Linux: the projects folder must be writable for UID 999 (chown 999:999), or set your own UID.
    # macOS (OrbStack, Docker Desktop): not needed.
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
      - "${LL_PROJECTS_DIR:?LL_PROJECTS_DIR missing in .env}:/shared-projects"
      - layerling-thumbnails:/app/.codex/project-thumbnails

volumes:
  layerling-thumbnails:
```

### `update.sh`

```bash
#!/usr/bin/env bash
# layerling Docker update with a check of the environment variables.
#
#   ./update.sh            check for the newest version and install it
#   ./update.sh --check    check only, change nothing
#   ./update.sh 1.107.0    a specific version
#   ./update.sh --force    override blocking checks (missing variable, downgrade)
#
# Exit codes: 0 ok/up to date · 1 error · 2 blocked by variable check · 3 health check failed, rolled back
#
# Works with bash 3.2 (macOS). Requires: docker (compose v2), curl. Optional: jq (release notes).

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
die()  { log "ERROR: $*"; exit "${2:-1}"; }

[ -f .env ] || die ".env missing (see the guide, section 5.3)"
command -v docker >/dev/null || die "docker not found"
command -v curl >/dev/null   || die "curl not found"

# Prevent parallel runs
LOCK=".update.lock"
mkdir "$LOCK" 2>/dev/null || die "Update already running (remove $LOCK if stale)"
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
# All LAYERLING_* names known to the built code of an image
image_vars() {
  docker run --rm --network none --entrypoint sh "$1" -c \
    "grep -rhoaE 'LAYERLING_[A-Z0-9_]+' /app/apps/web/.next 2>/dev/null; true" | sort -u
}
# All LAYERLING_* variables set by our own configuration
config_vars() { docker compose config 2>/dev/null | grep -oE 'LAYERLING_[A-Z0-9_]+' | sort -u; }
version_le() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n1)" = "$1" ]; }

CUR="$(env_get LL_IMAGE_TAG)"
[ -n "$CUR" ] || die "LL_IMAGE_TAG in .env is empty"
PORT="$(env_get LL_PORT)"; PORT="${PORT:-3000}"
BIND="$(env_get LL_BIND)"; BIND="${BIND:-127.0.0.1}"; [ "$BIND" = "0.0.0.0" ] && BIND="127.0.0.1"

# --- Determine target version ----------------------------------------------
if [ -z "$TARGET" ]; then
  log "Checking for the newest version …"
  docker pull -q "$IMAGE:latest" >/dev/null
  TARGET="$(image_version "$IMAGE:latest")"
  [ -n "$TARGET" ] || die "Cannot read version from image label"
fi
log "Installed: $CUR · Target: $TARGET"

if [ "$TARGET" = "$CUR" ]; then log "Already up to date."; exit 0; fi
if version_le "$TARGET" "$CUR" && [ "$FORCE" -ne 1 ]; then
  die "Target $TARGET is older than $CUR (downgrade only with --force)"
fi

docker pull -q "$IMAGE:$TARGET" >/dev/null || die "Image $IMAGE:$TARGET not available"
docker image inspect "$IMAGE:$CUR" >/dev/null 2>&1 || docker pull -q "$IMAGE:$CUR" >/dev/null || true

# --- Variable check ---------------------------------------------------------
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"; rmdir "$LOCK" 2>/dev/null || true' EXIT
config_vars              > "$TMP/config"
image_vars "$IMAGE:$TARGET" > "$TMP/new"
image_vars "$IMAGE:$CUR"    > "$TMP/old" 2>/dev/null || : > "$TMP/old"

[ -s "$TMP/new" ] || die "No variables found in the new image – image layout changed? Check not possible." 2

MISSING="$(comm -23 "$TMP/config" "$TMP/new")"
ADDED="$(comm -13 "$TMP/old" "$TMP/new")"
REMOVED="$(comm -23 "$TMP/old" "$TMP/new" | comm -23 - "$TMP/config")"

BLOCK=0
if [ -n "$MISSING" ]; then
  log "BLOCKED: configured variables are unknown to the new image:"
  printf '    - %s\n' $MISSING
  BLOCK=1
fi
[ -n "$REMOVED" ] && { log "Removed in $TARGET (not configured):"; printf '    - %s\n' $REMOVED; }
[ -n "$ADDED" ]   && { log "New in $TARGET:"; printf '    + %s\n' $ADDED; }
[ -z "$MISSING$REMOVED$ADDED" ] && log "Variables unchanged."

# --- Scan release notes for configuration hints ----------------------------
if command -v jq >/dev/null; then
  NOTES="$(curl -fsS "$REPO_API" 2>/dev/null | jq -r --arg cur "$CUR" --arg tgt "$TARGET" '
      .[] | (.tag_name | ltrimstr("v")) as $v
      | select(($v|split(".")|map(tonumber? // 0)) >  ($cur|split(".")|map(tonumber? // 0))
           and ($v|split(".")|map(tonumber? // 0)) <= ($tgt|split(".")|map(tonumber? // 0)))
      | .body | split("\n")[] | select(test("LAYERLING_|[Dd]ocker|compose|environment|Umgebungsvariable|breaking|BREAKING|migrat"))
      | "    " + .' 2>/dev/null || true)"
  if [ -n "$NOTES" ]; then
    log "Configuration-related notes in the release notes $CUR → $TARGET:"
    printf '%s\n' "$NOTES" | cut -c1-200 | sort -u
  fi
else
  log "Note: jq missing, release notes not checked."
fi

if [ "$BLOCK" -eq 1 ] && [ "$FORCE" -ne 1 ]; then
  die "Update aborted. Adjust the configuration or override with --force." 2
fi
if [ "$CHECK_ONLY" -eq 1 ]; then log "Check only (--check), nothing changed."; exit 0; fi

# --- Backup of the projects folder before updating -------------------------
PROJ="$(env_get LL_PROJECTS_DIR)"
BDIR="$(env_get LL_BACKUP_DIR)"; BDIR="${BDIR:-./backups}"
KEEP="$(env_get LL_BACKUP_KEEP)"; KEEP="${KEEP:-14}"
if [ -n "$PROJ" ] && [ -d "$PROJ" ]; then
  mkdir -p "$BDIR"
  ARCHIVE="$BDIR/projects-$CUR-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar -czf "$ARCHIVE" -C "$PROJ" . || die "Backup failed, update aborted"
  log "Backup: $ARCHIVE"
  ls -1t "$BDIR"/projects-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do rm -f "$old"; done
else
  die "LL_PROJECTS_DIR ($PROJ) not found"
fi

# --- Switch over, health check, roll back if needed -------------------------
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
log "Starting $TARGET …"
docker compose up -d --remove-orphans >/dev/null

if health "$TARGET"; then
  log "OK: layerling $TARGET is running, shared folder active."
  exit 0
fi

log "Health check failed – rolling back to $CUR"
docker compose logs --tail 30 layerling || true
env_set LL_IMAGE_TAG "$CUR"
docker compose up -d >/dev/null
health "$CUR" && log "Rollback successful." || log "WARNING: $CUR does not start cleanly either, check manually."
exit 3
```

---

*This guide and the files it contains are given to the layerling project for free use, modification and publication. Use at your own risk, without warranty.*
