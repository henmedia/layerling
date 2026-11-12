# layerling in Docker, Schritt für Schritt

**Windows, macOS und Linux: von der Docker-Installation bis zu Entwürfen, die als Dateien auf deinem Rechner liegen**

Diese Anleitung ist für alle, die Docker noch nie benutzt haben. Sie installiert Docker, startet deine eigene Kopie von layerling unter `http://localhost:3000` und speichert deine Entwürfe als `.lyl`-Dateien in einem Ordner deiner Wahl, damit sie nicht mehr nur im Browser liegen.

Jeder Teil hat einen Abschnitt für jedes Betriebssystem. Folge nur dem für deinen Rechner; Schritte für alle Systeme sind mit **Alle** gekennzeichnet.

Für automatische, geprüfte Updates unter macOS und Linux und für den Hintergrund, wo Entwürfe liegen, siehe die [Anleitung von Jürgen Keller](layerling-docker-anleitung.md). Die Kurzfassung steht unter [Docker in der README](../../../README.de.md#docker).

## Inhalt

1. [Docker installieren](#1-docker-installieren)
2. [layerling starten](#2-layerling-starten)
3. [Entwürfe als Dateien auf dem Rechner speichern](#3-entwürfe-als-dateien-auf-dem-rechner-speichern)
4. [Alltägliche Befehle](#4-alltägliche-befehle)
5. [Aktualisieren](#5-aktualisieren)
6. [Fehlerbehebung](#6-fehlerbehebung)

## 1. Docker installieren

Docker lässt layerling in einer abgeschlossenen Box laufen, einem *Container*, sodass sonst nichts installiert werden muss. Unter Windows und macOS installierst du **Docker Desktop**, eine App. Unter Linux installierst du die **Docker Engine** im Terminal.

### Windows 10 und 11

1. Docker Desktop braucht WSL 2 (das Windows-Subsystem für Linux) und die Plattform für virtuelle Computer. Schaltest du beides vorher ein, erspart dir das einen unerwarteten Neustart später. Klicke mit der rechten Maustaste auf Start, wähle **Terminal (Administrator)** oder **PowerShell (Administrator)** und führe diese beiden Befehle aus. Meldet einer, er sei schon installiert oder aktiviert, ist das in Ordnung. Starte danach den **Rechner neu**.

   ```powershell
   wsl --install --no-distribution
   Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
   ```

2. Lade Docker Desktop für Windows von [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) herunter. Die meisten PCs brauchen die Version **AMD64**; **ARM64** nur für ein ARM-Notebook wie ein Surface mit Snapdragon.
3. Starte das Installationsprogramm und lasse **Use WSL 2 instead of Hyper-V** angehakt. Melde dich von Windows ab und wieder an (oder starte neu), wenn es danach fragt.
4. Öffne **Docker Desktop** über das Startmenü, bestätige die Bedingungen und überspringe die Anmeldung, wenn du magst: Ein Konto ist nicht nötig. Meldet es, eine Windows-Komponente müsse installiert oder aktiviert werden, lass es zu; der Rechner startet neu, danach öffnest du Docker Desktop noch einmal. Warte, bis links unten **Engine running** steht.

Docker Desktop muss laufen, wenn du layerling benutzt. Hake unter **Settings > General** **Start Docker Desktop when you sign in** an, damit du nicht daran denken musst.

### macOS

1. Sieh nach, welchen Chip dein Mac hat: Apfelmenü > **Über diesen Mac** nennt entweder Apple M1, M2, M3, M4 … (Apple Silicon) oder Intel.
2. Lade Docker Desktop für Mac von [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) herunter, in der Version für deinen Chip. ([OrbStack](https://orbstack.dev) geht auch, die Befehle unten sind dieselben.)
3. Öffne `Docker.dmg` und ziehe **Docker** in **Programme**.
4. Öffne **Docker** aus Programme, bestätige die Bedingungen und gib auf Nachfrage dein Mac-Passwort ein. Ein Docker-Konto ist freiwillig. Warte, bis sich das Wal-Symbol in der Menüleiste nicht mehr bewegt.

Damit es von selbst startet, hake unter **Settings > General** **Start Docker Desktop when you sign in to your computer** an.

### Linux (Ubuntu, Debian, Fedora und ähnliche)

Das Installationsskript von Docker erkennt deine Distribution und installiert die Docker Engine zusammen mit dem Compose-Plugin:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable --now docker
```

Danach erlaubst du deinem eigenen Benutzer, Docker ohne `sudo` zu benutzen, und meldest dich ab und wieder an (oder startest neu), damit es wirkt:

```bash
sudo usermod -aG docker $USER
```

Lieber nach der Anleitung deiner Distribution? Auf [docs.docker.com/engine/install](https://docs.docker.com/engine/install/) gibt es für jede eine Seite. Achte darauf, dass das Paket `docker-compose-plugin` dabei ist.

### Alle: prüfen, ob Docker läuft

Öffne ein Terminal: unter Windows die PowerShell (Startmenü, „PowerShell“ eintippen), unter macOS das Terminal (Programme > Dienstprogramme), unter Linux dein gewohntes Terminal. Gib ein:

```bash
docker --version
docker compose version
```

Beide zeigen eine Versionsnummer. Kommt *command not found* oder *cannot connect to the Docker daemon*, läuft Docker Desktop noch nicht (Windows, macOS), oder du hast dich noch nicht ab- und wieder angemeldet (Linux).

## 2. layerling starten

Du legst in deinem Benutzerordner einen Ordner `layerling` an, legst eine kleine Datei `compose.yml` hinein und sagst Docker, sie zu starten. Das offizielle Image lädt Docker beim ersten Mal herunter.

### 2.1 Ordner und Datei anlegen

**Windows** (PowerShell):

```powershell
mkdir $HOME\layerling
cd $HOME\layerling
notepad compose.yml
```

Der Editor fragt, ob er eine neue Datei anlegen soll: klicke auf **Ja**. Der Ordner ist `C:\Users\<dein Name>\layerling`.

**macOS und Linux** (Terminal):

```bash
mkdir ~/layerling
cd ~/layerling
nano compose.yml
```

`nano` ist ein kleiner Texteditor im Terminal. Speichere nach dem Einfügen mit `Strg+O` und `Enter` und verlasse ihn mit `Strg+X`.

### 2.2 In compose.yml einfügen

Dieselbe Datei gilt für alle drei Systeme:

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

Speichere sie (im Editor: **Datei > Speichern**; der Name bleibt `compose.yml`). Was die Zeilen bedeuten:

- `image` ist die offizielle Version aus der Registry von GitHub. Dasselbe Image gibt es auf Docker Hub als `henmedia/layerling`.
- `restart: unless-stopped` startet layerling nach einem Neustart wieder, bis du es selbst anhältst.
- `"3000:3000"` macht es auf Port 3000 deines Rechners erreichbar.
- `layerling-thumbnails` bewahrt die Vorschaubilder der Startseite bei einem Update auf.

Die Einrückung ist in dieser Datei wichtig: zwei Leerzeichen je Ebene, keine Tabulatoren. Ging beim Einfügen die Einrückung verloren, siehe [Fehlerbehebung](#6-fehlerbehebung).

### 2.3 Starten und öffnen

Im selben Terminal, weiter im Ordner `layerling`:

```bash
docker compose up -d
```

Beim ersten Mal lädt Docker das Image herunter, das dauert ein bis zwei Minuten. `-d` lässt es im Hintergrund laufen, du bekommst die Eingabe zurück. Öffne dann **`http://localhost:3000`** im Browser. Andere Geräte im Netzwerk nehmen `http://<IP-Adresse dieses Rechners>:3000`.

Im Moment liegen deine Entwürfe **im Browser**, wie auf layerling.com. Löschst du die Websitedaten, sind sie weg, und `localhost:3000` und `127.0.0.1:3000` sind zwei getrennte Speicher. Der nächste Teil behebt das.

## 3. Entwürfe als Dateien auf dem Rechner speichern

layerling kann Entwürfe in einem Ordner auf dem Server speichern, das ist hier dein eigener Rechner. Du legst in `layerling` einen Ordner `projects` an, verbindest ihn mit dem Container und schaltest die Funktion mit `LAYERLING_SHARED_PROJECTS_DIR` ein.

> Für den Serverordner gibt es keine Anmeldung: Jeder, der die Adresse öffnen kann, sieht und ändert die Entwürfe darin. Auf deinem eigenen Rechner bist das nur du. Auf einem Server oder in einem gemeinsamen Netz lies zuerst [Zugriff von anderen Geräten](layerling-docker-anleitung.md#11-zugriff-von-anderen-geräten).

### 3.1 Den Ordner projects anlegen

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

**Linux** (Terminal):

```bash
cd ~/layerling
mkdir projects
id -u
id -g
```

Notiere die beiden Zahlen, die `id -u` und `id -g` ausgeben (meist 1000 und 1000). Du brauchst sie im nächsten Schritt.

### 3.2 compose.yml ändern

Öffne die Datei noch einmal (`notepad compose.yml` unter Windows, `nano compose.yml` unter macOS und Linux), lösche alles und füge diese Fassung ein. Zwei Dinge sind neu: der Teil `environment` und die Zeile `./projects:/shared-projects` unter `volumes`. Im Editor markierst du vor dem Einfügen alles mit `Strg+A`. In `nano` geht es schneller, die alte Datei zu löschen und neu anzulegen: `rm compose.yml`, dann `nano compose.yml`.

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
    # Nur Linux: das # vor "user" entfernen und die eigenen Zahlen
    # aus id -u und id -g eintragen
    # user: "1000:1000"
    volumes:
      - layerling-thumbnails:/app/.codex/project-thumbnails
      - ./projects:/shared-projects

volumes:
  layerling-thumbnails:
```

Die wichtige Zeile ist `./projects:/shared-projects`. Links steht der Ordner auf deinem Rechner, rechts, wo der Container ihn sieht, und `LAYERLING_SHARED_PROJECTS_DIR` zeigt auf diese rechte Seite.

**Linux: warum die Zeile `user` wichtig ist.** layerling läuft im Container als Benutzer mit der Nummer 999, der unter Linux in einen Ordner, der dir gehört, nicht schreiben darf. Ohne Abhilfe erscheint der Ordner in layerling, aber jedes Speichern schlägt fehl. Mache **eines** von beidem:

- **Empfohlen:** Entferne das `#` vor `user:` und trage deine eigenen Zahlen ein, dann läuft der Container als du.
- Oder lass die Zeile auskommentiert und gib den Ordner dem Benutzer 999: `sudo chown 999:999 projects`.

Windows und macOS brauchen die Zeile `user` nicht, dort kümmert sich Docker Desktop um die Ordnerrechte. Schlägt das Speichern unter macOS trotzdem fehl, füge die Zeile mit den Zahlen aus `id -u` und `id -g` ein (meist 501 und 20).

### 3.3 Änderung anwenden

Zurück im Ordner `layerling`:

```bash
docker compose up -d
```

Nimm `up -d`, nicht `docker compose restart`: Ein Neustart behält die alten Einstellungen, `up -d` legt den Container mit den neuen neu an.

### 3.4 Prüfen

```bash
docker exec layerling printenv LAYERLING_SHARED_PROJECTS_DIR
```

Es sollte `/shared-projects` ausgeben. Kommt nichts, wird die Einstellung nicht gelesen: Prüfe, ob `compose.yml` die neue Fassung ist, und führe `docker compose up -d` noch einmal aus.

### 3.5 In layerling benutzen

1. Lade `http://localhost:3000` neu. Die Startseite hat jetzt neben den Entwürfen aus dem Browser einen Reiter **Server**.
2. Um alle Entwürfe aus dem Browser zu verschieben, klicke auf **Alle auf den Server legen**; deine Ordner kommen mit. Für einen einzelnen Entwurf oder Ordner nimmst du **Auf den Server legen** in seinem Menü oder ziehst seine Kachel auf den Reiter Server. Zurück holst du einen mit **In diesen Browser holen** in seinem Menü auf dem Reiter Server oder ziehst seine Kachel auf den Reiter Browser.
3. Hake **Neue Entwürfe auf dem Server** an, damit neue Entwürfe ab der ersten Änderung dort gespeichert werden.
4. Öffne den Ordner `projects` im Explorer, im Finder oder in deinem Dateimanager: Deine Entwürfe liegen dort als `.lyl`-Dateien. Sichere diesen Ordner wie jeden anderen.

Damit jeder neue Entwurf für alle auf dem Server landet, ohne dass man es abhaken kann, ändere den Teil `environment` in `compose.yml` so und führe `docker compose up -d` noch einmal aus:

```yaml
    environment:
      LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"
      LAYERLING_NEW_DESIGNS_ON_SERVER: "always"
```

Die Anleitung von Jürgen Keller erklärt, [welche Entwürfe mit `always` wo landen](layerling-docker-anleitung.md#7-welche-entwürfe-landen-wo).

## 4. Alltägliche Befehle

Führe sie in einem Terminal im Ordner `layerling` aus (`cd $HOME\layerling` unter Windows, `cd ~/layerling` unter macOS und Linux).

| Du willst | Befehl |
|---|---|
| layerling starten | `docker compose up -d` |
| layerling anhalten | `docker compose down` |
| sehen, ob es läuft | `docker compose ps` |
| sein Protokoll lesen (bei Fehlern) | `docker compose logs --tail 50` |
| auf die neueste Version aktualisieren | `docker compose pull`, dann `docker compose up -d` |
| die Einstellung für den Speicherordner prüfen | `docker exec layerling printenv LAYERLING_SHARED_PROJECTS_DIR` |

`docker compose down` entfernt den Container, nicht deine Entwürfe: Der Ordner `projects` und der Browserspeicher bleiben, wie sie sind.

## 5. Aktualisieren

Eine neue layerling-Version erscheint als neues Image. Der Container, den du hast, läuft in der Version weiter, mit der er angelegt wurde, bis du das neue Image herunterlädst und den Container neu anlegst. Ein Update berührt deine Entwürfe nicht.

### 5.1 Welche Version läuft?

Die neueste Version steht auf der [Seite der Releases](https://github.com/henmedia/layerling/releases). Die laufende zeigst du im Terminal so.

**Windows** (PowerShell):

```powershell
docker inspect layerling | Select-String image.version
```

**macOS und Linux:**

```bash
docker inspect layerling | grep image.version
```

Die Version des Images hat kein „v“: `1.42.0` ist das Release, das GitHub `v1.42.0` nennt.

### 5.2 Erst sichern

Kopiere vor jedem Update den Ordner `projects`, damit du zurückgehen kannst, wenn etwas schiefgeht. Im Ordner `layerling`:

**Windows** (PowerShell):

```powershell
Copy-Item -Recurse projects projects-backup
```

**macOS und Linux:**

```bash
cp -r projects projects-backup
```

Lösche oder benenne ein altes `projects-backup` vorher um, falls es eines gibt. Entwürfe, die nur im Browser liegen, berührt ein Update nicht, aber es ist ein guter Zeitpunkt, sie auf den Serverordner zu legen (siehe 3.5).

### 5.3 Aktualisieren

Dieselben drei Befehle auf jedem System, im Ordner `layerling`:

```bash
docker compose pull
docker compose up -d
docker image prune
```

`pull` lädt das neueste Image herunter, ohne den laufenden Container anzufassen. `up -d` sieht das neue Image und legt den Container damit neu an, alles aus `compose.yml` bleibt. `image prune` ist freiwillig: Es entfernt das alte Image, das niemand mehr braucht (antworte mit `y`).

Lade danach layerling im Browser neu. Sieht es noch wie die alte Version aus, lade ohne Zwischenspeicher neu: `Strg+Umschalt+R` unter Windows und Linux, `Cmd+Umschalt+R` unter macOS. Die neue Nummer prüfst du mit dem Befehl aus 5.1.

> Der Knopf **Restart** von Docker Desktop und `docker compose restart` aktualisieren **nicht**: Sie starten denselben alten Container noch einmal. Nimm immer `pull`, dann `up -d`.

### 5.4 Bei einer Version bleiben oder zurückgehen

Macht eine neue Version Ärger, nenne in `compose.yml` statt `latest` eine genaue Version, ohne „v“:

```yaml
    image: ghcr.io/henmedia/layerling:1.42.0
```

Führe dann `docker compose up -d` aus. layerling bleibt bei dieser Version, und `pull` ändert nichts, bis du `latest` wieder einträgst. Lassen sich Entwürfe, die von der neueren Version gespeichert wurden, in der älteren nicht öffnen, stelle `projects-backup` aus 5.2 wieder her.

## 6. Fehlerbehebung

**`docker: command not found` oder `cannot connect to the Docker daemon`.** Windows und macOS: Öffne Docker Desktop und warte, bis es gestartet ist. Linux: `sudo systemctl start docker`, und achte darauf, dass du dich nach dem Schritt mit `usermod` ab- und wieder angemeldet hast.

**`port is already allocated`.** Etwas anderes benutzt Port 3000. Ändere in `compose.yml` `"3000:3000"` in `"3080:3000"`, führe `docker compose up -d` aus und öffne `http://localhost:3080`.

**Der Reiter Server ist da, aber das Speichern schlägt fehl.** Ein Problem mit den Rechten. Setze unter Linux die Zeile `user` oder führe `sudo chown 999:999 projects` aus (siehe 3.2), danach `docker compose up -d`.

**Es gibt keinen Reiter Server.** Die Einstellung ist nicht aktiv. Führe die Prüfung aus 3.4 aus. Kommt nichts, füge die Fassung aus 3.2 noch einmal ein und führe `docker compose up -d` aus (nicht `restart`).

**Ein Fehler, der mit `yaml:` beginnt, oder `mapping values are not allowed`, oder `did not find expected key`.** Beim Einfügen ging die Einrückung von `compose.yml` verloren oder wurde verändert, oder ein Tabulator ist hineingeraten. Öffne die Datei, lösche alles und füge den ganzen Kasten noch einmal ein; jede Ebene ist um zwei Leerzeichen eingerückt. Manche Editoren sowie Mail- und Chatprogramme schlucken führende Leerzeichen: kopiere von dieser Seite im Browser, nicht aus einer Chatnachricht.

**Windows: Docker Desktop meldet, die Virtualisierung sei nicht aktiviert.** Die Virtualisierung ist in der Firmware des Rechners (BIOS oder UEFI) ausgeschaltet. Starte in die Firmware-Einstellungen, schalte Intel VT-x (Intel Virtualization Technology) oder AMD SVM ein, speichere und starte Docker Desktop noch einmal.

**Windows: `no configuration file provided`.** Die Datei wurde vielleicht als `compose.yml.txt` gespeichert. Schalte im Explorer **Ansicht > Anzeigen > Dateinamenerweiterungen** ein und benenne sie in `compose.yml` um.

**Meine Entwürfe von layerling.com sind nicht da.** Jede Website hat ihren eigenen Browserspeicher. Speichere die Entwürfe auf layerling.com als `.lyl`-Dateien (oder nimm **Alle sichern** auf der Startseite), öffne sie dann in deiner eigenen Kopie oder lege sie in den Ordner `projects`.

Mehr Einzelheiten, auch zu NAS und Reverse-Proxy, stehen unter [Docker in der README](../../../README.de.md#docker).
