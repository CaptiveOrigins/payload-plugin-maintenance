import { afterEach, describe, expect, it, vi } from 'vitest'

import { maintenance, maintenanceGlobal, renderPage } from '../src/index.js'
import { envOverride, maintenanceGate, type MaintenanceState } from '../src/gate.js'

const ORIGIN = 'https://site.example'
const req = (path: string, init: { cookie?: string; method?: string } = {}) => ({
  url: `${ORIGIN}${path}`,
  method: init.method ?? 'GET',
  headers: new Headers(init.cookie ? { cookie: init.cookie } : {}),
})
const reader = (state: MaintenanceState | null | Error) => vi.fn(async () => {
  if (state instanceof Error) throw state
  return state
})

afterEach(() => vi.useRealTimers())

describe('the page', () => {
  it('escapes everything it is given and never renders HTML from the admin', () => {
    const html = renderPage({ brand: 'A & B', heading: '<script>x</script>', message: 'One\n\nTwo "quoted"', backAround: 'Monday' })
    expect(html).toContain('A &amp; B')
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('<p>One</p>')
    expect(html).toContain('<p>Two &quot;quoted&quot;</p>')
    expect(html).toContain('Expected back: Monday')
  })

  it('falls back to plain default words and refuses colours that could break out of the style', () => {
    const html = renderPage({}, { light: { background: 'red;}</style><script>' } })
    expect(html).toContain('We’re getting things ready')
    expect(html).not.toContain('</style><script>')
    expect(html).toContain('lang="en"')
  })
})

describe('the global', () => {
  it('is readable by anyone and editable only through the access you pass', async () => {
    const g = maintenanceGlobal({ access: ({ req }) => (req.user as { admin?: boolean } | null)?.admin === true })
    expect(await (g.access!.read as () => boolean)()).toBe(true)
    const update = g.access!.update as (a: { req: { user: unknown } }) => boolean
    expect(update({ req: { user: { admin: false } } })).toBe(false)
    expect(update({ req: { user: { admin: true } } })).toBe(true)
    // Default: signed in.
    const d = maintenanceGlobal().access!.update as (a: { req: { user: unknown } }) => boolean
    expect([d({ req: { user: null } }), d({ req: { user: {} } })]).toEqual([false, true])
  })

  it('adds itself once, and refuses a slug that is already taken', () => {
    const out = maintenance()({ globals: [] } as never)
    expect(out.globals!.map((g) => g.slug)).toEqual(['maintenance'])
    expect(() => maintenance()({ globals: [{ slug: 'maintenance', fields: [] }] } as never)).toThrow(/already exists/)
  })
})

describe('the gate', () => {
  it('reads only clear on/off values from the environment', () => {
    for (const v of ['on', 'TRUE', ' 1 ', 'yes']) expect(envOverride(v)).toBe(true)
    for (const v of ['off', 'false', '0', 'no']) expect(envOverride(v)).toBe(false)
    for (const v of [undefined, '', 'maybe']) expect(envOverride(v)).toBeNull()
  })

  it('closes site pages with a 503 while the switch is on, and keeps the admin and API open', async () => {
    const read = reader({ enabled: true, heading: 'Back soon', message: 'Painting the walls.' })
    const gate = maintenanceGate({ read, env: {}, brand: 'Example' })
    const res = (await gate(req('/en/about')))!
    expect(res.status).toBe(503)
    expect(res.headers.get('retry-after')).toBe('3600')
    expect(res.headers.get('cache-control')).toBe('no-store')
    const html = await res.text()
    expect(html).toContain('Back soon')
    expect(html).toContain('Painting the walls.')
    for (const path of ['/admin', '/admin/collections/pages', '/api/globals/maintenance', '/api/users/login']) expect(await gate(req(path))).toBeNull()
    expect(await (await gate(req('/', { method: 'HEAD' })))!.text()).toBe('')
  })

  it('lets someone signed in through, and nobody when the bypass is turned off', async () => {
    const read = reader({ enabled: true })
    expect(await maintenanceGate({ read, env: {} })(req('/', { cookie: 'a=1; payload-token=abc' }))).toBeNull()
    expect((await maintenanceGate({ read, env: {}, bypassCookie: false })(req('/', { cookie: 'payload-token=abc' })))!.status).toBe(503)
  })

  it('lets the environment force it either way', async () => {
    expect(await maintenanceGate({ read: reader({ enabled: true }), env: { SITE_MAINTENANCE: 'off' } })(req('/'))).toBeNull()
    const forced = (await maintenanceGate({ read: reader({ enabled: false }), env: { SITE_MAINTENANCE: 'on' } })(req('/')))!
    expect(forced.status).toBe(503)
    // Forced on still shows the admin's words, and plain defaults if the switch can't be read.
    expect((await (await maintenanceGate({ read: reader(new Error('down')), env: { SITE_MAINTENANCE: 'on' } })(req('/')))!.text())).toContain('getting things ready')
    expect(await maintenanceGate({ read: reader({ enabled: true }), env: { SITE_MAINTENANCE: 'on' }, envVar: false })(req('/', {}))).not.toBeNull()
  })

  it('stays open when off, and when the switch has never been readable', async () => {
    expect(await maintenanceGate({ read: reader({ enabled: false }), env: {} })(req('/'))).toBeNull()
    expect(await maintenanceGate({ read: reader(null), env: {} })(req('/'))).toBeNull()
    expect(await maintenanceGate({ read: reader(new Error('down')), env: {} })(req('/'))).toBeNull()
  })

  it('reuses a read for a few seconds, and keeps the last answer if a later read fails', async () => {
    vi.useFakeTimers()
    let state: MaintenanceState | Error = { enabled: true }
    const read = vi.fn(async () => {
      if (state instanceof Error) throw state
      return state
    })
    const gate = maintenanceGate({ read, env: {}, cacheSeconds: 10 })
    expect((await gate(req('/')))!.status).toBe(503)
    state = { enabled: false }
    expect((await gate(req('/')))!.status).toBe(503) // cached
    expect(read).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(11_000)
    expect(await gate(req('/'))).toBeNull() // re-read: open
    state = new Error('down')
    vi.advanceTimersByTime(11_000)
    expect(await gate(req('/'))).toBeNull() // last answer (open) stands
    expect(read).toHaveBeenCalledTimes(3)
  })

  it('reads the global over REST, with the Vercel protection bypass when the deployment has one', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ enabled: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      const gate = maintenanceGate({ env: { VERCEL_AUTOMATION_BYPASS_SECRET: 's3cret' } })
      expect((await gate(req('/x')))!.status).toBe(503)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe(`${ORIGIN}/api/globals/maintenance?depth=0`)
      expect((init!.headers as Record<string, string>)['x-vercel-protection-bypass']).toBe('s3cret')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
