// WCAG 2.x relative luminance and contrast ratio for #rrggbb colours

function channel(value) {
  const v = value / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

export function luminance(hex) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Reads the hex custom properties declared in the first rule that starts with `selector`.
 * Values that are not plain hex colours (var(), color-mix()) are skipped on purpose:
 * the design tokens that matter for contrast are written as fixed values.
 */
export function readTokens(css, selector) {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No rule found for ${selector}`)
  const end = css.indexOf('}', start)
  const tokens = {}
  for (const [, name, value] of css.slice(start, end).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value
  }
  return tokens
}
