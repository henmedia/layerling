#!/bin/sh
# Installs everything needed to run layerling locally on a Mac, then starts it.
#
# For a Mac with nothing set up yet. Needs Git and Node.js (22.18 or newer): when one is
# missing, it says how to get it - or installs it through Homebrew when that is there -
# and stops, so you can run the same line again. Then it downloads layerling from GitHub
# into the folder "layerling" in your home folder, installs its dependencies with npm,
# puts "Start layerling" on your desktop and starts the local server.
#
# Safe to run again later: an existing copy is not downloaded a second time, and
# scripts/start-layerling.sh, which starts it, updates it first.
#
# Source: https://github.com/henmedia/layerling/blob/main/scripts/mac-quickstart.sh
# Have a look before you run a script from the internet - that link always shows the
# exact version this file describes.
#
#   curl -fsSL https://raw.githubusercontent.com/henmedia/layerling/main/scripts/mac-quickstart.sh | sh
#
# Another folder:    LAYERLING_DIR=~/3D/layerling sh mac-quickstart.sh
# Set up, do not start:  LAYERLING_NO_START=1 sh mac-quickstart.sh
# The Windows counterpart is windows-quickstart.ps1.

REPO_URL="https://github.com/henmedia/layerling.git"
INSTALL_PATH="${LAYERLING_DIR:-$HOME/layerling}"

step() {
  printf '\n==> %s\n' "$1"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

# The caller's shell stays open when this runs through "curl | sh", but a failed step
# must not go on to the next one, so every problem ends in "stop" with a reason.
stop() {
  printf '\n%s\n' "$1" >&2
  exit 1
}

echo "layerling - Mac quickstart"
echo "Gets what is missing, downloads the app, and starts it."

# A fresh Mac has a "git" that only points at the developer tools: it exists, but
# running it opens a dialog and fails. So ask it, instead of asking whether it exists.
if git --version >/dev/null 2>&1; then
  step "Git is already installed."
else
  if have brew; then
    step "Installing Git (Homebrew)..."
    brew install git || stop "Homebrew could not install Git."
  else
    # Opens the macOS dialog that offers the developer tools (which include Git).
    xcode-select --install >/dev/null 2>&1
    stop "Git is missing. macOS now offers to install the developer tools - click Install, wait until it is done, then run this line again."
  fi
fi

# An older Node.js cannot build layerling: the guide and font scripts load TypeScript
# files directly, which needs Node.js 22.18 or newer.
node_ok() {
  have node || return 1
  node -e '
    const [major, minor] = process.versions.node.split(".").map(Number);
    process.exit(major > 22 || (major === 22 && minor >= 18) ? 0 : 1);
  '
}

if node_ok; then
  step "Node.js is already installed."
else
  if have brew; then
    step "Installing Node.js (Homebrew)..."
    brew install node || stop "Homebrew could not install Node.js."
    brew upgrade node >/dev/null 2>&1
    # Homebrew puts it where this shell may not look yet.
    PATH="$(brew --prefix)/bin:$PATH"
    node_ok || stop "Node.js was installed, but this window cannot see it yet. Close the Terminal window, open a new one, and run this line again."
  else
    if have node; then
      stop "Node.js $(node --version) is too old; layerling needs 22.18 or newer. Download the current LTS from https://nodejs.org, install it, then close the Terminal window, open a new one, and run this line again."
    fi
    stop "Node.js is missing. Download the current LTS from https://nodejs.org (the macOS Installer), install it, then close the Terminal window, open a new one, and run this line again."
  fi
fi

if [ -d "$INSTALL_PATH/.git" ]; then
  step "layerling is already at $INSTALL_PATH - it is updated when it starts."
elif [ -e "$INSTALL_PATH" ]; then
  stop "$INSTALL_PATH already exists but is not a layerling checkout. Remove it, or choose another place: LAYERLING_DIR=~/somewhere/layerling"
else
  step "Downloading layerling to $INSTALL_PATH..."
  git clone "$REPO_URL" "$INSTALL_PATH" || stop "git clone failed. Check your internet connection."
fi

cd "$INSTALL_PATH" || stop "Cannot open $INSTALL_PATH."

if [ ! -d node_modules ]; then
  step "Installing dependencies (npm install)..."
  # --no-save: install exactly what package-lock.json lists without rewriting it, so
  # a different npm version leaves no "local change" that would block the next update.
  npm install --no-save || stop "npm install failed."
fi

step "Creating a shortcut on your desktop to start layerling next time..."
launcher="$HOME/Desktop/Start layerling.command"
if [ -d "$HOME/Desktop" ]; then
  # The real logic lives in the repo (scripts/start-layerling.sh), so later fixes arrive
  # with every update; the desktop file only points at it.
  printf '#!/bin/sh\nexec "%s/scripts/start-layerling.sh"\n' "$INSTALL_PATH" > "$launcher"
  chmod +x "$launcher"
  echo "Double-click 'Start layerling' on your desktop any time you want to open layerling again -"
  echo "no Terminal commands needed for that."
else
  echo "There is no Desktop folder, so no shortcut was made. Start layerling with: $INSTALL_PATH/scripts/start-layerling.sh"
fi

if [ -n "$LAYERLING_NO_START" ]; then
  step "Setup complete. Start layerling with the shortcut on your desktop, or: $INSTALL_PATH/scripts/start-layerling.sh"
else
  step "Starting layerling..."
  echo "Opening http://127.0.0.1:3000/ in your browser as soon as the server is ready."
  echo "Leave this window open while you use layerling. Press Ctrl+C here to stop it."
  exec sh "$INSTALL_PATH/scripts/start-layerling.sh"
fi
