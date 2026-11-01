# Dependency inventory

Python runtime and development packages are fully pinned in `requirements*.txt`.
The tested environment uses Python 3.12.16. All installed packages below were
checked against OSV; raw queries/results are in [dependency-audit.json](dependency-audit.json).
A check with no matching advisories is not proof of security.

| Python package | Version | Role |
| --- | --- | --- |
| annotated-doc | 0.0.5 | Framework documentation metadata |
| annotated-types | 0.8.0 | Pydantic constraint metadata |
| anyio | 4.15.1 | ASGI async primitives |
| certifi | 2026.10.23 | HTTP client CA bundle dependency |
| click | 8.5.0 | Server command-line parsing |
| fastapi | 0.162.0 | HTTP route framework |
| h11 | 0.16.0 | HTTP/1.1 protocol implementation |
| httpcore | 1.0.9 | HTTPX transport dependency |
| httpx | 0.28.1 | ASGI integration test client |
| idna | 3.20 | Internationalized hostname handling dependency |
| iniconfig | 2.3.1 | pytest configuration parser |
| opentelemetry-api | 1.45.2 | FastAPI API dependency; no exporter/SDK is configured |
| packaging | 26.3 | Version/marker parsing |
| pluggy | 1.7.0 | pytest plugin system |
| pydantic | 2.11.7 | Canonical report models |
| pydantic_core | 2.33.2 | Model validation runtime |
| Pygments | 2.21.0 | pytest code highlighting |
| pytest | 9.2.0 | Test runner |
| python-multipart | 0.0.33 | Multipart syntax after request body limits |
| scapy | 2.8.0 | Offline packet dissection and fixture construction |
| starlette | 1.10.0 | ASGI middleware, requests and responses |
| typing-extensions | 4.16.0 | Typing compatibility |
| typing-inspection | 0.4.4 | Typing introspection |
| uvicorn | 0.35.0 | Local ASGI server |

Frontend dependencies and their actual versions are recorded in
`frontend/package.json` and `frontend/pnpm-lock.yaml`: Next.js, React, React DOM,
TypeScript, Node/React type packages, Tailwind CSS, PostCSS, Autoprefixer, and
Lucide React. The installed versions Next 16.4.3 and React/React DOM 19.3.1 were checked
locally. Earlier verification reported a frozen-lock install, build/typecheck,
package audit and browser pass for the previous interface. The current interface
passes strict TypeScript, direct production build and component interaction checks.
Optional verification tools are React Test Renderer 19.3.1 and Playwright 1.63.0;
they are installed separately and are not application runtime dependencies.

SHA256/source metadata for the verified Linux CPython 3.12 wheels is retained
in [dependency-lock.json](dependency-lock.json). The wheelhouse and standalone
interpreter are local setup artifacts and are not committed. No external
inference API or API key is used by the application.
