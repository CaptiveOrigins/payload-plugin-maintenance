import type { Access, Config, GlobalConfig } from 'payload'

export { DEFAULT_CONTENT, renderPage, type PageContent, type PageTheme } from './page.js'

export type MaintenancePluginOptions = {
  /** Global slug. Default `maintenance`; the gate reads `/api/globals/<slug>`. */
  slug?: string
  /**
   * Who may turn maintenance on or off and edit the page, as a Payload `Access`.
   * Default (since 2026-11-11): only users of the admin collection (`admin.user` in your Payload config); members of any other auth collection are refused.
   */
  access?: Access
  /** Admin sidebar group. Default `Settings`. */
  group?: string
}

export const DEFAULT_SLUG = 'maintenance'

/**
 * The default `access`: the signed-in user belongs to the admin collection (`admin.user` in the Payload config).
 * Accounts from any other auth collection, nobody signed in, and a config with no admin collection to compare with are all refused.
 */
export const adminUsersOnly: Access = ({ req }) => {
  const collection = (req.user as { collection?: unknown } | null | undefined)?.collection
  const adminCollection = req.payload?.config?.admin?.user
  return typeof adminCollection === 'string' && adminCollection !== '' && collection === adminCollection
}

/** The admin switch and the page's words, as one global. Anyone can read it: it holds nothing private. */
export function maintenanceGlobal(options: MaintenancePluginOptions = {}): GlobalConfig {
  const slug = options.slug ?? DEFAULT_SLUG
  return {
    slug,
    label: 'Maintenance',
    admin: {
      group: options.group ?? 'Settings',
      description:
        'Close the website with a “back soon” page (HTTP 503, so search engines treat it as temporary). The admin, the API and people who are signed in keep working. Takes effect within a few seconds.',
    },
    access: {
      read: () => true,
      update: options.access ?? adminUsersOnly,
    },
    fields: [
      {
        name: 'enabled',
        label: 'Close the site',
        type: 'checkbox',
        defaultValue: false,
        admin: { description: 'While ticked, visitors see only the page below.' },
      },
      { name: 'heading', type: 'text', maxLength: 120, admin: { placeholder: 'We’re getting things ready' } },
      {
        name: 'message',
        type: 'textarea',
        maxLength: 1000,
        admin: { placeholder: 'The site is closed for a little while. Please check back soon.', description: 'Plain text. A blank line starts a new paragraph.' },
      },
      {
        name: 'backAround',
        label: 'Expected back',
        type: 'text',
        maxLength: 80,
        admin: { description: 'Optional, in words people understand (“Monday morning”). Leave empty if you don’t know.' },
      },
    ],
  }
}

/** Adds the Maintenance global. Pair it with `maintenanceGate` from `@extantape/payload-plugin-maintenance/gate` in your Next.js proxy (middleware). */
export const maintenance =
  (options: MaintenancePluginOptions = {}) =>
  (config: Config): Config => {
    const slug = options.slug ?? DEFAULT_SLUG
    if ((config.globals ?? []).some((g) => g.slug === slug)) throw new Error(`payload-plugin-maintenance: a global named "${slug}" already exists; pass another slug.`)
    return { ...config, globals: [...(config.globals ?? []), maintenanceGlobal(options)] }
  }
