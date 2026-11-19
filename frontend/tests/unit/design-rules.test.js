import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { contrast, readTokens } from './helpers/contrast'

// These tests guard the accessibility decisions of the design: if someone changes a colour or a
// type size and breaks one, the test says which rule was broken.

const appCss = readFileSync('src/App.vue', 'utf8')
const light = readTokens(appCss, '.layout')
const dark = readTokens(appCss, '.layout.dark')

const AA_TEXT = 4.5
const AA_UI = 3

const themes = [['day', light, { ...light }], ['night', dark, { ...light, ...dark }]]
const tools = ['notebook', 'drawing', 'todo', 'code']

describe.each(themes)('colour contrast in %s mode', (_name, own, tokens) => {
  const t = (key) => tokens[key]

  it.each(['gray-bg', 'gray-card', 'white'])('body text is readable on %s', (surface) => {
    expect(contrast(t('text'), t(surface))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(['gray-bg', 'gray-card', 'white'])('secondary text is readable on %s', (surface) => {
    expect(contrast(t('muted'), t(surface))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('the app title is readable on the desk', () => {
    expect(contrast(t('text'), t('desk'))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(['gray-bg', 'white'])('outlines of fields and buttons stand out from %s (3:1)', (surface) => {
    expect(contrast(t('field-border'), t(surface))).toBeGreaterThanOrEqual(AA_UI)
  })

  it.each(tools)('text on the %s accent is readable', (tool) => {
    expect(contrast(t('on-accent'), t(`tool-${tool}`))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(tools)('text on the %s accent stays readable on hover', (tool) => {
    expect(contrast(t('on-accent'), t(`tool-${tool}-hover`))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(tools)('the %s accent works as text on the paper (progress, badges)', (tool) => {
    expect(contrast(t(`tool-${tool}`), t('gray-card'))).toBeGreaterThanOrEqual(AA_UI)
  })

  it('error text is readable on the paper', () => {
    expect(contrast(t('danger'), t('gray-bg'))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('the destructive button text is readable', () => {
    expect(contrast(t('on-danger'), t('danger-fill'))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('success text is readable on the paper', () => {
    expect(contrast(t('success'), t('gray-bg'))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('dialog text is readable on the raised surface', () => {
    expect(contrast(t('text'), t('raised'))).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(t('muted'), t('raised'))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('the stitching and the switch stay visible on the cover (3:1)', () => {
    expect(contrast(t('stitch'), t('cover'))).toBeGreaterThanOrEqual(AA_UI)
  })

  it('defines every token the contrast checks rely on', () => {
    for (const key of ['text', 'muted', 'gray-bg', 'gray-card', 'white', 'field-border', 'on-accent', 'danger', 'raised']) {
      expect(t(key), `--${key} is missing`).toMatch(/^#[0-9a-f]{6}$/i)
    }
    expect(Object.keys(own).length).toBeGreaterThan(10)
  })
})

describe('night mode', () => {
  it('has its own value for every colour the day mode defines as a fixed hex', () => {
    const missing = Object.keys(light).filter(key => !(key in dark) && !['stitch', 'ribbon', 'radius-sm'].includes(key))
    expect(missing).toEqual([])
  })

  it('uses a different paper than day mode, so it is not just inverted text', () => {
    expect(dark['gray-bg']).not.toBe(light['gray-bg'])
    expect(contrast(dark['gray-bg'], light['gray-bg'])).toBeGreaterThan(5)
  })

  it('does not use pure black or pure white as paper', () => {
    for (const theme of [light, dark]) {
      expect(['#000000', '#ffffff']).not.toContain(theme['gray-bg'].toLowerCase())
    }
  })
})

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(vue|css)$/.test(name) ? [path] : []
  })
}

describe('type and focus rules in the source', () => {
  const files = sourceFiles('src').map(path => [path.replace(/\\/g, '/'), readFileSync(path, 'utf8')])

  it('has no text smaller than 12 px', () => {
    const tooSmall = files.flatMap(([path, text]) =>
      [...text.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
        .filter(([, px]) => Number(px) < 12)
        .map(([match]) => `${path}: ${match}`)
    )
    expect(tooSmall).toEqual([])
  })

  it('has no text smaller than 0.75 rem', () => {
    const tooSmall = files.flatMap(([path, text]) =>
      [...text.matchAll(/font-size:\s*(\d*\.?\d+)rem/g)]
        .filter(([, rem]) => Number(rem) < 0.75)
        .map(([match]) => `${path}: ${match}`)
    )
    expect(tooSmall).toEqual([])
  })

  it('never removes the focus outline without a replacement', () => {
    const offenders = files.flatMap(([path, text]) =>
      // The editable area of the rich text editor is the one exception: book.css draws its ring
      [...text.matchAll(/([^{}]+)\{[^{}]*outline:\s*none[^{}]*\}/g)]
        .filter(([, selector]) => !selector.includes('tiptap'))
        .map(([, selector]) => `${path}: ${selector.trim()}`)
    )
    expect(offenders).toEqual([])
  })

  it('draws a focus ring for the keyboard in the global styles', () => {
    const book = files.find(([path]) => path.endsWith('styles/book.css'))[1]
    expect(book).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid/)
  })

  it('stops keyframe animations when the system asks for reduced motion', () => {
    const animated = files.filter(([, text]) => /animation:/.test(text))
    expect(animated.length).toBeGreaterThan(0)
    for (const [path, text] of animated) {
      expect(text, `${path} animates but has no prefers-reduced-motion rule`).toMatch(/prefers-reduced-motion/)
    }
  })

  it('switches off every transition in one place when the system asks for reduced motion', () => {
    expect(appCss).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[^}]*transition:\s*none/)
  })

  it('uses relative units for the type scale tokens', () => {
    expect(appCss).toMatch(/--fs-body:\s*1rem/)
    expect(appCss).toMatch(/--fs-sm:\s*0\.875rem/)
    expect(appCss).toMatch(/--fs-cap:\s*0\.75rem/)
  })

  it('keeps body text at 16 px or more and line height at 1.5 or more', () => {
    expect(appCss).toMatch(/font-size:\s*var\(--fs-body\)/)
    expect(appCss).toMatch(/line-height:\s*1\.5/)
  })

  it('caps the reading width of entry text', () => {
    const book = files.find(([path]) => path.endsWith('styles/book.css'))[1]
    expect(book).toMatch(/max-width:\s*65ch/)
  })

  it('does not use non-system fonts other than the two bundled ones', () => {
    const families = [...appCss.matchAll(/--font(?:-hand)?:\s*'([^']+)'/g)].map(([, name]) => name)
    expect(families.sort()).toEqual(['Caveat', 'Nunito'])
  })
})
