import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export interface PythonCommand {
  executable: string;
  prefixArgs: string[];
}

function isPython3(command: PythonCommand): boolean {
  const result = spawnSync(
    command.executable,
    [...command.prefixArgs, '-c', 'import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)'],
    { stdio: 'ignore', windowsHide: true },
  );
  return !result.error && result.status === 0;
}

export function resolvePythonCommand(root: string): PythonCommand {
  const configured = process.env.PYTHON?.trim();
  if (configured) {
    const command = { executable: configured, prefixArgs: [] };
    if (isPython3(command)) return command;
    throw new Error(`Configured PYTHON is not a usable Python 3 executable: ${configured}`);
  }

  const candidates: PythonCommand[] = [];
  const venvPython = process.platform === 'win32'
    ? path.join(root, '.venv', 'Scripts', 'python.exe')
    : path.join(root, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) candidates.push({ executable: venvPython, prefixArgs: [] });

  if (process.platform === 'win32') {
    candidates.push(
      { executable: 'python', prefixArgs: [] },
      { executable: 'py', prefixArgs: ['-3'] },
      { executable: 'python3', prefixArgs: [] },
    );
  } else {
    candidates.push(
      { executable: 'python3', prefixArgs: [] },
      { executable: 'python', prefixArgs: [] },
    );
  }

  for (const candidate of candidates) {
    if (isPython3(candidate)) return candidate;
  }

  throw new Error('No usable Python 3 runtime found. Set PYTHON or create a project-local .venv.');
}
