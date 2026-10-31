"""Run both local services and clean up only the process groups we create."""
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def check_port(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.bind(('127.0.0.1', port))
    except OSError:
        raise SystemExit(f'Port {port} is occupied or unavailable. Stop your previous local server before running ./run.sh dev. No existing process was changed.')


def stop_processes(processes):
    # Each process starts a new session, so pnpm/Uvicorn children are included.
    # Never use a port-based kill or signal a process group we did not create.
    for process in processes:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    deadline = time.monotonic()+3
    while any(p.poll() is None for p in processes) and time.monotonic() < deadline:
        time.sleep(.05)
    for process in processes:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=2)


def main():
    if shutil.which('pnpm') is None:
        raise SystemExit('pnpm is required for the Next.js interface. Install it, then run ./run.sh setup.')
    if not (ROOT/'frontend/node_modules/next/package.json').is_file():
        raise SystemExit('Frontend dependencies are missing. Run ./run.sh setup first.')
    check_port(8000)
    check_port(3000)
    processes = []

    def interrupt(_signal, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupt)
    try:
        processes.append(subprocess.Popen([sys.executable,'-m','uvicorn','backend.app:app','--host','127.0.0.1','--port','8000','--reload','--reload-dir',str(ROOT/'backend')],cwd=ROOT,start_new_session=True))
        processes.append(subprocess.Popen(['pnpm','dev'],cwd=ROOT/'frontend',start_new_session=True))
        print('CausalPacket: http://localhost:3000 | API: http://127.0.0.1:8000',flush=True)
        print('Ctrl+C stops both services started by this launcher.',flush=True)
        while all(p.poll() is None for p in processes):
            time.sleep(.1)
        print('A service exited; stopping this launcher’s remaining service.',file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 0
    finally:
        stop_processes(processes)


if __name__ == '__main__':
    raise SystemExit(main())
