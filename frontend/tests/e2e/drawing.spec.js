import { expect, test } from '@playwright/test'
import { api, goTo, openApp, resetData, seed, shot } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetData()
  await api.create('drawings', { title: 'Sketch', data: '' })
  await openApp(page)
  await goTo(page, 'Drawing')
  await expect(page.locator('canvas')).toBeVisible()
})

// Draws a line across the canvas with the mouse, the way a user would
async function drawLine(page, from = [60, 80], to = [300, 200]) {
  const box = await page.locator('canvas').boundingBox()
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + (from[0] + to[0]) / 2, box.y + to[1], { steps: 8 })
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  await page.mouse.up()
}

test.describe('drawing', () => {
  test('has a pen, an eraser, a colour, a width and a clear button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Pen' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByLabel('Color')).toBeVisible()
    await expect(page.getByLabel('Width')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible()
  })

  test('switches between pen and eraser', async ({ page }) => {
    await page.getByRole('button', { name: 'Eraser' }).click()
    await expect(page.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Pen' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('saves a stroke as a PNG and shows it in the gallery', async ({ page }) => {
    await drawLine(page)

    await expect.poll(async () => (await api.list('drawings'))[0].data.length).toBeGreaterThan(100)
    expect((await api.list('drawings'))[0].data).toMatch(/^data:image\/png;base64,/)
    await expect(page.locator('.preview-img')).toBeVisible()
  })

  test('draws in the chosen colour', async ({ page }) => {
    await page.getByLabel('Color').fill('#ff0000')
    await drawLine(page)

    await expect.poll(async () => (await api.list('drawings'))[0].data.length).toBeGreaterThan(100)
    const hasRed = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height)
      for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] < 60 && data[i + 3] > 200) return true
      return false
    })
    expect(hasRed).toBe(true)
  })

  test('keeps the drawing after a reload', async ({ page }) => {
    await drawLine(page)
    await expect.poll(async () => (await api.list('drawings'))[0].data.length).toBeGreaterThan(100)

    await page.reload()
    await goTo(page, 'Drawing')

    const inked = await page.evaluate(() => new Promise(resolve => {
      const check = () => {
        const c = document.querySelector('canvas')
        const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height)
        resolve(data.some((v, i) => i % 4 === 3 && v > 0))
      }
      setTimeout(check, 500)
    }))
    expect(inked).toBe(true)
  })

  test('erases ink with the eraser', async ({ page }) => {
    await drawLine(page, [60, 100], [300, 100])
    await page.getByRole('button', { name: 'Eraser' }).click()
    await drawLine(page, [20, 100], [340, 100])

    await expect.poll(async () => {
      return page.evaluate(() => {
        const c = document.querySelector('canvas')
        const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height)
        return data.some((v, i) => i % 4 === 3 && v > 0)
      })
    }).toBe(false)
  })

  test('asks before clearing the canvas, and keeps the drawing on Cancel', async ({ page }) => {
    await drawLine(page)
    await expect.poll(async () => (await api.list('drawings'))[0].data.length).toBeGreaterThan(100)

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('.modal-title')).toHaveText('Clear the canvas?')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.locator('.modal')).toHaveCount(0)
    expect((await api.list('drawings'))[0].data.length).toBeGreaterThan(100)
  })

  test('clears the canvas and the saved image after confirming', async ({ page }) => {
    await drawLine(page)
    await expect.poll(async () => (await api.list('drawings'))[0].data.length).toBeGreaterThan(100)

    await page.getByRole('button', { name: 'Clear' }).click()
    await page.locator('.btn-confirm').click()

    await expect.poll(async () => (await api.list('drawings'))[0].data).toBe('')
    await expect(page.locator('.preview-img')).toHaveCount(0)
  })

  test('creates a new numbered drawing and lists it first', async ({ page }) => {
    await page.getByRole('button', { name: 'New', exact: true }).click()

    await expect(page.locator('.item').first()).toContainText('Drawing 2')
    await expect(page.locator('.pg-sub').nth(1)).toHaveText('2 drawings')
  })

  test('deletes a drawing after confirmation', async ({ page }) => {
    await page.locator('.page-actions button[aria-label="Delete"]').click()
    await expect(page.locator('.modal-message')).toContainText('Sketch')
    await page.locator('.btn-confirm').click()

    await expect.poll(async () => (await api.list('drawings')).length).toBe(0)
    await expect(page.locator('.empty-state h3')).toHaveText('Start your first sketch')
  })

  test('shows the drawing page', async ({ page }) => {
    await page.getByLabel('Color').fill('#8c5a2b')
    await drawLine(page, [80, 300], [80, 180])
    await drawLine(page, [80, 180], [180, 120])
    await drawLine(page, [180, 120], [280, 180])
    await drawLine(page, [280, 180], [280, 300])
    await drawLine(page, [280, 300], [80, 300])
    await expect.poll(async () => (await api.list('drawings'))[0].data.length).toBeGreaterThan(100)
    await shot(page, 'drawing')
  })
})
