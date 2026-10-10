<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="layerling logo">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">Easy 3D CAD for 3D printing</h3>
        <p align="right">
          Drop a shape, cut a hole, round an edge, print it. In your browser, with no account and no CAD background.
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="GNU AGPLv3 license" src="https://img.shields.io/badge/license-AGPLv3-663399"></a>
    <img alt="No account needed" src="https://img.shields.io/badge/no%20account-nothing%20to%20sign%20up%20for-dd7906">
    <img alt="Made for 3D printing" src="https://img.shields.io/badge/made%20for-3D%20printing-ff9e2c">
    <a href="#layerling-mcp-skill"><img alt="Drivable by AI" src="https://img.shields.io/badge/AI--drivable-MCP%20server-16c0d4"></a>
  </p>

  <p><strong>English</strong> · <a href="README.de.md">Deutsch</a></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-en.png" width="763" alt="layerling in the browser">
</p>

<p align="center"><em>layerling in the browser</em></p>

<p align="center"><a href="https://layerling.com/guide/index.html"><strong>User guide</strong></a>, step by step and with pictures</p>

## Who It Is For

You own a 3D printer. You want a part that fits something, not a career in CAD.

layerling works the way you already think: put a shape on the plate, drag it to size, turn a second shape into a hole, group the two, export, print. There is nothing to learn before you start and **nothing to sign up for** – open the page and build. Your designs stay in your own browser: no account, no cloud, nothing uploaded anywhere.

### Coming From Tinkercad?

layerling sits a step beyond Tinkercad towards Fusion 360: it is operated the same way, so you will recognise everything – the plate, the shapes, solids and holes, group and ungroup, bundle, Alt-drag for a copy – but it does not stop where Tinkercad does. Things you have been missing are waiting for you:

- **Chamfer and fillet.** Pick an edge and break it or round it – the one thing people ask for most once a printed part has to feel finished or slot into something. Applied edges stay reversible: take them off again whenever you like.
- **Hollow, split, sketch, thread.** Hollow a body to an even wall, split it with a plane, draw sketches with exact lengths and angles and extrude or revolve them, and add screws, nuts and tapped holes.
- **Patterns and wrapping.** Repeat a shape in a row, circle or spiral, or wrap a pattern or text around a cylinder.
- **Scale by percent.** Make one or many parts larger or smaller by a percentage - together, so the layout grows with them, or each in place.
- **Measure and look inside.** Tape measure, rulers, a section view that cuts the model open, and a history slider to look back at earlier states.
- **Real geometry underneath.** layerling keeps exact CAD shapes, not just a mesh, so a rounded edge stays a rounded edge – all the way into a STEP file for a full CAD program.

It is not a full CAD package: there is no parametric timeline and no assemblies. And you can **run it yourself**: install it as an app (it then starts without internet), or host your own copy on Windows, a NAS or a home server – see [Getting Started](#getting-started).

> **An AI can build along with you.** layerling ships an MCP server. An AI client such as Codex or Claude sees an open
> editor tab and works in it: add shapes, change measurements, group, cut, round edges, read the scene back, take pictures
> of the viewport. You describe the part, the AI builds it, you watch it happen and step in whenever you want. This runs
> locally, with nothing leaving the browser – see [layerling MCP Skill](#layerling-mcp-skill) for the setup.

## What It Does

### Building

- **A real build plate** – grid, snapping, handles for moving, resizing and rotating, and a panel with the exact numbers when you need them.
- **Type a position** – the Position card puts a body at exact X, Y and Z, and parts can be parked beside the plate, as in Tinkercad.
- **Axis arrows** – red, green and blue arrows at the plate's front left corner show X, Y and Z the way the numbers count, as in Bambu Studio and OrcaSlicer; they can be switched off in the settings.
- **Pivot that stays** – set a pivot for one body and it stays with that body: it moves, turns and scales with it, is saved, and can be typed as X, Y and Z or dragged with the mouse, snapping to corners and edge midpoints - for hinges and joints.
- **Light and shadows to taste** – shading contrast, shadow strength and softness, and the direction and height of the light, up to straight above as in Tinkercad, all in the settings. A "Tinkercad look" button sets colours, grid and light like there in one go, and the darker grid lines can come every centimetre in a colour of their own.
- **Fast mode** – for slower computers: one switch in the settings turns off shadows, edge lines and the camera's inertia and draws the view at screen resolution; the camera's inertia can also be switched off on its own, so the view stops the moment you let go.
- **Align faces and see the angles** – the Align faces tool brings a face of one part against a face of another, touching or flush, with an optional gap; a turned body shows its angles about X, Y and Z under the selection, and the Rotation card in its settings takes them as numbers.
- **Snap to other shapes** – while moving, a shape locks its edges or centre onto the edges and centres of the shapes around it, with a guide line, so parts sit flush without typing numbers. Alt during the drag pauses it; Shift keeps the move on one axis, and Alt held from the start drags a copy, as in Tinkercad.
- **Set down on faces** – like Cruise in Tinkercad: a new shape lies down on the face under the pointer, sloped ones too, and C picks the selection up and sets it down on another face the same way.
- **Reference points** – right-click a body to mark its centre, corners or edge middles with points that nothing prints and that dragged shapes snap to; drag a point or type its coordinates, and the marks are saved with the design.
- **Command search** – press Ctrl+K and type a tool, a shape or a command ("fillet", "mirror", "cylinder") to jump straight to it; it understands English and German words and shows the keyboard shortcuts beside each entry.
- **History view** – look back at any earlier state of the project with a slider, without changing anything; export that state or start a new project from it. By @rmpel.
- **Millimetres or inches** – with Imperial units every measure is shown in inches, as fractions like Tinkercad (1 5/8) or as decimals, the snap grid steps from 1/64 to 1 inch, and the plate's grid is drawn in inches.
- **Your printer's plate** – pick one of 190 common printers and the plate takes its size. Its name and build volume show in the corner of the workplane (a switch in the settings hides this and the design's name), and a warning appears when a body reaches past the edge.
- **Overhangs and filament** – "Show overhangs" hatches every face steeper than 45° (or your printer's own angle) that would need supports, and the export window shows volume, weight and metres of filament before you slice.
- **Shape library** – boxes, cylinders, capsules (one end smaller if needed, say for a belt guard), spheres, cones, pyramids, wedges, text, roofs, half spheres, torus shapes, tubes, lofts from one outline to another (say square to round, solid or with a wall, twisted or with a tilted top), polygon prisms from three to twenty-four sides, coil springs, a print-in-place hinge, knurled grips (straight, crossed or round) and more.
- **Threads that fit** – threaded rods, screws with a socket, countersunk or hex head, hex nuts and tapped holes. M2 to M12, UNC/UNF from #4 to one inch and the Whitworth pipe threads G1/16 to G4 (ISO 228-1) are one pick away, or set your own diameter and pitch, left-hand as well; an inch or G size asks for threads per inch instead of millimetres. The ends take a chamfer, and a tapped hole is a cutter: drop it into a part, group, and the hole comes out threaded.
- **Gears that mesh** – spur, helical and bevel gears, ring gears and racks with involute teeth, set by module and number of teeth like a gear generator, with pressure angle and backlash for printing - or with round teeth, forgiving on small printed gears and a smooth grip on knobs. Select two gears and the panel gives the centre distance they mesh at.
- **Solids and holes** – turn shapes into cutters and group them into the final geometry. Edit group (**E**) lays a group's parts loose to change them and rebuilds it with Done – also a group inside a group, as deep as the design goes.
- **Multicolor groups** – a group can show every part in its own colour, also after holes were cut into it, and a 3MF or OBJ export keeps those colours, so the slicer can map the parts onto filaments.
- **Bundle** – Ctrl+B holds parts together like Tinkercad's bundle: they move, turn and scale as one, but keep their colours and stay separate bodies in the export – handy for multicolour prints.
- **Intersection** – keep only what two or more selected solids have in common, or where solids and holes overlap.
- **Split** – cut solids or holes in two with a plane; a hollowed body keeps its cavity. Turn the plane for an angled cut, drag its arrow, or lay it on any face with "Pick face".

### Refining

- **Chamfer and fillet** – break or round any edge of a solid, and remove the treatment again later.
- **Sketches** – draw outlines with lines, curves and ready-made shapes, set lines by length and angle as you draw ("50<30", Shift snaps in 15° steps), type lengths, angles and sizes (sums like "60+12.5" work in every number field), round or chamfer corners, snap to the outlines of other bodies, and extrude or revolve them into exact bodies. A sketch can also be built as a stroke: a closed outline becomes a frame, inside, outside or centred on the line, and an open line a stripe with flat, square or round ends.
- **Hollowing** – turn a body into walls of one thickness, open on any sides you choose (top, bottom, front, back, left, right, in any combination) or closed – for boxes, cups and cases.
- **Custom shapes** – keep bodies you need again and again at the top of the shape library and insert them into any design with a click or by dragging; in the browser, or with the shared store on the server for every device. "Back up all" takes them along.
- **Wrap around a cylinder** – lay an SVG pattern, a logo or lettering onto the wall of a cup or tube, raised or engraved, and centre it on the cylinder.

### Files

- **Fonts of your own** – use any TrueType, OpenType or WOFF font for text, or in Chrome and Edge a font installed on the computer. A design keeps only the outlines of the letters it uses, so it opens anywhere.
- **Bring your own models** – import STL, OBJ, 3MF, STEP or SVG and build around it. An SVG comes in as a sketch body: an area, a stroke outside or inside its lines, a silhouette without its holes, or the drawing widened all round - together a cookie cutter from one file, or the layers of a multicolour logo. The Text shape has the same fill modes. A coloured OBJ – from layerling, or from Tinkercad as a ZIP with its `.mtl` – or a coloured 3MF, slicer projects included, comes in as one body per colour, and a 3MF with several objects as one body per object.
- **Export what your slicer wants** – STL, 3MF with names and colours, or OBJ with colours, for the selection or the whole scene (hidden parts stay out), plus STEP if the design should travel on into a full CAD program. PNG saves a clean picture of the view, at twice the resolution and with a transparent background if you like.
- **Projects as files** – save a whole project, history, sketches and groups included, as a `.lyl` file and carry on elsewhere. Older `.skf` files from earlier versions still open; saving then writes a `.lyl` beside them.
- **Bug report** – one link in the footer saves the design as a `.lyl` with the version, browser and last messages inside, ready to attach in the forum or on GitHub.
- **Designs you recognise** – everything lives in your own browser, each design with a thumbnail.

### Viewing

- **Perspective or straight-on** – switch between the normal view and a flat, orthographic one with the cube button beside the zoom controls, or by pressing **O**. Your viewing direction and framing are kept.
- **Turn the view at the cube** – dragging the view cube turns the view like the right mouse button, with one finger on a tablet; a click still jumps to that side, and a click on a corner or an edge looks from there. Keys **1**–**6** jump too, and **Shift+1**–**6** also zoom to the selection.
- **Look from below** – the eye over a grid in the camera bar hides the plate, so the underside of a design can be seen without it in the way.
- **Panels where you want them** – the object list, the settings, the section view, the tape measure and the tool panels for edges, hollowing and patterns move by their title bar and open there again; a double-click docks them.
- **Right-click menu** – a short right click on a body brings up the most used commands: duplicate, hole or solid, group, chamfer, fillet and hollow for one body, hide, lock, drop to the workplane, delete. Dragging with the right button still turns the view.
- **Section view** – cut the view open along a plane across X, Y or Z to look at walls, cavities and parts that fit into each other, with a coarse and a fine slider. Only the view is cut: the design and every export stay whole. "Section as SVG" saves the cut itself at 1:1, for a laser or a template, and "Measure" reads wall thickness and gaps right on the cut, snapping square to the wall.
- **Workplane on any face** – press W and click a face to build on it; a click near a corner puts it exactly on the corner, near an edge on the edge with the grid running along it, and on the empty plate where you click. An eye hides the plane for a clear view while it keeps applying. An AI can set it on a face too.
- **On a tablet** – one finger works the design, exactly as the left mouse button does: tap to select, drag to move, drag on empty space for a selection box. **Two fingers belong to the view**: spread or pinch them to zoom, move them together to shift the workplane. Putting a second finger down takes back whatever the first one had started, so a pinch never nudges a part. Turning the view has no gesture of its own; the camera rail carries a switch for it, shown only on a touch screen, and while it is on, one finger orbits instead of selecting. Number fields hand you their whole value when you tap them, ready to be overwritten – a decimal keypad has no arrow keys to move the caret with.

### Videos

Made by others, not by this project:

- [Layerling – Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) – Making Layers (English). A series about layerling: an introduction for people coming from Tinkercad, and the sketch tools.
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) – 3D Jesus | 3D Printing & Design (English). A first-time test of layerling without any manual.

## Getting Started

The shortest way is the hosted version. Nothing to install, nothing to sign up for – open it and build:

**https://layerling.com/**

The rest of this section is about running your own copy: on your computer, or on a machine in the workshop that everyone opens in their browser. Wherever the app is served from, the designs never leave the browser they were made in, and exports download straight to the person's own computer.

### Windows Quickstart

Never used a terminal before? On a Windows 11 (or current Windows 10) machine with nothing installed yet, open
**PowerShell** (search for it in the Start menu, no administrator rights needed) and paste this one line:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

It installs Git and Node.js if they are missing, downloads layerling into `%USERPROFILE%\layerling`, and opens it in
your browser at `http://127.0.0.1:3000/`. Leave the PowerShell window open while you use layerling; `Ctrl+C` in that
window stops it.

Run the very same line again whenever you want to **update** layerling – it notices the existing folder and pulls the
latest version instead of downloading it a second time. The script itself lives at
[`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1), so you can read exactly what it does before
running it, or download it and run it locally instead of piping it into PowerShell.

#### Opening It Again Later

The one-liner above also leaves a shortcut named **“Start layerling”** on your desktop. Double-click it whenever you
want to open layerling again – no PowerShell, no re-installing, no re-downloading, just the server starting and your
browser opening on its own. It also **updates layerling first** (when the folder has no changes of your own) and opens the
browser only once the server is really ready. If layerling is already running, it starts no second server and does not
update underneath the running one - it just opens the page. Wanted layerling somewhere else, say on another drive? Run the script with
the folder you want:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

If your shortcut was made by an older version of the script, run the one-liner once more; it replaces the shortcut with the new one.

Prefer doing it by hand? Open PowerShell and run:

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

then open `http://127.0.0.1:3000/` yourself. `Ctrl+C` in that window stops it either way.

### Docker

To run layerling on a computer, NAS (Synology, Unraid, etc.) or home server without installing Node.js, use the ready-made image **`ghcr.io/henmedia/layerling`**. Every release publishes it for amd64 and arm64 (Raspberry Pi, ARM NAS) under its version number and as `latest`. The app listens on port **3000**.

The quickest way is a single command:

```bash
docker run -d --name layerling -p 3000:3000 --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

On a NAS with a container manager (Synology Container Manager, Unraid, Portainer), add the image `ghcr.io/henmedia/layerling:latest` and map port 3000. To update, pull the image again and recreate the container (or let Watchtower do it).

The image tags are plain version numbers **without a "v"**: `ghcr.io/henmedia/layerling:1.42.0`, while the GitHub release is called `v1.42.0`. A pull only fetches the new image; a container that already exists keeps running the old one until it is removed and created again:

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`docker inspect layerling | grep image.version` shows which version the container really runs. If you mounted a folder for the server storage, add the same `-v` option again.

To build the image yourself instead, use the included [`Dockerfile`](docker/Dockerfile) and [`compose.yml`](docker/compose.yml):

1. **Install Docker.** On Windows or macOS, install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/). On Linux or a NAS you need Docker with Compose (`docker compose` or the standalone `docker-compose`).
2. **Get the files.** Either download the repository as a ZIP ([Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)) and extract it, or clone it:
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **Start it.** In the project folder, open a terminal (e.g. PowerShell on Windows) and run:
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   With the older standalone binary, write `docker-compose` instead of `docker compose`. Docker builds the image and runs the container in the background (`-d`); the first build takes about 2–3 minutes. Without `--build`, the same command pulls the ready-made image instead.
4. **Open it.** On the same computer at **`http://localhost:3000/`**, from other devices on your network at **`http://<YOUR-SERVER-IP>:3000/`**.

Everyday commands:

- **Stop:** `docker compose -f docker/compose.yml down`
- **Restart:** `docker compose -f docker/compose.yml up -d`
- **Update** (after pulling new code or extracting a new ZIP): `docker compose -f docker/compose.yml up -d --build`; with the ready-made image `docker compose -f docker/compose.yml pull` and then `up -d`

The image runs `next start` in production mode, so the MCP bridge is off there unless you switch it on (see [Letting an AI client reach a copy on a NAS or server](#letting-an-ai-client-reach-a-copy-on-a-nas-or-server)). To offer a shared project folder, bind a writable directory and set `LAYERLING_SHARED_PROJECTS_DIR` in `compose.yml` to the path inside the container where it is mounted, for example `./shared-projects:/shared-projects` with `LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"` (see [Shared Designs on a Network](#shared-designs-on-a-network)). After changing it, run `docker compose up -d`: `docker compose restart` keeps the old setting. `docker exec <container> printenv LAYERLING_SHARED_PROJECTS_DIR` shows the one in use.

### Static Hosting: Plain Files on a Web Server

Any web server can serve layerling as plain files; no Node.js runs on it. Build the files once on a computer that has Node.js (see [What You Need](#what-you-need)):

```bash
npm install
npm run export
```

The finished site is in **`apps/web/.next-export/`**. Copy the **contents** of that folder (not the folder itself) into the web server's document root, so that `index.html` lies directly in it.

Three things to know:

- **layerling needs an address of its own.** The files refer to each other with paths that start at the root (`/_next/...`), so layerling must be served at the root of an address, such as `https://layerling.example.com/` or `http://192.168.0.5:8080/`. It does not work in a subfolder (`https://example.com/layerling/`) and cannot be opened from disk (`file://`). If you only see a block of plain text without any styling, the script and style files did not load: open the browser's developer tools (F12), look at the Network tab for red `/_next/...` entries and compare their address with where you put the files.
- **Folders that start with an underscore must be served.** Some servers hide them (GitHub Pages does without a `.nojekyll` file, for example), and `_next` holds the whole program.
- **A quick test on your own computer:** `npx serve apps/web/.next-export` and open the address it prints.

### Shared Designs on a Network

If you run layerling with `npm run dev` or `npm run start` on a machine other people open in their browser, it can offer a
shared folder for `.lyl` designs. Point `LAYERLING_SHARED_PROJECTS_DIR` at a directory before starting:

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projects npm run start
```

The start page then shows a folder named **On the server** beside your browser designs. Open it and you are in that
folder: **New design** starts one right there, **New folder** makes a subfolder, and a trail under the heading says where
you are. A `..` tile leads back out. Designs move by dragging them onto a folder, onto that tile or onto a step of the
trail – or through **Move to …** in their menu. A design from your browser goes onto the server the same way: drag its
card onto the server folder.

The search box at the top searches the whole server folder, not just the one you are standing in. Every hit says
which folder holds it, and that folder is a button: one click and you are there, with the search cleared. Folders are
found by name too. While you are searching, the server tile on the start page says how many matches are waiting over
there.

**Duplicate** in a design's menu makes a copy of it. On the server the file itself is copied, next to the original and
under a free name, picture and all – nothing is repacked, so the copy carries exactly the geometry of the original. In
your browser the copy becomes a design of its own, with the same shapes, the same history and its own preview picture,
and it belongs to nobody on the server.

A design that lives on the server saves itself back there, five seconds after the last change and when you leave the
editor. Thumbnails land beside the files in `.thumbnails`. Designs that are only in your browser stay there, untouched.

Custom shapes saved to the server go into a folder named `Custom shapes` at the top of the store, one `.lyl` with its
picture each. layerling creates it with the first such shape; it is an ordinary folder, so it shows on the start page and
a shape in it opens and saves like any design. Neither the Node route nor `store.php` needs anything extra for it.

Opening a design from the server gives you a private local working copy. Saving back checks the revision on the server
first; if someone else changed the file in the meantime, layerling refuses to overwrite it and asks you to reload or save
under a different name. This is shared file storage, not simultaneous editing.

#### Without Node: the `store` Folder

An installation served as a static export – plain files on a web server – cannot write anything by itself. For that case
`store.php` travels with the export. Create a folder named `store` next to `index.html` that the web server may write to,
and layerling offers the same shared storage as above, folders and all. Without the folder the feature stays invisible,
and the short guide in the editor explains how to switch it on. The web server needs PHP.

The folder has **no login**: whoever can reach the page can read, write and delete what is in it. On a home network or in
a workshop that is the point; on a publicly reachable site, protect it or leave it out.

One thing to remember when deploying: if you mirror the export with an option that removes anything extra – `rsync
--delete`, `robocopy /MIR`, WinSCP `-delete` – exclude `store` explicitly, or every update will wipe the projects.

## Working on layerling

Take this path if you want to change the code.

### What You Need

- Node.js 20 or newer
- npm, included with Node.js

Check your versions with `node -v` and `npm -v`. If those commands do not work, install Node.js from the official
Node.js website and reopen your terminal.

### Install and Run

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

No Git? Press the green **Code** button on the GitHub page, choose **Download ZIP**, extract it, open a terminal in the
extracted folder and start with `npm install`.

Then open `http://127.0.0.1:3000/`. Leave the terminal open while you use the app; `Ctrl+C` stops the development server.

On Linux and macOS, `scripts/start-layerling.sh` does the daily start for you: it updates the checkout first (skipped if you changed files in it), starts the server, waits until it answers and then opens the browser. Run it from anywhere, for example `~/layerling/scripts/start-layerling.sh`. It needs Git and Node.js, as above. If layerling already runs on that port, it only opens the browser instead of starting a second server. Port 3000 taken by something else? Start it with `PORT=3100 scripts/start-layerling.sh`. It has been tried on Debian Linux (without a desktop, so the browser step only prints the address) and in a Windows shell; macOS is untested – if it misbehaves on your system, please tell us in the discussions.

### Developing in a Container

Prefer not to install Node.js? Develop in a container instead. You need a container engine with Compose –
`docker compose` or `podman compose` (rootless Podman on SELinux works too; the `:z` flag in the compose file handles
the file labels):

```bash
docker compose -f docker/compose.dev.yml up
```

Open `http://127.0.0.1:3000/`. The first start installs dependencies; later starts go straight to the dev server with
hot reload. Stop it with `Ctrl+C`. If you update dependencies and something looks stale, delete `node_modules/` in the
project folder and start again.

Running the production container from `docker/compose.yml` at the same time? It uses port 3000 as well – change the
host-side port on one of them (e.g. `"3100:3000"`).

### Useful Commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript checks |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run build` | Production build (`npm run start` serves it) |
| `npm run export` | Static export for plain web hosting |
| `npm run guide` | Build the user guide pages from `docs/guide` (the export and `npm run dev` do this too) |
| `npm run guide:images` | Retake the guide's pictures from the running program (needs `npm run dev -- -p 3010`; see `docs/guide/README.md`) |
| `npm run printers:update` | Refresh the printer presets from OrcaSlicer's profiles |
| `npm run mcp:layerling` | Start the MCP server for AI clients (see below) |

## layerling MCP Skill

layerling includes a local MCP server for AI clients that support MCP tools. It lets an agent inspect and control a live
editor tab: list open editors, read the scene, create, update and select objects, group, cut and separate parts, list CAD
edge ids, apply chamfer or fillet, hollow a body, inspect errors and capture viewport images.

It works against a local development server. In production builds and static hosting the MCP route is disabled, unless the
server switches it on with an access token ([see below](#letting-an-ai-client-reach-a-copy-on-a-nas-or-server)); on layerling.com it is always off.

1. Start layerling from the project folder with `npm run dev` (see [Install and Run](#install-and-run)).
2. Open an editor tab, e.g. `http://127.0.0.1:3000/?editor=1`.
3. Connect your AI client as described below. It starts the MCP server itself with
   `node scripts/layerling-mcp-server.mjs`.

The main tool names are `layerling_list_editors`, `layerling_read_scene`, `layerling_list_objects`,
`layerling_create_shape`, `layerling_update_object`, `layerling_list_edges`, `layerling_apply_edge_treatment`,
`layerling_hollow_object`, `layerling_array_objects`, `layerling_set_section_view` and `layerling_capture_image`.

### Claude Code

Nothing to install: the repo already ships `.mcp.json`, which registers the MCP server for this project, and a copy of the
skill at `.claude/skills/layerling-mcp-skill`, which is where Claude Code looks for one. Open the layerling folder in
Claude Code and ask:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Claude Desktop

Claude Desktop does not read a project's `.mcp.json` or skill files, but it can use the same MCP server through its own
config. Add the server there, using [`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json)
as the template and replacing the script path with the absolute path on your machine. After restarting Claude Desktop, ask:

```text
Use the layerling MCP tools to list open editors, inspect the scene, and modify the selected object.
```

### Codex

Copy the skill from `docs/skills/layerling-mcp-skill` into your Codex skills folder.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.codex\skills\layerling-mcp-skill"
```

macOS or Linux:

```bash
mkdir -p ~/.codex/skills
cp -R docs/skills/layerling-mcp-skill ~/.codex/skills/
```

Then add an MCP server entry to your Codex config, using [`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml)
as the template and replacing the script path with the absolute path on your machine. Restart Codex and ask:

```text
Use $layerling-mcp-skill to list my open layerling editors and inspect the current scene.
```

### Letting an AI client reach a copy on a NAS or server

A copy you host yourself (the Docker image on a NAS, a home server) can let an AI client drive its open editors over the
network. It is **off by default**, because whoever can drive the bridge can read and change the open designs. Switch it
on with two settings on the server, read when it starts - the ready-made image needs no rebuild:

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "a-long-random-secret-of-at-least-16-characters"
```

Without a token of at least 16 characters the bridge stays closed. Then:

1. Open an editor tab of that copy in a browser, e.g. `http://nas:3000/?editor=1`, and keep it open.
2. Give the MCP client the address and the same token: set `LAYERLING_URL=http://nas:3000` and
   `LAYERLING_MCP_TOKEN=<the token>` in its configuration (see the examples in `docs/mcp`).

The token protects the commands: only a client that sends it can list or drive the editors. The editor pages need none,
but they only count when they are pages of that copy, opened by an address or a name that only someone in your own
network can use (an IP address, a name without a dot, or one ending in `.local` or `.lan`). This keeps a web page on the
internet from reaching your NAS through your browser. If you open the copy under a real domain, for example behind a
reverse proxy, list it in `LAYERLING_MCP_ALLOWED_HOSTS` (comma-separated). Use this on a network you trust, and use HTTPS
for anything beyond it: the token travels in a header.

## Contributing

Contributions are welcome, and you do not have to be a 3D printing person to help – a clearer sentence in this README
counts. Good places to start:

- editor bug fixes
- geometry and boolean test cases
- import and export edge cases (STL, OBJ, 3MF, STEP, SVG)
- UI polish
- documentation screenshots and videos
- accessibility and performance improvements

Read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a pull request. What changed in each version is in
the [changelog](docs/CHANGELOG.md).

## Security

Please do not open public issues for security-sensitive reports. Read [.github/SECURITY.md](.github/SECURITY.md) for the
reporting process.

## Where This Comes From

layerling is a fork of [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D) by Formsmith746 and the SketchForge
contributors. The fork started on 16 September 2026 from SketchForge 1.0.9. SketchForge remains an excellent project and
the reason this one exists.

## License

Copyright (C) 2026 layerling contributors.
Copyright (C) 2026 SketchForge contributors.

layerling is a modified version of SketchForge-3D and is licensed under the **GNU Affero General Public License v3.0 only**
(`AGPL-3.0-only`) – the same licence as the original. See [LICENSE](LICENSE).

If you modify layerling and let people use the modified version over a network, section 13 of the licence requires you to
offer them the corresponding source code. The dashboard carries a **Source** link for exactly that: set
`NEXT_PUBLIC_SOURCE_CODE_URL` at build time to the public URL of the source your build came from.
