# payload-plugin-maintenance

Maintenance mode for Payload: close a site with a back-soon page and HTTP 503 from an admin switch, while the admin, API and signed-in staff keep working.

**Status:** early (0.2.0). From 0.2.0 it is published as `@extantape/payload-plugin-maintenance`; the earlier package name is deprecated in its favor. Unit tests cover the page, the global's access and the gate (switch, environment override, sign-in bypass, cache, failed reads, the Vercel protection header). The same approach already runs on a live site as a hand-written switch; this package hasn't been installed in a real site yet.

## What it does

- Adds a **Maintenance** global to the admin: a "Close the site" checkbox, a heading, a message and an optional "Expected back" line.
- Gives you a gate for your Next.js proxy (middleware). While the site is closed, every page answers one small page with HTTP 503 and `Retry-After`, so search engines treat it as temporary. Nothing is cached, so reopening shows at once.
- The admin and the API always stay open: you can sign in and reopen, and webhooks and crons keep running.
- Anyone signed in (Payload's session cookie) still sees the site, so staff can check it before reopening. That's a convenience, not access control: the cookie's presence is enough, and your pages enforce their own access as usual. Turn it off with `bypassCookie: false`.
- An environment variable (`SITE_MAINTENANCE=on` or `off`) overrides the switch, for when the admin itself is down or you want a deploy to start closed.
- The page has light and dark colours, no scripts and no outside requests. Everything typed in the admin is shown as plain text.

Limits:

- The switch is read over your site's REST API and reused for 10 seconds per server instance, so a change can take that long to show everywhere.
- If the switch can't be read, the last answer stands; if it has never been read, the site stays open. Maintenance is a courtesy page, not a security control, so an API outage shouldn't close the site.
- One switch per deployment. A multi-tenant site closes every tenant together.
- On Vercel with Deployment Protection, the gate's request to its own API is refused unless "Protection Bypass for Automation" is on; the gate sends `VERCEL_AUTOMATION_BYPASS_SECRET` when it exists.

## On its own, and with others

**On its own:** Maintenance needs only Payload and a Next.js proxy. It adds one global and a gate, and reads the switch over your site's own API.

**Works with:** any plugin, since it doesn't touch their collections or routes. The admin and API stay open while the site is closed, so other plugins' webhooks and scheduled jobs keep running. Nothing in it is built for one plugin in particular.

**Family:** Maintenance has no family on purpose: it sits beside every plugin. The families are a working draft, and Fulfillment is due to be split.

## Install

```bash
npm install @extantape/payload-plugin-maintenance
```

```ts
// payload.config.ts
import { maintenance } from '@extantape/payload-plugin-maintenance'

export default buildConfig({
  // ...
  plugins: [maintenance({ access: ({ req }) => req.user?.role === 'admin' })],
})
```

```ts
// src/proxy.ts (Next.js 16; middleware.ts on older versions)
import { maintenanceGate } from '@extantape/payload-plugin-maintenance/gate'

const gate = maintenanceGate({ brand: 'My Site' })

export async function proxy(request: NextRequest) {
  const closed = await gate(request)
  if (closed) return closed
  // ...the rest of your proxy
}

export const config = { matcher: ['/((?!admin|api|_next|favicon.ico).*)'] }
```

## Access

`access` decides who can close and reopen the site and edit the page. It's a Payload `Access` function and goes to Payload as the global's `update` access as it is.

With no `access`, only users of your admin collection (`admin.user` in your Payload config, usually `users`) can change it. Anyone signed in through another auth collection, such as site members, is refused, and so is everyone if the config names no admin collection. Reading the global stays open to anyone: it holds nothing private.

**Changed 2026-11-11 (unreleased):** the default used to let any signed-in account change the switch, members of other auth collections included. Sites relying on the old default must pass the option, for example `access: ({ req }) => Boolean(req.user)`.

Gate options: `slug`, `apiRoute`, `adminRoute`, `openPaths`, `envVar`, `bypassCookie`, `cacheSeconds`, `retryAfterSeconds`, `brand`, `lang`, `theme` (light and dark colours), and `read` to supply your own reader.

## Commands

```bash
npm test          # Vitest
npm run typecheck
npm run build     # dist/
```

Releasing: see `RELEASING.md`.

## License

MIT
