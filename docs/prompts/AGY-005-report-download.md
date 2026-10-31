# AGY 005 — Download the real investigation report

```text
Continue in /home/arpit/cybersecHackathon. AGY-004 is complete.
Codex has implemented metadata-only Markdown/JSON report exports and readable
CLI reports. The canonical report types remain unchanged. Connect the existing
export endpoint to the Next.js interface; do not implement new diagnosis logic.

OWNERSHIP
Edit frontend/** EXCEPT frontend/lib/types.ts and frontend/fixtures/**.
Do not edit backend/**, scripts/**, tests/**, docs/**, root configs, or README.
Keep the patched Next/React versions and all existing behavior intact.

IMPLEMENT
- Add a compact report-download control for the currently displayed REAL
  AnalysisReport. Offer “Download report (.md)” and “Download data (.json)”.
- Add a typed adapter in frontend/lib/api.ts:
  GET /api/analyses/{analysis_id}/export?format=markdown
  GET /api/analyses/{analysis_id}/export?format=json
  Success returns file bytes, NOT a JSON-wrapped download URL. Use Blob and
  Content-Disposition's suggested filename if safely available, or a safe
  filename based on the analysis_id and selected extension.
- Backend Markdown contains explanations, hypotheses, measurements, comparisons,
  exact frames, association reasons, context changes, remaining problems,
  coverage limits, and a retained-header evidence table. Render that content
  as a download; do not invent another report or classify anything locally.
- Downloaded JSON is the actual current analysis report, including context.
- The export response uses Cache-Control:no-store and X-Content-Type-Options:
  nosniff. Backend expires metadata sessions after 30 minutes/eviction.
- Parse the usual structured error envelope for 410/422/etc. Preserve the
  current report and provenance on errors. Support AbortSignal and release
  any temporary object URL after initiating download.
- Enable export only when report.data_origin==='capture'. A fixture must not
  download as evidence of real analysis. Use a clear disabled preview state.
- Keep visible scope clear: exports include IP/MAC header metadata, not raw
  application payloads. A brief inline explanation/tooltip is enough; do not
  add a permission modal, signup, cloud share, PDF library, or new service.
- Keep keyboard accessibility, loading states, and narrow-view layout intact.
- Applying context must export the updated interpretation and retained facts,
  not a stale previous version or a preview. Abort/guard a download when the
  selected analysis changes mid-request, consistent with existing race guards.

FINAL REVIEW NOTE (current ReportExport.tsx draft)
- The component currently aborts only when another download starts. Add cleanup
  when the report object changes or the component unmounts. Context replay can
  keep the same analysis_id, so an ID-only dependency/key is insufficient.
- After awaiting the response, check cancellation/current request generation
  before creating an object URL, clicking a download, reporting errors, or
  updating feedback. An older finally block must not clear a newer spinner.
- Clear feedback timers on report change/unmount. Revoke every object URL even
  if starting the browser download fails. Say “Download started”; the browser
  cannot establish that the operator saved the file.
- Accept only a basename with the expected .md/.json extension from the server
  filename; otherwise use a sanitized analysis-ID fallback.
- Verify a deliberately delayed export while switching samples AND applying
  gateway context: neither stale download nor stale success/error may appear.

VERIFICATION
1. With servers OFF, run pnpm typecheck and pnpm build.
2. Start exactly one pair only for browser verification: ./run.sh api, then
   cd frontend && pnpm dev. Ports 8000/3000, no duplicate tasks.
3. Service failure: download both formats. JSON matches the displayed live
   analysis ID and 12 refusals; Markdown has facts, next checks and frame IDs.
4. Gateway: apply the sample inventory, approve the second MAC, download again.
   Assessment is unresolved and the remaining DNS/TCP problems are present;
   all original observations/evidence still match the real live report.
5. Healthy and truncated: exports preserve honest empty/partial coverage.
6. Preview: export is disabled or explicitly unavailable; it never calls the
   live export endpoint using a fixture analysis ID.
7. Expired/deleted session: show readable error, preserving the report view.
8. No browser console errors; keyboard/narrow-view controls work.
9. STOP both verification servers and confirm no background project tasks remain.

HANDOFF
Changed files, build/typecheck results, browser/download checks actually run,
downloaded artifact paths if available, and server cleanup status. Stop after
this chunk. No visual redesign or additional detector features.
```
