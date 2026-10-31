"""Read-only local setup check; never prints environment values or secrets."""
from importlib.metadata import PackageNotFoundError, version
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    failures = []
    print(f'Python {sys.version.split()[0]}')
    if sys.version_info < (3,12):
        failures.append('Python 3.12+ is required by the patched dependency set.')
    for line in (ROOT/'requirements-dev.txt').read_text().splitlines()+(ROOT/'requirements.txt').read_text().splitlines():
        if '==' not in line or line.startswith(('#','-')):
            continue
        name, expected = line.split('==',1)
        try:
            installed = version(name)
            if installed != expected:
                failures.append(f'{name}: expected {expected}, found {installed}')
        except PackageNotFoundError:
            failures.append(f'{name} is not installed.')
    for name in ('node','pnpm'):
        if shutil.which(name) is None:
            failures.append(f'{name} is not installed or on PATH.')
    if shutil.which('node'):
        node_version=subprocess.run(['node','--version'],capture_output=True,text=True,check=True).stdout.strip()
        major,minor=map(int,node_version.lstrip('v').split('.')[:2])
        print('Node '+node_version)
        if (major,minor)<(20,9):
            failures.append('Node 20.9+ is required by the patched Next.js version.')
    package_path=ROOT/'frontend/package.json'
    if package_path.is_file():
        expected=json.loads(package_path.read_text()).get('dependencies',{})
        for name in ('next','react','react-dom'):
            installed_path=ROOT/'frontend/node_modules'/name/'package.json'
            if not installed_path.is_file():
                failures.append(f'Frontend {name} is not installed.')
            elif expected.get(name)!=json.loads(installed_path.read_text())['version']:
                failures.append(f'Frontend {name} does not match its exact version pin; run frozen-lockfile install.')
    if not (ROOT/'frontend/pnpm-lock.yaml').exists():
        failures.append('Frontend package lock is missing.')
    manifest_path=ROOT/'samples/manifest.json'
    if not manifest_path.exists():
        failures.append('Generate the included sample captures: ./run.sh samples')
    else:
        manifest=json.loads(manifest_path.read_text())
        for filename in manifest['scenarios']:
            if not (ROOT/'samples'/filename).is_file():
                failures.append(f'Sample is missing: {filename}')
    if failures:
        for problem in failures:
            print('FAIL:',problem)
        return 1
    print('PASS: pinned Python dependencies, Node/pnpm commands, frontend lock, and all sample files.')
    print('Run ./run.sh check for behavioral tests and frontend compilation.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
