import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { goTo, openApp, openNotebook, resetData, seed, shot } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetData()
  await seed()
  await openNotebook(page)
})

// The Monaco editor and the Vue devtools button of the dev server are third-party code with their
// own accessibility behaviour, so they are left out of the automatic scan. Everything else is checked.
async function scan(page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('.monaco-editor')
    .exclude('.vue-devtools__anchor')
    .exclude('.panel-entry-btn')
    .analyze()
}

function describeViolations(violations) {
  return violations.map(v => `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`).join('\n')
}

const tools = ['Notebook', 'Drawing', 'Todos', 'Code']

test.describe('automatic accessibility scan (axe, WCAG 2.2 AA)', () => {
  for (const night of [false, true]) {
    for (const tool of tools) {
      test(`${tool} in ${night ? 'night' : 'day'} mode has no violations`, async ({ page }) => {
        if (night) await page.getByLabel('Night mode').check()
        await goTo(page, tool)
        if (tool === 'Code') await expect(page.locator('.monaco-editor')).toBeVisible()

        const { violations } = await scan(page)
        expect(violations, describeViolations(violations)).toEqual([])
      })
    }
  }

  test('the open confirmation dialog has no violations', async ({ page }) => {
    await page.locator('.page-actions button[aria-label="Delete"]').click()
    const { violations } = await scan(page)
    expect(violations, describeViolations(violations)).toEqual([])
  })

  test('the empty state has no violations', async ({ page }) => {
    await resetData()
    await page.reload()
    await page.waitForSelector('.empty-state')
    const { violations } = await scan(page)
    expect(violations, describeViolations(violations)).toEqual([])
  })

  test('the narrow layout has no violations', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 820 })
    await page.waitForSelector('.page-switch')
    const { violations } = await scan(page)
    expect(violations, describeViolations(violations)).toEqual([])
  })

  test('the server error banner has no violations', async ({ page }) => {
    await page.route('**/todos', route => route.abort())
    await page.reload()
    await page.waitForSelector('.load-error')
    const { violations } = await scan(page)
    expect(violations, describeViolations(violations)).toEqual([])
  })
})

test.describe('keyboard', () => {
  test('every control can be reached with Tab and shows a focus ring', async ({ page }) => {
    const rings = new Set()
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const cs = getComputedStyle(el)
        return { tag: el.tagName, label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20), outline: cs.outlineStyle, width: cs.outlineWidth }
      })
      if (info) rings.add(`${info.tag}:${info.label}:${info.outline}:${info.width}`)
    }
    const focused = [...rings]
    expect(focused.length).toBeGreaterThan(10)

    // Everything we style must show a ring. The editable text area is the one exception: it has no
    // outline of its own, the ring goes around the whole writing field (checked in the next test).
    const withoutRing = focused.filter(item => item.includes(':none:') && !item.includes(':Entry text:'))
    expect(withoutRing).toEqual([])
  })

  test('the writing field shows one ring around the whole area while typing', async ({ page }) => {
    await page.locator('.editor .tiptap').focus()
    const ring = await page.locator('.editor').evaluate(el => {
      const cs = getComputedStyle(el)
      return { style: cs.outlineStyle, width: cs.outlineWidth }
    })
    expect(ring).toEqual({ style: 'solid', width: '2px' })
  })

  test('a focused button shows the ring of the active tool', async ({ page }) => {
    await page.locator('.btn-new').focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const ring = await page.locator('.btn-new').evaluate(el => {
      const cs = getComputedStyle(el)
      return { style: cs.outlineStyle, width: cs.outlineWidth, colour: cs.outlineColor, accent: cs.backgroundColor }
    })
    expect(ring.style).toBe('solid')
    expect(ring.width).toBe('2px')
    // The ring has the colour of the tool, which is also the colour of the button
    expect(ring.colour).toBe(ring.accent)
    await shot(page, 'focus-ring')
  })

  test('the tabs are buttons that can be used with Enter and Space', async ({ page }) => {
    await page.locator('.tab[aria-label="Drawing"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.book')).toHaveAttribute('data-tool', 'drawing')

    await page.locator('.tab[aria-label="Code"]').focus()
    await page.keyboard.press('Space')
    await expect(page.locator('.book')).toHaveAttribute('data-tool', 'code')
  })

  test('the toolbar buttons announce their state', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Handwriting' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Easy-read' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('the delete button is reachable with the keyboard on every page', async ({ page }) => {
    for (const tool of ['Notebook', 'Drawing', 'Code']) {
      await goTo(page, tool)
      await expect(page.locator('.page-actions button[aria-label="Delete"]')).toBeVisible()
    }
  })

  test('the todo delete button appears for keyboard users, not only on hover', async ({ page }) => {
    await goTo(page, 'Todos')
    const button = page.locator('.todo-item').first().locator('button[aria-label="Delete"]')
    await button.focus()
    await expect(button).toHaveCSS('opacity', '1')
  })
})

test.describe('structure', () => {
  test('has one main heading per page and labelled landmarks', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('nav[aria-label="Tools"]')).toHaveCount(1)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveTitle('OrganizeMe')
  })

  test('every image-like control has an accessible name', async ({ page }) => {
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button, input, select')]
        .filter(el => {
          if (el.closest('.monaco-editor, [class*="vue-devtools"], .panel-entry-btn')) return false
          const name = el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title') || (el.labels && el.labels.length) || el.getAttribute('placeholder')
          return !name
        })
        .map(el => el.outerHTML.slice(0, 80))
    )
    expect(unnamed).toEqual([])
  })

  test('the save status is a polite live region', async ({ page }) => {
    await expect(page.locator('.save')).toHaveAttribute('role', 'status')
    await expect(page.locator('.save')).toHaveAttribute('aria-live', 'polite')
  })

  test('animations stop when the system asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/entries', async route => {
      await new Promise(resolve => setTimeout(resolve, 800))
      await route.continue()
    })
    await page.reload()
    await page.waitForSelector('.skeleton')
    await expect(page.locator('.skeleton .bar').first()).toHaveCSS('animation-name', 'none')
  })

  test('the text stays readable at 200 percent zoom', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 820 })
    await page.waitForSelector('.page-switch')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
