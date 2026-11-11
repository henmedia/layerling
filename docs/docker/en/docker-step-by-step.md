# Running layerling in Docker, step by step

**Windows, macOS and Linux: from installing Docker to designs saved as files on your computer**

This guide is for anyone who has never used Docker. It installs Docker, starts your own copy of layerling at `http://localhost:3000` and saves your designs as `.lyl` files in a folder of your choice, so they no longer live only in the browser.

Each part has a section for every operating system. Follow only the one for your computer; steps for all systems are marked **All**.

For automatic, checked updates on macOS and Linux, and for the background on where designs live, see the [guide by Jürgen Keller](layerling-docker-guide.md). The short version is in [Docker in the README](../../../README.md#docker).

## Contents

1. [Install Docker](#1-install-docker)
2. [Start layerling](#2-start-layerling)
3. [Save designs as files on your computer](#3-save-designs-as-files-on-your-computer)
4. [Everyday commands](#4-everyday-commands)
5. [Updating](#5-updating)
6. [Troubleshooting](#6-troubleshooting)

## 1. Install Docker

Docker runs layerling in a self-contained box called a *container*, so nothing else has to be installed. On Windows and macOS you install **Docker Desktop**, an app. On Linux you install **Docker Engine** from the terminal.

### Windows 10 and 11

1. Docker Desktop needs WSL 2 (the Windows Subsystem for Linux) and the Virtual Machine Platform. Switching them on first saves a surprise restart later. Right-click the Start button, choose **Terminal (Admin)** or **PowerShell (Admin)** and run these two commands. If one says it is already installed or enabled, that is fine. Then **restart the computer**.

   ```powershell
   wsl --install --no-distribution
   Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
   ```

2. Download Docker Desktop for Windows from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/). Most PCs need the **AMD64** version; choose **ARM64** only for an ARM laptop such as a Snapdragon Surface.
3. Run the installer and leave **Use WSL 2 instead of Hyper-V** ticked. Sign out of Windows and back in (or restart) if it asks.
4. Open **Docker Desktop** from the Start menu, accept the terms and skip the sign-in if you like: an account is not needed. If it says a Windows component has to be installed or enabled, let it; the computer restarts, and you open Docker Desktop again afterwards. Wait until the bottom-left corner says **Engine running**.

Docker Desktop has to be running whenever you use layerling. Under **Settings > General**, tick **Start Docker Desktop when you sign in** so you do not have to remember it.

### macOS

1. Look up your chip: Apple menu > **About This Mac** says either Apple M1, M2, M3, M4 … (Apple silicon) or Intel.
2. Download Docker Desktop for Mac from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/), in the version for your chip. ([OrbStack](https://orbstack.dev) works as well, and the commands below are the same.)
3. Open `Docker.dmg` and drag **Docker** into **Applications**.
4. Open **Docker** from Applications, accept the terms and enter your Mac password when asked. A Docker account is optional. Wait until the whale icon in the menu bar stops moving.

To start it automatically, tick **Start Docker Desktop when you sign in to your computer** under **Settings > General**.

### Linux (Ubuntu, Debian, Fedora and similar)

Docker's install script detects your distribution and installs Docker Engine together with the Compose plugin:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable --now docker
```

Then let your own user run Docker without `sudo`, and log out and back in (or restart) so it takes effect:

```bash
sudo usermod -aG docker $USER
```

Prefer your distribution's own instructions? [docs.docker.com/engine/install](https://docs.docker.com/engine/install/) has a page for each. Make sure the `docker-compose-plugin` package is included.

### All: check that Docker works

Open a terminal: PowerShell on Windows (Start menu, type "PowerShell"), Terminal on macOS (Applications > Utilities) or your usual terminal on Linux. Run:

```bash
docker --version
docker compose version
```

Both print a version number. If you get *command not found* or *cannot connect to the Docker daemon*, Docker Desktop is not running yet (Windows, macOS), or you have not yet logged out and back in (Linux).

## 2. Start layerling

You make a folder called `layerling` in your home folder, put one small file called `compose.yml` in it, and tell Docker to start it. Docker downloads the official image the first time.

### 2.1 Make the folder and the file

**Windows** (PowerShell):

```powershell
mkdir $HOME\layerling
cd $HOME\layerling
notepad compose.yml
```

Notepad asks whether to create a new file: click **Yes**. The folder is `C:\Users\<your name>\layerling`.

**macOS and Linux** (terminal):

```bash
mkdir ~/layerling
cd ~/layerling
nano compose.yml
```

`nano` is a small text editor inside the terminal. After pasting, save with `Ctrl`+`O` and `Enter`, and leave with `Ctrl`+`X`.

### 2.2 Paste this into compose.yml

The same file works on all three systems:

```yaml
services:
  layerling:
    image: ghcr.io/henmedia/layerling:latest
    container_name: layerling
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - layerling-thumbnails:/app/.codex/project-thumbnails

volumes:
  layerling-thumbnails:
```

Save it (in Notepad: **File > Save**; the name stays `compose.yml`). What the lines mean:

- `image` is the official release from GitHub's registry. The same image is on Docker Hub as `henmedia/layerling`.
- `restart: unless-stopped` starts layerling again after a reboot, until you stop it yourself.
- `"3000:3000"` makes it reachable on port 3000 of your computer.
- `layerling-thumbnails` keeps the preview pictures of the start page when you update.

Indentation matters in this file: it uses two spaces per level, and no tabs. If your editor lost the spacing when you pasted, see [Troubleshooting](#6-troubleshooting).

### 2.3 Start it and open it

In the same terminal, still inside the `layerling` folder:

```bash
docker compose up -d
```

The first time, Docker downloads the image, which takes a minute or two. `-d` runs it in the background, so you get the prompt back. Then open **`http://localhost:3000`** in your browser. Other devices in your network use `http://<this computer's IP address>:3000`.

Right now your designs are stored **in the browser**, as on layerling.com. Clearing the site data deletes them, and `localhost:3000` and `127.0.0.1:3000` count as two separate stores. The next part fixes that.

## 3. Save designs as files on your computer

layerling can save designs in a folder on the server, which here is your own computer. You make a folder called `projects` inside `layerling`, connect it to the container and switch the feature on with `LAYERLING_SHARED_PROJECTS_DIR`.

> There is no login for the shared folder: everyone who can open the address can see and change the designs in it. On your own computer that is only you. On a server or in a shared network, read [Access from other devices](layerling-docker-guide.md#11-access-from-other-devices) first.

### 3.1 Make the projects folder

**Windows** (PowerShell):

```powershell
cd $HOME\layerling
mkdir projects
```

**macOS** (Terminal):

```bash
cd ~/layerling
mkdir projects
```

**Linux** (terminal):

```bash
cd ~/layerling
mkdir projects
id -u
id -g
```

Write down the two numbers that `id -u` and `id -g` print (usually 1000 and 1000). You need them in the next step.

### 3.2 Change compose.yml

Open the file again (`notepad compose.yml` on Windows, `nano compose.yml` on macOS and Linux), delete everything and paste this version. Two things are new: the `environment` part, and the `./projects:/shared-projects` line under `volumes`. In Notepad select everything with `Ctrl`+`A` before pasting. In `nano` it is quicker to delete the old file and start a new one: `rm compose.yml`, then `nano compose.yml`.

```yaml
services:
  layerling:
    image: ghcr.io/henmedia/layerling:latest
    container_name: layerling
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"
    # Linux only: remove the # in front of "user" and put in your numbers
    # from id -u and id -g
    # user: "1000:1000"
    volumes:
      - layerling-thumbnails:/app/.codex/project-thumbnails
      - ./projects:/shared-projects

volumes:
  layerling-thumbnails:
```

The important line is `./projects:/shared-projects`. The left side is the folder on your computer, the right side is where the container sees it, and `LAYERLING_SHARED_PROJECTS_DIR` points at that right-hand side.

**Linux: why the `user` line matters.** layerling runs inside the container as the user with the number 999, which on Linux may not write into a folder that belongs to you. Without a fix the folder shows up in layerling, but every save fails. Do **one** of these:

- **Recommended:** remove the `#` in front of `user:` and put in your own numbers, so the container runs as you.
- Or leave the line commented out and hand the folder to user 999: `sudo chown 999:999 projects`.

Windows and macOS do not need the `user` line, as Docker Desktop looks after the folder permissions. On macOS, if saving still fails, add the line with the numbers from `id -u` and `id -g` (usually 501 and 20).

### 3.3 Apply the change

Back in the `layerling` folder:

```bash
docker compose up -d
```

Use `up -d`, not `docker compose restart`: a restart keeps the old settings, while `up -d` creates the container again with the new ones.

### 3.4 Check it

```bash
docker exec layerling printenv LAYERLING_SHARED_PROJECTS_DIR
```

It should print `/shared-projects`. If it prints nothing, the setting is not being read: check that `compose.yml` is the new version and run `docker compose up -d` again.

### 3.5 Use it in layerling

1. Reload `http://localhost:3000`. The start page now has a **Server** tab next to your designs from the browser.
2. To move all designs from the browser, click **Put all on the server**; your folders come along. To move one design or folder, use **Put on the server** in its menu, or drag its tile onto the Server tab. To take one back, use **Put in this browser** in its menu on the Server tab, or drag its tile onto the Browser tab.
3. Tick **New designs on the server**, so new designs are saved there from the first change on.
4. Open the `projects` folder in File Explorer, Finder or your file manager: your designs are there as `.lyl` files. Back up this folder like any other.

To make every new design go to the server folder for everyone, with no way to untick it, change the `environment` part of `compose.yml` like this and run `docker compose up -d` again:

```yaml
    environment:
      LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"
      LAYERLING_NEW_DESIGNS_ON_SERVER: "always"
```

The guide by Jürgen Keller explains [which designs end up where](layerling-docker-guide.md#7-which-designs-end-up-where) with `always`.

## 4. Everyday commands

Run these in a terminal from inside the `layerling` folder (`cd $HOME\layerling` on Windows, `cd ~/layerling` on macOS and Linux).

| You want to | Command |
|---|---|
| Start layerling | `docker compose up -d` |
| Stop layerling | `docker compose down` |
| See whether it is running | `docker compose ps` |
| Read its log (for errors) | `docker compose logs --tail 50` |
| Update to the latest version | `docker compose pull`, then `docker compose up -d` |
| Check the save folder setting | `docker exec layerling printenv LAYERLING_SHARED_PROJECTS_DIR` |

`docker compose down` removes the container, not your designs: the `projects` folder and the browser storage stay as they are.

## 5. Updating

A new layerling version is published as a new image. The container you have keeps running the version it was created with until you download the new image and create the container again. An update does not touch your designs.

### 5.1 Which version am I running?

The latest version is listed on the [releases page](https://github.com/henmedia/layerling/releases). To see the one that runs, use this in a terminal.

**Windows** (PowerShell):

```powershell
docker inspect layerling | Select-String image.version
```

**macOS and Linux:**

```bash
docker inspect layerling | grep image.version
```

The image's version has no "v": `1.42.0` is the release that GitHub calls `v1.42.0`.

### 5.2 Back up first

Copy the `projects` folder before every update, so you can go back if something goes wrong. From inside the `layerling` folder:

**Windows** (PowerShell):

```powershell
Copy-Item -Recurse projects projects-backup
```

**macOS and Linux:**

```bash
cp -r projects projects-backup
```

Delete or rename an old `projects-backup` first if there is one. Designs that are still only in the browser are not affected by an update, but it is a good moment to move them to the server folder (see 3.5).

### 5.3 Update

The same three commands on every system, from inside the `layerling` folder:

```bash
docker compose pull
docker compose up -d
docker image prune
```

`pull` downloads the newest image without touching the running container. `up -d` sees the new image and creates the container again with it, keeping everything in `compose.yml`. `image prune` is optional: it removes the old image that nothing uses any more (answer `y`).

Then reload layerling in the browser. If it still looks like the old version, reload without the cache: `Ctrl`+`Shift`+`R` on Windows and Linux, `Cmd`+`Shift`+`R` on macOS. Check the new number with the command in 5.1.

> Docker Desktop's **Restart** button and `docker compose restart` do **not** update: they start the same old container again. Always use `pull`, then `up -d`.

### 5.4 Stay on one version, or go back

If a new version causes trouble, name an exact version instead of `latest` in `compose.yml`, without the "v":

```yaml
    image: ghcr.io/henmedia/layerling:1.42.0
```

Then run `docker compose up -d`. layerling stays on that version, and `pull` changes nothing until you put `latest` back. If designs saved by the newer version do not open in the older one, restore `projects-backup` from 5.2.

## 6. Troubleshooting

**`docker: command not found`, or `cannot connect to the Docker daemon`.** Windows and macOS: open Docker Desktop and wait until it has started. Linux: `sudo systemctl start docker`, and make sure you logged out and back in after the `usermod` step.

**`port is already allocated`.** Something else uses port 3000. In `compose.yml` change `"3000:3000"` to `"3080:3000"`, run `docker compose up -d` and open `http://localhost:3080`.

**The Server tab is there, but saving fails.** A permissions problem. On Linux set the `user` line or run `sudo chown 999:999 projects` (see 3.2), then `docker compose up -d`.

**There is no Server tab.** The setting is not active. Run the check in 3.4. If it prints nothing, paste the version from 3.2 again and run `docker compose up -d` (not `restart`).

**An error beginning with `yaml:`, or `mapping values are not allowed`, or `did not find expected key`.** The spacing of `compose.yml` was lost or changed when you pasted, or a tab got in. Open the file, delete everything and paste the whole box again; every level is indented by two spaces. Some editors and mail or chat programs eat leading spaces: copy from this page in the browser, not from a chat message.

**Windows: Docker Desktop says virtualization is not enabled.** Virtualization is switched off in the computer's firmware (BIOS or UEFI). Restart into the firmware settings, turn on Intel VT-x (Intel Virtualization Technology) or AMD SVM, save, and start Docker Desktop again.

**Windows: `no configuration file provided`.** The file may have been saved as `compose.yml.txt`. In File Explorer turn on **View > Show > File name extensions** and rename it to `compose.yml`.

**My designs from layerling.com are not there.** Each website has its own browser storage. On layerling.com save the designs as `.lyl` files (or use **Back up all** on the start page), then open them in your own copy or put them into the `projects` folder.

More detail, including NAS and reverse-proxy setups, is in [Docker in the README](../../../README.md#docker).
