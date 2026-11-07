#!/usr/bin/env bash
# Install the active-monitor placement extension and its X11 helper.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_USER="${SUDO_USER:-${TARGET_USER:-$USER}}"
TARGET_HOME="${TARGET_HOME_OVERRIDE:-$(getent passwd "$TARGET_USER" | cut -d: -f6)}"
RUNTIME_DIR="/run/user/$(id -u "$TARGET_USER")"
USER_BUS="unix:path=$RUNTIME_DIR/bus"
DISPLAY_VAL="${DISPLAY:-:0}"
source "$SCRIPT_DIR/.installer-support/bootstrap.sh"
isc_load_helpers
isc_activate_components
source "$SCRIPT_DIR/installer/components.sh"
component_main "$@"
