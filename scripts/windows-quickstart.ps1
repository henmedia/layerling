<#
.SYNOPSIS
    Installs everything needed to run layerling locally on Windows, then starts it.

.DESCRIPTION
    For a freshly installed Windows machine with nothing set up yet. Installs Git for
    Windows and Node.js via winget if they are missing, downloads layerling from GitHub
    (or updates an existing local copy), installs its dependencies with npm, and starts
    the local dev server.

    Safe to run again later: if layerling is already present at -InstallPath, this script
    updates it with "git pull" instead of downloading it a second time. That also makes it
    the way to update layerling once it is installed.

    Source: https://github.com/henmedia/layerling/blob/main/scripts/windows-quickstart.ps1
    Have a look before you run a script from the internet - that link always shows the
    exact version this file describes.

.PARAMETER InstallPath
    Where to put (or find) the layerling folder. Defaults to "$env:USERPROFILE\layerling".
    To choose another place (another drive, say), run the script with this parameter:
    & ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"

.PARAMETER NoStart
    Install and update everything, but do not start the dev server or open a browser tab.

.EXAMPLE
    irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
#>

[CmdletBinding()]
param(
    [string]$InstallPath = (Join-Path $env:USERPROFILE "layerling"),
    [switch]$NoStart
)

$RepoUrl = "https://github.com/henmedia/layerling.git"

function Write-Step([string]$text) {
    Write-Host ""
    Write-Host "==> $text" -ForegroundColor Cyan
}

function Test-CommandExists([string]$name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Update-SessionPath {
    # winget updates the registry, not this already-running console. Rebuild $env:Path from
    # Machine + User so a tool installed a moment ago is found without opening a new window.
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = @($machine, $user) -join ";"
}

function Get-LayerlingPortState {
    # "layerling" when layerling already answers on port 3000, "other" when another
    # program holds the port, "free" otherwise.
    try {
        $manifest = (New-Object Net.WebClient).DownloadString("http://127.0.0.1:3000/manifest.webmanifest")
        if ($manifest -match "layerling") { return "layerling" }
        return "other"
    } catch {
        try {
            (New-Object Net.Sockets.TcpClient("127.0.0.1", 3000)).Close()
            return "other"
        } catch {
            return "free"
        }
    }
}

function Install-WithWinget([string]$id, [string]$displayName) {
    Write-Step "Installing $displayName..."
    winget install --id $id --exact --source winget --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        throw "winget could not install $displayName (exit code $LASTEXITCODE)."
    }
    Update-SessionPath
}

Write-Host "layerling - Windows quickstart" -ForegroundColor Green
Write-Host "Installs what is missing, gets the app, and starts it." -ForegroundColor Green

# No "exit" anywhere in this script: run through "irm ... | iex" it would close the
# user's PowerShell window before they could read why. "throw" stops just the script.
if (-not (Test-CommandExists "winget")) {
    throw ("winget was not found. It ships with current Windows 10 and 11 as the 'App Installer' app. " +
        "Install it from the Microsoft Store, then run this script again: https://apps.microsoft.com/detail/9nblggh4nns1")
}

if (Test-CommandExists "git") {
    Write-Step "Git is already installed."
} else {
    Install-WithWinget "Git.Git" "Git for Windows"
}

if (Test-CommandExists "node") {
    Write-Step "Node.js is already installed."
} else {
    Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js (LTS)"
}

Update-SessionPath
if (-not (Test-CommandExists "git") -or -not (Test-CommandExists "node")) {
    throw ("Git and/or Node.js were just installed, but this window cannot see them yet. " +
        "Close this PowerShell window, open a new one, and run this script again - it will pick up right where it left off.")
}

# An older Node.js that was already installed cannot build layerling: the guide and font
# scripts load TypeScript files directly, which needs Node.js 22.18 or newer.
$nodeVersionText = (& node --version | Out-String).Trim()
if ($nodeVersionText -match '^v(\d+)\.(\d+)') {
    $nodeMajor = [int]$Matches[1]
    $nodeMinor = [int]$Matches[2]
    if ($nodeMajor -lt 22 -or ($nodeMajor -eq 22 -and $nodeMinor -lt 18)) {
        throw ("Node.js $nodeVersionText is too old; layerling needs 22.18 or newer. " +
            "Update it (for example: winget upgrade OpenJS.NodeJS.LTS, or the current LTS from https://nodejs.org), " +
            "then close this PowerShell window, open a new one, and run this script again.")
    }
}

# A layerling server already running from this folder would break if it were updated
# underneath, and a second server would share its build folder and break it too (#102).
$portState = Get-LayerlingPortState
if ($portState -eq "layerling") {
    Write-Step "layerling is already running."
    Write-Host "To update it, stop it first (Ctrl+C in its window), then run this script again." -ForegroundColor Yellow
    if (-not $NoStart) {
        Write-Host "Opening the running layerling in your browser." -ForegroundColor Green
        Start-Process "http://127.0.0.1:3000/"
    }
} elseif ($portState -eq "other") {
    throw "Port 3000 is taken by another program, so layerling cannot start there. Close that program and run this script again."
} else {
    if (Test-Path (Join-Path $InstallPath ".git")) {
        Write-Step "layerling is already at $InstallPath - checking for updates..."
        Push-Location $InstallPath
        try {
            # Only changed tracked files hold an update back. Files of your own in the folder
            # do not, and neither does package-lock.json: npm rewrites it when its version
            # differs from ours, so it is put back before updating.
            $dirty = git status --porcelain --untracked-files=no | Where-Object { $_ -notmatch 'package-lock\.json$' }
            if ($dirty) {
                Write-Host "These files were changed in $InstallPath, so the update was skipped:" -ForegroundColor Yellow
                git status --short --untracked-files=no
                Write-Host "Continuing with the version that is already there. To drop those changes and" -ForegroundColor Yellow
                Write-Host "update anyway, run 'git stash' in that folder and run this script again." -ForegroundColor Yellow
            } else {
                git checkout -- package-lock.json 2>$null
                git fetch --quiet origin
                if ($LASTEXITCODE -ne 0) { throw "git fetch failed (exit code $LASTEXITCODE). Check your internet connection." }
                git pull --ff-only
                if ($LASTEXITCODE -ne 0) { throw "git pull failed (exit code $LASTEXITCODE)." }
            }
        } finally {
            Pop-Location
        }
    } elseif (Test-Path $InstallPath) {
        throw "$InstallPath already exists but is not a layerling checkout. Delete it, or run this script with -InstallPath pointing somewhere else."
    } else {
        Write-Step "Downloading layerling to $InstallPath..."
        git clone $RepoUrl $InstallPath
        if ($LASTEXITCODE -ne 0) { throw "git clone failed (exit code $LASTEXITCODE)." }
    }

    Push-Location $InstallPath
    try {
        Write-Step "Installing dependencies (npm install)..."
        # --no-save: install exactly what package-lock.json lists without rewriting it, so
        # a different npm version leaves no "local change" that would block the next update.
        # npm.cmd, not npm: plain "npm" makes PowerShell pick Node.js's npm.ps1, which Windows
        # refuses to run while scripts are disabled (the default on Windows 10 and 11).
        npm.cmd install --no-save
        if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit code $LASTEXITCODE)." }

        Write-Step "Creating a desktop shortcut to start layerling next time..."
        $desktopLauncher = Join-Path ([Environment]::GetFolderPath("Desktop")) "Start layerling.cmd"
        # The real logic lives in the repo (scripts\start-layerling.cmd), so later fixes arrive
        # with every update; the desktop file only points at it.
        $launcherContent = @"
@echo off
call "$InstallPath\scripts\start-layerling.cmd"
"@
        Set-Content -Path $desktopLauncher -Value $launcherContent -Encoding ASCII
        Write-Host "Double-click '$desktopLauncher' any time you want to open layerling again -" -ForegroundColor Green
        Write-Host "no PowerShell needed for that." -ForegroundColor Green

        if ($NoStart) {
            Write-Step "Setup complete. Start layerling with the desktop shortcut, or: npm run dev"
        } else {
            Write-Step "Starting layerling..."
            Write-Host "Opening http://127.0.0.1:3000/ in your browser as soon as the server is ready." -ForegroundColor Green
            Write-Host "Leave this window open while you use layerling. Press Ctrl+C here to stop it." -ForegroundColor Green
            Start-Job -ScriptBlock {
                for ($i = 0; $i -lt 90; $i++) {
                    try {
                        (New-Object Net.Sockets.TcpClient("127.0.0.1", 3000)).Close()
                        Start-Process "http://127.0.0.1:3000/"
                        break
                    } catch {
                        Start-Sleep -Seconds 1
                    }
                }
            } | Out-Null
            npm.cmd run dev -- -p 3000
        }
    } finally {
        Pop-Location
    }
}
