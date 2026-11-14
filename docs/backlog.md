# Backlog

Newest first. Not promised; each needs a decision before building.

- **Verified bypass (audit, 2026-11-09).** Today the gate lets anyone with a `payload-token` cookie through by its presence alone, so anyone can set that cookie and see the closed pages (the site's own access rules still apply to their data). An option to let only verified staff through: verify the session with the site (a cached check against the users collection's `me` endpoint) and optionally require a role. Keep presence-only as the default, since it needs no API call.
