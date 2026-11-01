# Deploy the demo: Render + Vercel

Use one repository with two deployments. Next.js runs on Vercel; the Python API
and resource-limited workers run on Render. Browser requests go directly to the
Render API, including uploads. Do not proxy 25 MiB uploads through a Vercel
Function: its request-body limit is 4.5 MB.

Push the latest hosting-config commit before importing the repository. There is
also an optional [Render Blueprint](../render.yaml) with the same settings below.

## Render API

In Render, choose **New → Web Service**, connect the GitHub repository and set:

| Setting | Value |
| --- | --- |
| Name | `causalpacket-api` or another available service name |
| Branch | `main` |
| Root Directory | Leave blank: use the repository root, **not** `backend/` |
| Language/runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn backend.app:app --host 0.0.0.0 --port $PORT --workers 1` |
| Health Check Path | `/api/health` |
| Instance count | One; session metadata is process-local |

Environment variables:

| Key | Value |
| --- | --- |
| `PYTHON_VERSION` | `3.12.16` |
| `CAUSALPACKET_ALLOWED_ORIGINS` | Your actual Vercel production origin, e.g. `https://your-project.vercel.app` |
| `CAUSALPACKET_LAB_TIMEOUT_SECONDS` | `60` for the slower demo instance; default locally is `20` |

The origin is the frontend URL only: no `/api`, wildcard or credentials. Multiple
approved origins can be comma-separated. A trailing `/` is normalized. The same
allowlist configures both CORS and POST validation; setting only one would break
browser requests. Vercel preview URLs must be explicitly added if you use them.

Deploy, then open the actual Render service URL followed by `/api/health`.
It should return `status: "ok"` and `engine_ready: true`. `/api/samples` should
list nine available captures. The Python start command, root directory and
committed `samples/` files are necessary for that to work.

## Vercel frontend

Import the same repository with framework **Next.js**, Root Directory
**`frontend`**, install `pnpm install --frozen-lockfile`, and build `pnpm build`.

Set **`NEXT_PUBLIC_API_BASE_URL`** to the actual Render HTTPS origin, without a
trailing `/` or `/api`, e.g. `https://your-api.onrender.com`. This value is public
and baked into the frontend build. Redeploy Vercel after changing it.

Once Vercel assigns the production URL, put that exact origin into Render's
`CAUSALPACKET_ALLOWED_ORIGINS`, then redeploy/restart Render. The services can be
created in either order; finish both URL settings before testing the interface.

## Verify the hosted flow

1. Check API Online, nine samples, and service-failure diagnosis.
2. Check gateway inventory/approval/reset and unchanged packet evidence.
3. Run the synthetic evidence lab and download both report formats.
4. Verify a malformed/synthetic upload and partial capture handling.

Hosted uploads leave the user's device. The interface identifies remote API
processing; use authorized or synthetic captures for the public demonstration.
The default application is a bounded hackathon prototype, not an authenticated
multi-tenant service. CORS is an origin policy, not authentication. Report sessions
are shared, bounded and temporary; restarting the instance loses them.

Render Free instances spin down after 15 idle minutes and can take about a minute
to start again. Its CPU is limited, so the lab's overall deadline can be set to
60 seconds; individual worker budgets remain unchanged. Large captures can still
reach a controlled limit. Keep the included demo/local setup available to judges.
No persistent disk or database is needed for the intended temporary sessions.

References: [Render FastAPI](https://render.com/docs/deploy-fastapi),
[Python version selection](https://render.com/docs/python-version),
[Render free-service limits](https://render.com/docs/free),
[Vercel function limits](https://vercel.com/docs/functions/limitations).
