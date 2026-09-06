from __future__ import annotations

import os
import sys


def chromium_launch_options() -> dict[str, object]:
    options: dict[str, object] = {
        "headless": True,
        "args": ["--no-sandbox", "--disable-dev-shm-usage"],
    }
    configured = os.environ.get("CHROMIUM_EXECUTABLE")
    if configured:
        options["executable_path"] = configured
    elif sys.platform.startswith("linux"):
        # Preserve the validated Linux rendering path. On Windows/macOS,
        # Playwright uses its managed Chromium when no override is supplied.
        options["executable_path"] = "/usr/bin/chromium"
    return options
