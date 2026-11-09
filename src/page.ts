/** What the back-soon page says. Every field is plain text; nothing is rendered as HTML. */
export type PageContent = {
  /** Small line above the heading, usually the site's name. */
  brand?: string | null
  heading?: string | null
  message?: string | null
  /** When the site is expected back, already worded for people ("Monday morning"). */
  backAround?: string | null
  /** Language of the page, for screen readers (`lang`). */
  lang?: string
}

export type PageTheme = {
  light?: { background?: string; text?: string; muted?: string; accent?: string }
  dark?: { background?: string; text?: string; muted?: string; accent?: string }
}

export const DEFAULT_CONTENT = {
  heading: 'We’re getting things ready',
  message: 'The site is closed for a little while. Please check back soon.',
} as const

const DEFAULT_THEME: Required<PageTheme> = {
  light: { background: '#fbf7f4', text: '#2e1d1a', muted: '#5f4a44', accent: '#a85d1c' },
  dark: { background: '#1f1513', text: '#f4e9e4', muted: '#c9b5ae', accent: '#e9a25e' },
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const color = (v: string | undefined, fallback: string) => (v && /^#[0-9a-f]{3,8}$|^[a-z]+$|^rgba?\([\d\s.,%]+\)$/i.test(v) ? v : fallback)

/** The whole page: one small, self-contained HTML document with light and dark colours and no scripts. */
export function renderPage(content: PageContent = {}, theme: PageTheme = {}): string {
  const l = { ...DEFAULT_THEME.light, ...theme.light }
  const d = { ...DEFAULT_THEME.dark, ...theme.dark }
  const heading = content.heading?.trim() || DEFAULT_CONTENT.heading
  const message = content.message?.trim() || DEFAULT_CONTENT.message
  const paragraphs = message
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p)}</p>`)
    .join('\n  ')
  const brand = content.brand?.trim()
  const back = content.backAround?.trim()
  const title = brand ? `${brand}: ${heading}` : heading
  return `<!DOCTYPE html>
<html lang="${escape(content.lang || 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noarchive">
<title>${escape(title)}</title>
<style>
  :root { color-scheme: light dark; --bg: ${color(l.background, DEFAULT_THEME.light.background!)}; --ink: ${color(l.text, DEFAULT_THEME.light.text!)}; --muted: ${color(l.muted, DEFAULT_THEME.light.muted!)}; --accent: ${color(l.accent, DEFAULT_THEME.light.accent!)} }
  @media (prefers-color-scheme: dark) { :root { --bg: ${color(d.background, DEFAULT_THEME.dark.background!)}; --ink: ${color(d.text, DEFAULT_THEME.dark.text!)}; --muted: ${color(d.muted, DEFAULT_THEME.dark.muted!)}; --accent: ${color(d.accent, DEFAULT_THEME.dark.accent!)} } }
  * { box-sizing: border-box }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 32px 24px; background: var(--bg); color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.5 }
  main { max-width: 34rem; text-align: center }
  .brand { margin: 0 0 24px; font-size: 0.875rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent) }
  h1 { margin: 0 0 16px; font-size: clamp(1.75rem, 5vw, 2.5rem); line-height: 1.15 }
  p { margin: 0 0 12px; font-size: 1.125rem; color: var(--muted) }
  .back { margin-top: 20px; font-weight: 600; color: var(--ink) }
</style>
</head>
<body>
<main>
  ${brand ? `<p class="brand">${escape(brand)}</p>\n  ` : ''}<h1>${escape(heading)}</h1>
  ${paragraphs}${back ? `\n  <p class="back">Expected back: ${escape(back)}</p>` : ''}
</main>
</body>
</html>
`
}
