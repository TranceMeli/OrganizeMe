import { expect, test } from '@playwright/test'
import { goTo, openApp, openNotebook, resetData, seed, shot } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetData()
  await seed()
  await openNotebook(page)
})

const tools = [
  ['Notebook', 'notebook', ['Today', 'Entries']],
  ['Drawing', 'drawing', ['Sketchpad', 'Gallery']],
  ['Todos', 'todo', ['To do', 'Progress']],
  ['Code', 'code', ['Snippet', 'Snippets']]
]

test.describe('tabs and shortcuts', () => {
  for (const [label, tool, headings] of tools) {
    test(`the ${label} tab opens the ${tool} pages`, async ({ page }) => {
      await goTo(page, label)
      await expect(page.locator('.book')).toHaveAttribute('data-tool', tool)
      await expect(page.locator('.pg-head h2')).toHaveText(headings)
    })
  }

  test('only the current tab shows its name', async ({ page }) => {
    await expect(page.locator('.tab.active .tab-label')).toBeVisible()
    await expect(page.locator('.tab:not(.active) .tab-label')).toHaveCount(3)
    for (const label of await page.locator('.tab:not(.active) .tab-label').all()) {
      await expect(label).toBeHidden()
    }
  })

  test('shows a tooltip with the shortcut when hovering a tab', async ({ page }) => {
    const slot = page.locator('.tab-slot').nth(1)
    await expect(slot.locator('.tip')).toHaveCSS('opacity', '0')
    await slot.hover()
    await expect(slot.locator('.tip')).toHaveCSS('opacity', '1')
    await expect(slot.locator('.tip')).toHaveText('Drawing · Alt+2')
  })

  test('Alt+1 to Alt+4 switch the tools', async ({ page }) => {
    for (const [key, tool] of [['2', 'drawing'], ['3', 'todo'], ['4', 'code'], ['1', 'notebook']]) {
      await page.keyboard.press(`Alt+${key}`)
      await expect(page.locator('.book')).toHaveAttribute('data-tool', tool)
    }
  })

  test('Alt+N creates a new entry', async ({ page }) => {
    await page.keyboard.press('Alt+n')
    await expect(page.locator('.title-input')).toHaveValue('Entry 4')
  })

  test('Alt+N in the todos jumps to the new todo field', async ({ page }) => {
    await page.keyboard.press('Alt+3')
    await page.keyboard.press('Alt+n')
    await expect(page.locator('.new-input')).toBeFocused()
  })

  test('typing the digits without Alt does not switch the tool', async ({ page }) => {
    await page.locator('.title-input').click()
    await page.keyboard.type('2')
    await expect(page.locator('.book')).toHaveAttribute('data-tool', 'notebook')
  })

  test('remembers the tool after a reload', async ({ page }) => {
    await goTo(page, 'Todos')
    await page.reload()
    await expect(page.locator('.book')).toHaveAttribute('data-tool', 'todo')
  })
})

test.describe('appearance', () => {
  test('switches to night mode and keeps it after a reload', async ({ page }) => {
    await expect(page.locator('.layout')).not.toHaveClass(/dark/)
    await page.getByLabel('Night mode').check()
    await expect(page.locator('.layout')).toHaveClass(/dark/)
    await expect(page.locator('.switch-label')).toHaveText('Night')

    await page.reload()
    await expect(page.locator('.layout')).toHaveClass(/dark/)
    await shot(page, 'notebook-night')
  })

  test('changes the paper colour in night mode', async ({ page }) => {
    const paper = () => page.locator('.spread').evaluate(el => getComputedStyle(el).backgroundColor)
    const day = await paper()
    await page.getByLabel('Night mode').check()
    expect(await paper()).not.toBe(day)
  })

  test('uses handwriting for entries by default and Nunito in easy-read mode', async ({ page }) => {
    const font = () => page.locator('.editor').evaluate(el => getComputedStyle(el).fontFamily)
    expect(await font()).toContain('Caveat')

    await page.getByRole('button', { name: 'Easy-read' }).click()
    expect(await font()).toContain('Nunito')
    await shot(page, 'notebook-easy-read')

    await page.reload()
    expect(await font()).toContain('Nunito')
  })

  test('keeps the page headings in handwriting even in easy-read mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Easy-read' }).click()
    await expect(page.locator('.pg-head h2').first()).toHaveCSS('font-family', /Caveat/)
  })

  test('the accent follows the tool', async ({ page }) => {
    const accent = () => page.locator('.tab.active').evaluate(el => getComputedStyle(el).backgroundColor)
    const colours = []
    for (const [label] of tools) {
      await goTo(page, label)
      colours.push(await accent())
    }
    expect(new Set(colours).size).toBe(4)
  })
})

test.describe('resizing the book', () => {
  test('the corner handle makes the book larger and smaller', async ({ page }) => {
    const size = async () => (await page.locator('.book').boundingBox())
    const start = await size()
    const grip = await page.locator('.grip').boundingBox()

    await page.mouse.move(grip.x + 10, grip.y + 10)
    await page.mouse.down()
    await page.mouse.move(grip.x - 90, grip.y - 70, { steps: 6 })
    await page.mouse.up()

    const smaller = await size()
    expect(smaller.width).toBeLessThan(start.width)
    expect(smaller.height).toBeLessThan(start.height)
  })

  test('never gets smaller than 760 by 480 pixels', async ({ page }) => {
    const grip = await page.locator('.grip').boundingBox()
    await page.mouse.move(grip.x + 10, grip.y + 10)
    await page.mouse.down()
    await page.mouse.move(0, 0, { steps: 6 })
    await page.mouse.up()

    const box = await page.locator('.book').boundingBox()
    expect(Math.round(box.width)).toBe(760)
    expect(Math.round(box.height)).toBe(480)
  })

  test('remembers the size and fits the window again on a double click', async ({ page }) => {
    const grip = await page.locator('.grip').boundingBox()
    await page.mouse.move(grip.x + 10, grip.y + 10)
    await page.mouse.down()
    await page.mouse.move(grip.x - 100, grip.y - 60, { steps: 6 })
    await page.mouse.up()
    const resized = await page.locator('.book').boundingBox()

    await page.reload()
    await page.waitForSelector('.title-input')
    const restored = await page.locator('.book').boundingBox()
    expect(Math.round(restored.width)).toBe(Math.round(resized.width))

    await page.locator('.grip').dblclick()
    const fitted = await page.locator('.book').boundingBox()
    expect(fitted.width).toBeGreaterThan(resized.width)
  })

  test('keeps the text column readable when the book is very wide', async ({ page }) => {
    await page.setViewportSize({ width: 2200, height: 900 })
    await page.locator('.grip').dblclick()
    const width = await page.locator('.editor').evaluate(el => el.getBoundingClientRect().width)
    // 65 characters of the 24 px handwriting font stay well below the width of a wide page
    expect(width).toBeLessThan(900)
  })
})

test.describe('narrow screens', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 820 })
    await page.waitForSelector('.page-switch')
  })

  test('shows one page and a switch instead of two pages', async ({ page }) => {
    await expect(page.locator('.page-switch button')).toHaveText(['Write', 'Entries'])
    await expect(page.locator('.pg').first()).toBeVisible()
    await expect(page.locator('.pg').nth(1)).toBeHidden()
    await shot(page, 'narrow-write')
  })

  test('switches to the entries page and back', async ({ page }) => {
    await page.getByRole('button', { name: 'Entries' }).click()
    await expect(page.locator('.pg').first()).toBeHidden()
    await expect(page.locator('.item').first()).toBeVisible()
    await shot(page, 'narrow-entries')

    await page.getByRole('button', { name: 'Write' }).click()
    await expect(page.locator('.editor')).toBeVisible()
  })

  test('labels every tool in the bottom bar', async ({ page }) => {
    await expect(page.locator('.tab-label')).toHaveText(['Notebook', 'Drawing', 'Todos', 'Code'])
    for (const label of await page.locator('.tab-label').all()) await expect(label).toBeVisible()
  })

  test('has no resize handle and no horizontal scrolling', async ({ page }) => {
    await expect(page.locator('.grip')).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('works with the tools in the bottom bar', async ({ page }) => {
    await goTo(page, 'Todos')
    await expect(page.locator('.new-input')).toBeVisible()
    await page.locator('.new-input').fill('From my phone')
    await page.keyboard.press('Enter')
    await expect(page.locator('.todo-title').first()).toHaveValue('From my phone')
  })

  test('returns to two pages when the window grows', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 820 })
    await expect(page.locator('.page-switch')).toHaveCount(0)
    await expect(page.locator('.pg').nth(1)).toBeVisible()
  })
})

for (const width of [768, 1024, 1280, 1920]) {
  test(`the page does not scroll sideways at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.reload()
    await page.waitForSelector('.title-input')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
