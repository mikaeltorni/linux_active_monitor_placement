"""Verify the public installer menu cancels without changing the temporary home."""
import os
from pathlib import Path
import pty
import select
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as directory:
    home = Path(directory) / "home"
    home.mkdir()
    env = dict(os.environ, HOME=str(home), TARGET_HOME_OVERRIDE=str(home),
               XDG_CONFIG_HOME=str(home / "config"), XDG_CACHE_HOME=str(home / "cache"),
               XDG_STATE_HOME=str(home / "state"), ISC_LOG_DIR=str(home / "log"), TERM="xterm")
    master, slave = pty.openpty()
    process = subprocess.Popen(["bash", str(root / "install.sh")], stdin=slave, stdout=slave,
                               stderr=slave, env=env, start_new_session=True)
    os.close(slave)
    data = b""
    while b"[space]" not in data and process.poll() is None:
        ready, _, _ = select.select([master], [], [], 5)
        if not ready:
            process.kill()
            raise AssertionError("installer did not open the selection menu")
        data += os.read(master, 65536)
    os.write(master, b"q")
    assert process.wait(timeout=10) == 0
    os.close(master)
    assert not (home / ".local/share/gnome-shell/extensions/active-monitor-placement@local").exists()
    assert not (home / ".local/bin/pin-window-to-active-monitor.sh").exists()
print("PASS: terminal menu cancellation does not install files")
