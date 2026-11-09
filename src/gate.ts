import { DEFAULT_SLUG } from './index.js'
import { renderPage, type PageContent, type PageTheme } from './page.js'

/**
 * The request side, for a Next.js proxy (middleware). It doesn't import Payload:
 * it reads the Maintenance global over the site's own REST API, cached for a few
 * seconds per server instance.
 *
 *   const gate = maintenanceGate({ brand: 'My Site' })
 *   export async function proxy(request) {
 *     const closed = await gate(request)
 *     if (closed) return closed
 *     ...
 *   }
 *
 * Your proxy's matcher must skip the admin and the API (the gate also skips
 * them itself, so it can never call itself in a loop).
 */
export type GateOptions = {
  /** Global slug, if you changed it in the plugin. */
  slug?: string
  /** Payload's API route. Default `/api`. */
  apiRoute?: string
  /** Payload's admin route. Default `/admin`. */
  adminRoute?: string
  /** Paths that always stay open, by prefix (for example `/healthz`). The admin and API always do. */
  openPaths?: string[]
  /** Environment variable that overrides the admin switch: `on` closes the site, `off` opens it, anything else defers to the switch. Default `SITE_MAINTENANCE`; `false` to ignore the environment. */
  envVar?: string | false
  /** Cookie whose presence lets someone through (they're signed in). Default Payload's `payload-token`; `false` to let nobody through. Presence only: this is a convenience, not access control. */
  bypassCookie?: string | false
  /** How long a read of the switch is reused, in seconds. Default 10. */
  cacheSeconds?: number
  /** `Retry-After` header, in seconds. Default 3600. */
  retryAfterSeconds?: number
  /** Brand line above the heading, and page language. */
  brand?: string
  lang?: string
  theme?: PageTheme
  /** Your own reader of the switch instead of the REST call (for tests, or a different store). */
  read?: (origin: string) => Promise<MaintenanceState | null>
  /** Environment to read the override from. Default `process.env`. */
  env?: Record<string, string | undefined>
}

export type MaintenanceState = { enabled?: boolean | null } & Pick<PageContent, 'heading' | 'message' | 'backAround'>

type RequestLike = {
  url: string
  method?: string
  cookies?: { get(name: string): { value: string } | undefined }
  headers?: { get(name: string): string | null }
}

const ON = new Set(['on', 'true', '1', 'yes'])
const OFF = new Set(['off', 'false', '0', 'no'])

/** `true`/`false` when the environment forces the switch, `null` when it leaves it to the admin. */
export function envOverride(value: string | undefined): boolean | null {
  const v = (value ?? '').trim().toLowerCase()
  return ON.has(v) ? true : OFF.has(v) ? false : null
}

function cookieValue(request: RequestLike, name: string): string | undefined {
  const direct = request.cookies?.get(name)?.value
  if (direct !== undefined) return direct
  const header = request.headers?.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return undefined
}

/** Builds the gate. Returns a function that answers a closed site's request, or `null` to let it through. */
export function maintenanceGate(options: GateOptions = {}) {
  const slug = options.slug ?? DEFAULT_SLUG
  const api = (options.apiRoute ?? '/api').replace(/\/$/, '')
  const admin = (options.adminRoute ?? '/admin').replace(/\/$/, '')
  const open = [api, admin, ...(options.openPaths ?? [])]
  const envVar = options.envVar === undefined ? 'SITE_MAINTENANCE' : options.envVar
  const bypass = options.bypassCookie === undefined ? 'payload-token' : options.bypassCookie
  const ttl = (options.cacheSeconds ?? 10) * 1000
  let cached: { at: number; state: MaintenanceState | null } | null = null

  const readRest = async (origin: string): Promise<MaintenanceState | null> => {
    const headers: Record<string, string> = { accept: 'application/json' }
    // Vercel Deployment Protection refuses a deployment's own requests unless they carry its automation bypass.
    const vercelBypass = (options.env ?? process.env).VERCEL_AUTOMATION_BYPASS_SECRET
    if (vercelBypass) headers['x-vercel-protection-bypass'] = vercelBypass
    const res = await fetch(`${origin}${api}/globals/${encodeURIComponent(slug)}?depth=0`, { headers, cache: 'no-store' })
    if (!res.ok) throw new Error(`maintenance switch: HTTP ${res.status}`)
    return (await res.json()) as MaintenanceState
  }

  /**
   * Reads the switch, reusing a recent answer. If a read fails, the last answer
   * stands; with none yet, the site stays open (maintenance is a courtesy page,
   * not a security control, so an outage of the API shouldn't close the site).
   */
  async function state(origin: string): Promise<MaintenanceState | null> {
    if (cached && Date.now() - cached.at < ttl) return cached.state
    try {
      const s = await (options.read ?? readRest)(origin)
      cached = { at: Date.now(), state: s }
      return s
    } catch {
      if (cached) {
        cached = { at: Date.now(), state: cached.state }
        return cached.state
      }
      return null
    }
  }

  return async function gate(request: RequestLike): Promise<Response | null> {
    const url = new URL(request.url)
    if (open.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return null
    const forced = envVar ? envOverride((options.env ?? process.env)[envVar]) : null
    if (forced === false) return null
    if (bypass && cookieValue(request, bypass)) return null
    const s = forced === true ? await state(url.origin).then((x) => x ?? {}) : await state(url.origin)
    if (forced !== true && !s?.enabled) return null
    const html = renderPage({ brand: options.brand, lang: options.lang, heading: s?.heading, message: s?.message, backAround: s?.backAround }, options.theme)
    return new Response(request.method === 'HEAD' ? null : html, {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'retry-after': String(options.retryAfterSeconds ?? 3600),
        'cache-control': 'no-store',
      },
    })
  }
}
