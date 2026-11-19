# Active Monitor Placement

Active Monitor Placement is a GNOME Shell extension that moves newly opened
windows to the monitor where the pointer was when they opened. It leaves
windows with explicit app-monitor rules in place. The repository also ships an
X11 helper for moving an existing window to the monitor under the pointer.

## Install

Run `bash install.sh` from this checkout as the desktop user. The installer
uses the bundled, MIT-licensed framework and needs Bash, Python 3, and the GNOME
settings tools. The extension declares support for GNOME Shell 45–50.
The installer deploys the extension and enables its UUID
`active-monitor-placement@local` while preserving the other enabled extensions.
GNOME may need to pick up the new extension at the next session start.

| Command | Behavior |
| --- | --- |
| `bash install.sh` | Open the terminal selection menu, or use defaults without a terminal. |
| `bash install.sh --list-components` | List the `active_monitor_placement` component and its default state. |
| `bash install.sh --select active_monitor_placement` | Install the extension and helper. |
| `bash install.sh --default`, `bash install.sh --all` | Install the component without opening the menu. |
| `bash install.sh --detect` | Show whether the owned extension and helper files are present. |
| `bash install.sh --reconfigure active_monitor_placement` | Reapply installation. |
| `bash install.sh --uninstall active_monitor_placement` | Disable the extension and remove its files and helper. |
| `bash install.sh --export-selection` | Print the resolved selection as JSON. |
| `bash install.sh --help` | List shared installer flags, including configuration and advanced discovery. |

Use `--config NAME` with a selection preset supplied to the shared installer.
The component has no nested configuration screen. The shared installer also
accepts `--auth`; the default installation requires no authenticated downloads.
For framework development, set `ISC_COMPONENT_LIB_DIR` or `ISC_FUNCTIONS_DIR`
to a compatible checkout.

The installed `~/.local/bin/pin-window-to-active-monitor.sh [WINDOW_ID]` helper
uses `xdotool` and `xrandr` on X11. Without an ID it uses the focused window.

## Verify

Run `bash tests/test_standalone.sh` and `python3 tests/test_menu_cancel.py` to
check setup and cancellation with an isolated home. Run the placement-policy
tests with Node.js.

```bash
ACTIVE_MONITOR_POLICY_JS="$PWD/extension/placementPolicy.js" \
  node --experimental-default-type=module tests/test_placement_policy.mjs
```

[MIT license](LICENSE.md) · [Disclaimer](DISCLAIMER.md) · [Provenance](PROVENANCE.md)
