import type { Access, Config, GlobalConfig } from 'payload'

export { DEFAULT_CONTENT, renderPage, type PageContent, type PageTheme } from './page.js'

export type MaintenancePluginOptions = {
  /** Global slug. Default `maintenance`; the gate reads `/api/globals/<slug>`. */
  slug?: string
  /** Who may turn maintenance on or off and edit the page. Default: anyone signed in to the admin. Most sites should pass their own. */
  access?: Access
  /** Admin sidebar group. Default `Settings`. */
  group?: string
}

export const DEFAULT_SLUG = 'maintenance'

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
      update: options.access ?? (({ req }) => Boolean(req.user)),
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

/** Adds the Maintenance global. Pair it with `maintenanceGate` from `@captiveorigins/payload-plugin-maintenance/gate` in your Next.js proxy (middleware). */
export const maintenance =
  (options: MaintenancePluginOptions = {}) =>
  (config: Config): Config => {
    const slug = options.slug ?? DEFAULT_SLUG
    if ((config.globals ?? []).some((g) => g.slug === slug)) throw new Error(`payload-plugin-maintenance: a global named "${slug}" already exists; pass another slug.`)
    return { ...config, globals: [...(config.globals ?? []), maintenanceGlobal(options)] }
  }
