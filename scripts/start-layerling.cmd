@echo off
rem Starts layerling from this checkout: updates it first (when it is a git copy without
rem local changes), starts the server in its own window, waits until the server answers,
rem and only then opens the browser. Works from any folder - it finds the checkout itself.
setlocal
cd /d "%~dp0.."
title layerling
rem Node.js installed a moment ago - by winget, or by an AI setting layerling up - is
rem not yet on the PATH of a window that was open before, and npm is not found (#1546).
rem Then the PATH is read afresh from the system and the user settings, as a new window would.
where npm >nul 2>nul
if not errorlevel 1 goto npmfound
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%p"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install it from https://nodejs.org, or run the quickstart line from the guide, then start layerling again.
  pause
  exit /b 1
)
:npmfound
rem Started afresh after an update (see below): the checks and the update are done.
if /i "%~1"=="--updated" goto start

rem Is layerling already running? A second server would share the build folder with
rem the first and break it, and so would updating under a running server (#102).
rem 0 = layerling answers on port 3000, 2 = something else holds the port, 1 = it is free.
powershell -NoProfile -Command "try { if ((New-Object Net.WebClient).DownloadString('http://127.0.0.1:3000/manifest.webmanifest') -match 'layerling') { exit 0 } else { exit 2 } } catch { try { (New-Object Net.Sockets.TcpClient('127.0.0.1', 3000)).Close(); exit 2 } catch { exit 1 } }"
if errorlevel 2 (
  echo Port 3000 is taken by another program, so layerling cannot start there.
  echo Close that program and start layerling again.
  pause
  exit /b 1
)
if not errorlevel 1 (
  echo layerling is already running - opening it in the browser without a second server.
  echo If a layerling tab is still open, you can simply keep using that one.
  start "" "http://127.0.0.1:3000/"
  exit /b 0
)

if not exist ".git" goto start
where git >nul 2>nul
if errorlevel 1 goto start

rem Only changed tracked files hold an update back. Files of your own in this
rem folder do not, and neither does package-lock.json: npm rewrites it when its
rem version differs from ours, so it is put back before updating.
set DIRTY=
for /f "delims=" %%i in ('git status --porcelain --untracked-files^=no ^| findstr /v /e /c:"package-lock.json"') do set DIRTY=1
if defined DIRTY (
  echo These files were changed in this folder, so the update was skipped:
  git status --short --untracked-files=no
  echo To drop those changes and update anyway, run "git stash" in this folder and start layerling again.
  goto start
)
git checkout -- package-lock.json 2>nul

echo Checking for updates...
for /f %%i in ('git rev-parse HEAD') do set BEFORE=%%i
rem The update can replace this very file while cmd is still reading it, and cmd
rem would then go on at the same place in the new file - in the middle of some
rem other line ("'atch' is not recognized", #110). So everything from the update on
rem is one block, which cmd reads in full before it runs it, and the block ends by
rem starting this script afresh: no line is read from the file after the update.
(
  git pull --ff-only --quiet
  if errorlevel 1 (
    rem A short gap in the network, right after the computer starts or wakes up, is
    rem the usual reason: wait a moment and try once more before giving up.
    echo The update could not be fetched - trying once more in 5 seconds...
    ping -n 6 127.0.0.1 >nul
    git pull --ff-only --quiet
  )
  if errorlevel 1 (
    echo The update could not be fetched - check your internet connection. Continuing with the version that is already here.
  ) else (
    git diff --quiet %BEFORE% HEAD || (
      echo layerling was updated. Installing dependencies...
      call npm install --no-save
    )
  )
  call "%~f0" --updated
  exit /b
)

:start
start "layerling server" cmd /k "npm run dev -- -p 3000"
echo Waiting for the server to come up...
powershell -NoProfile -Command "for ($i = 0; $i -lt 90; $i++) { try { (New-Object Net.Sockets.TcpClient('127.0.0.1', 3000)).Close(); exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
if errorlevel 1 (
  echo.
  echo layerling did not start within 90 seconds. Check the "layerling server" window for errors.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:3000/"
exit /b 0
