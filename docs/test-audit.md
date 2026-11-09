# Test audit

Kept by this repo's owning session, per `~/Code/CLAUDE.md`, "Test self-audits". Newest first.

## 2026-11-09: first audit (0.1.0)

| Promise (README) | Tests (`test/maintenance.test.ts`) |
| --- | --- |
| Closed site answers 503 with Retry-After and no-store | "closes site pages with a 503…" |
| Admin and API always open | same test (admin, collections, API paths) |
| Signed-in people pass; `bypassCookie: false` lets nobody through | "lets someone signed in through…" |
| Environment forces on/off; `envVar: false` ignores it | "lets the environment force it either way", "reads only clear on/off values" |
| Open when off or never readable | "stays open when off…" |
| 10-second reuse; last answer stands on a failed read | "reuses a read…" |
| Reads `/api/globals/<slug>` with the Vercel bypass header | "reads the global over REST…" |
| Admin text shown as plain text; colours can't break out | "escapes everything…", "falls back to plain default words…" |
| Global readable by anyone, editable through `access` (default signed in); one per config | "is readable by anyone…", "adds itself once…" |

- Gaps added: none beyond the above (all written with the code).
- Gaps skipped: Payload's own global REST route and admin rendering (framework internals). A real install in a site is the next check, outside this repo.
