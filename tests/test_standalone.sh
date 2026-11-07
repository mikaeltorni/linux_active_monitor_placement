#!/usr/bin/env bash
# Check standalone discovery and rejection with a disposable home.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sandbox="$(mktemp -d)"
trap 'rm -rf "$sandbox"' EXIT
mkdir -p "$sandbox/home" "$sandbox/bin"
for command in git curl wget sudo gsettings dconf systemctl gnome-extensions; do
  printf '#!/bin/sh\nprintf "%%s\\n" "$0 $*" >> "$EFFECTS"\nexit 99\n' > "$sandbox/bin/$command"
  chmod +x "$sandbox/bin/$command"
done
export HOME="$sandbox/home" XDG_CONFIG_HOME="$sandbox/config" XDG_CACHE_HOME="$sandbox/cache" XDG_STATE_HOME="$sandbox/state" EFFECTS="$sandbox/effects" PATH="$sandbox/bin:/usr/bin:/bin"
output="$(bash "$root/install.sh" --list-components)"
[[ "$output" == *$'active_monitor_placement\t'* ]]
[[ ! -e "$EFFECTS" ]]
if bash "$root/install.sh" --select definitely_unknown >/dev/null 2>&1; then
  printf 'unknown selection accepted\n' >&2
  exit 1
fi
[[ ! -e "$EFFECTS" ]]
printf 'PASS: standalone component discovery and rejection have no effects\n'
cat > "$sandbox/bin/gsettings" <<'SH'
#!/usr/bin/env bash
if [[ "$1" == get ]]; then
  cat "$SETTINGS"
elif [[ "$1" == set ]]; then
  printf '%s\n' "$4" > "$SETTINGS"
else
  exit 1
fi
SH
cat > "$sandbox/bin/gnome-extensions" <<'SH'
#!/usr/bin/env bash
[[ "$1" == disable && "$2" == active-monitor-placement@local ]]
SH
chmod +x "$sandbox/bin/gsettings" "$sandbox/bin/gnome-extensions"
export TARGET_HOME_OVERRIDE="$HOME" SETTINGS="$sandbox/settings" ISC_LOG_DIR="$sandbox/log"
printf "['other-extension@example']\n" > "$SETTINGS"
bash "$root/install.sh" --select active_monitor_placement >/dev/null
cmp "$root/extension/extension.js" "$HOME/.local/share/gnome-shell/extensions/active-monitor-placement@local/extension.js"
cmp "$root/extension/placementPolicy.js" "$HOME/.local/share/gnome-shell/extensions/active-monitor-placement@local/placementPolicy.js"
[[ -x "$HOME/.local/bin/pin-window-to-active-monitor.sh" ]]
[[ "$(cat "$SETTINGS")" == *other-extension@example* && "$(cat "$SETTINGS")" == *active-monitor-placement@local* ]]
bash "$root/install.sh" --select active_monitor_placement >/dev/null
[[ "$(bash "$root/install.sh" --detect)" == *$'active_monitor_placement\tinstalled'* ]]
bash "$root/install.sh" --uninstall active_monitor_placement >/dev/null
[[ ! -e "$HOME/.local/bin/pin-window-to-active-monitor.sh" ]]
[[ ! -e "$HOME/.local/share/gnome-shell/extensions/active-monitor-placement@local" ]]
[[ "$(bash "$root/install.sh" --detect)" == *$'active_monitor_placement\tabsent'* ]]
printf 'PASS: isolated installation, repeat, detection, preservation and removal\n'
bash "$root/install.sh" --export-selection > "$sandbox/selection.json"
python3 -m json.tool "$sandbox/selection.json" >/dev/null
printf 'PASS: selection export is valid JSON\n'
