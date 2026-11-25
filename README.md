# Active Monitor Placement — GNOME multi-monitor window placement

Active Monitor Placement is a GNOME multi-monitor window placement extension for users who
want new windows to open on the display under the pointer.

[![Last commit](https://img.shields.io/github/last-commit/mikaeltorni/linux_active_monitor_placement)](https://github.com/mikaeltorni/linux_active_monitor_placement/commits/feat/linux_active_monitor_placement_standalone-placement)
[![Commit activity](https://img.shields.io/github/commit-activity/m/mikaeltorni/linux_active_monitor_placement)](https://github.com/mikaeltorni/linux_active_monitor_placement/graphs/commit-activity)
[![Issues](https://img.shields.io/github/issues/mikaeltorni/linux_active_monitor_placement)](https://github.com/mikaeltorni/linux_active_monitor_placement/issues)

[Installation](#install) · [Verification](#verify) · [MIT license](LICENSE.md)

[Linux Workspaces Setup](https://github.com/mikaeltorni/linux_workspaces_setup) manages explicit app-to-monitor rules. [Linux Monitor & Window Hotkeys](https://github.com/mikaeltorni/linux_monitor_window_hotkeys) moves an existing window using shortcuts.

## Quick start

Run as the desktop user with GNOME Shell, Bash, Python 3, and the GNOME settings tools.

```bash
bash install.sh --list-components
bash install.sh --select active_monitor_placement
bash install.sh --detect
```

The Ubuntu 24.04.5 GNOME 46 X11 workstation VM detected the installed extension and confirmed it was active.

Window rules with an explicit monitor take precedence. The X11 helper moves an existing window to the monitor under the pointer.

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

## GNOME multi-monitor window placement FAQ

### Which monitor gets a newly opened window?

The extension considers the monitor under the pointer when the window opens. Existing explicit app-to-monitor rules take precedence.

### Can I move an existing window with the same installer?

Yes. The installer deploys `~/.local/bin/pin-window-to-active-monitor.sh` for X11. Omit the ID to use the focused window.

### What do I need for the X11 helper?

The helper uses `xdotool` and `xrandr` in an X11 session. The GNOME Shell extension handles new-window placement separately.

### How do I check that the extension files were installed?

Run `bash install.sh --detect` from the checkout. It reports the status of the `active_monitor_placement` component.

### What does uninstall remove?

Run `bash install.sh --uninstall active_monitor_placement` to disable and remove the extension and its installed helper. This is the reverse of the selected component’s deployment.
