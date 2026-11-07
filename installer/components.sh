#!/usr/bin/env bash
# Component lifecycle for the active-monitor extension and helper.
ISC_REPO_NAME="linux_active_monitor_placement"
ISC_REPO_LABEL="Active monitor window placement"
ISC_COMPONENTS=("active_monitor_placement|Place new windows on the active monitor|on|amp_install|amp_detect|amp_uninstall")

# Deploy the extension and helper to the selected desktop user's home.
# Parameters: none. Returns: zero on success, nonzero on failure.
amp_install() {
  printf 'parameters=none\n' >&2
  local destination="$TARGET_HOME/.local/share/gnome-shell/extensions/active-monitor-placement@local" file enabled updated
  run_as_target install -d -m 0755 "$destination" "$TARGET_HOME/.local/bin" || { printf "1\n" >&2; return 1; }
  for file in extension.js metadata.json placementPolicy.js; do
    run_as_target install -m 0644 "$SCRIPT_DIR/extension/$file" "$destination/$file" || { printf "1\n" >&2; return 1; }
  done
  run_as_target install -m 0755 "$SCRIPT_DIR/scripts/pin-window-to-active-monitor.sh" "$TARGET_HOME/.local/bin/pin-window-to-active-monitor.sh" || { printf "1\n" >&2; return 1; }
  enabled="$(run_as_target gsettings get org.gnome.shell enabled-extensions)" || { printf "1\n" >&2; return 1; }
  updated="$(python3 - "$enabled" <<'PY'
import ast
import json
import sys
items = ast.literal_eval(sys.argv[1].removeprefix('@as '))
name = 'active-monitor-placement@local'
if name not in items:
    items.append(name)
print(json.dumps(items))
PY
)" || { printf "1\n" >&2; return 1; }
  run_as_target gsettings set org.gnome.shell enabled-extensions "$updated" || { printf "1\n" >&2; return 1; }
  printf '0\n' >&2
  return 0
}

# Report whether both installed artifacts are present.
# Parameters: none. Returns: zero when present, nonzero otherwise.
amp_detect() {
  printf 'parameters=none\n' >&2
  if [[ -f "$TARGET_HOME/.local/bin/pin-window-to-active-monitor.sh" && -f "$TARGET_HOME/.local/share/gnome-shell/extensions/active-monitor-placement@local/placementPolicy.js" ]]; then
    printf '0\n' >&2
    return 0
  fi
  printf '1\n' >&2
  return 1
}

# Disable the extension and remove the artifacts owned by this component.
# Parameters: none. Returns: zero on success, nonzero on failure.
amp_uninstall() {
  printf 'parameters=none\n' >&2
  run_as_target gnome-extensions disable active-monitor-placement@local || { printf "1\n" >&2; return 1; }
  run_as_target rm -f "$TARGET_HOME/.local/bin/pin-window-to-active-monitor.sh" || { printf "1\n" >&2; return 1; }
  run_as_target rm -rf "$TARGET_HOME/.local/share/gnome-shell/extensions/active-monitor-placement@local" || { printf "1\n" >&2; return 1; }
  printf '0\n' >&2
  return 0
}
