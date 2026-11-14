# Test audit

Newest first.

## 2026-11-11: the default closes to admin users only

Suite: 11 tests before, 12 after (`npx vitest run`, unit tests with fake requests; no Payload instance).

- **The change.** `access` unset now means `adminUsersOnly`: the signed-in user's `collection` must equal `req.payload.config.admin.user`. It returns exactly `true` or `false`. A member of a second auth collection, nobody signed in, a user with no collection, and a request with no admin collection to compare with are all refused.
- **Tests.** "lets only users of the admin collection close the site by default…": member refused, admin allowed, a renamed admin collection (`staff`) honored, `users` refused when the admin collection is `staff`, no user / no collection / no config refused, and the plugin's own global uses the same default.
- **Mutation checks.** 3, each a Python string replace restored byte for byte (SHA-256 checked); all 3 fail the suite: the old any-signed-in default; the collection comparison dropped; a missing `admin.user` treated as `users`.
- **Skipped.** A site-supplied `access` is documented as a Payload `Access` that may return a query and goes to Payload unchanged, so the exact-`true` and throw cases belong to Payload's own handling, not this plugin. Payload's global REST route is framework internals; the default wasn't checked in a running Payload admin.

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
