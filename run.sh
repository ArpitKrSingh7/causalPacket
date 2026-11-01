#!/usr/bin/env bash
set -euo pipefail

CP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$CP_ROOT"
CP_ENV="$CP_ROOT/.venv-hardened"
CP_COMMAND="${1:-dev}"
if (($#)); then shift; fi

require_environment() {
  if [[ ! -x "$CP_ENV/bin/python" ]]; then
    echo "Run ./run.sh setup first (Python 3.12+ is required)." >&2
    exit 1
  fi
}

case "$CP_COMMAND" in
  setup)
    CP_PYTHON="${CAUSALPACKET_PYTHON:-}"
    if [[ -z "$CP_PYTHON" ]]; then
      if [[ -x "$CP_ROOT/.artifacts/python/bin/python3.12" ]]; then
        CP_PYTHON="$CP_ROOT/.artifacts/python/bin/python3.12"
      elif command -v python3.12 >/dev/null 2>&1; then
        CP_PYTHON="$(command -v python3.12)"
      else
        CP_PYTHON="$(command -v python3 || true)"
      fi
    fi
    if [[ -z "$CP_PYTHON" ]] || ! "$CP_PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3,12) else 1)'; then
      echo "Install Python 3.12+ (for example: uv python install 3.12), or set CAUSALPACKET_PYTHON to its executable." >&2
      exit 1
    fi
    if [[ ! -x "$CP_ENV/bin/python" ]]; then
      "$CP_PYTHON" -m venv "$CP_ENV"
    fi
    if [[ -n "${CAUSALPACKET_WHEELHOUSE:-}" ]]; then
      "$CP_ENV/bin/python" -m pip install --no-cache-dir --no-index --find-links "$CAUSALPACKET_WHEELHOUSE" -r requirements-dev.txt
    else
      "$CP_ENV/bin/python" -m pip install --no-cache-dir -r requirements-dev.txt
    fi
    "$CP_ENV/bin/python" -m scripts.generate_samples
    if [[ "${1:-}" != "--backend-only" ]]; then
      (cd frontend && pnpm install --frozen-lockfile)
    fi
    echo "Setup complete. Start with ./run.sh dev; verify with ./run.sh check."
    ;;
  api)
    require_environment
    exec "$CP_ENV/bin/python" -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend "$@"
    ;;
  dev)
    require_environment
    exec "$CP_ENV/bin/python" -m scripts.dev
    ;;
  samples)
    require_environment
    exec "$CP_ENV/bin/python" -m scripts.generate_samples
    ;;
  verify-demo)
    require_environment
    exec "$CP_ENV/bin/python" -m scripts.verify_demo "$@"
    ;;
  record-demo)
    require_environment
    exec node scripts/record_demo.cjs "$@"
    ;;
  package)
    require_environment
    exec "$CP_ENV/bin/python" -m scripts.package_submission "$@"
    ;;
  cli)
    require_environment
    exec "$CP_ENV/bin/python" -m backend.cli "$@"
    ;;
  check)
    require_environment
    "$CP_ENV/bin/python" -m pytest -q
    "$CP_ENV/bin/python" -m scripts.check_contract
    (cd frontend && pnpm typecheck && pnpm build)
    ;;
  doctor)
    require_environment
    exec "$CP_ENV/bin/python" -m scripts.doctor
    ;;
  help|-h|--help)
    echo "CausalPacket: ./run.sh setup | dev | api | samples | cli CAPTURE [--json|--markdown] | verify-demo | record-demo | package | check | doctor"
    echo "setup --backend-only preserves an independently managed frontend installation."
    echo "CAUSALPACKET_PYTHON selects Python 3.12+; CAUSALPACKET_WHEELHOUSE enables offline Python setup."
    ;;
  *)
    echo "Unknown command: $CP_COMMAND. Run ./run.sh help." >&2
    exit 2
    ;;
esac
