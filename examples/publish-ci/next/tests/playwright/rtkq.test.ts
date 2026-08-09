import { expect, test } from '@playwright/test'

test('RTK / RTKQ Interactions', async ({ page }) => {
  page.on('console', (msg) => console.log('Console message: ', msg.text()))
  await page.goto('http://localhost:3000')

  // Rendered by a Server Component that imports the core RTK Query entry point
  await expect(page.getByTestId('server-reducer-path')).toHaveText('timeApi')
  await expect(page.getByTestId('server-query-count')).toHaveText('0')

  const counterValue = page.getByTestId('counter-value')
  await expect(counterValue).toHaveText('0')

  await page.getByRole('button', { name: 'Increment value' }).click()
  await expect(counterValue).toHaveText('1')

  const counterStatus = page.getByTestId('counter-status')
  await page.getByRole('button', { name: 'Increment async' }).click()
  await expect(counterStatus).toHaveText('loading')
  await expect(counterValue).toHaveText('3', { timeout: 10000 })
  await expect(counterStatus).toHaveText('idle')

  const timeValue = page.getByTestId('time-value')
  const postValue = page.getByTestId('post-value')

  await expect(timeValue).toHaveText(/\d+:\d+:\d+\s+(A|P)M/, { timeout: 10000 })
  await expect(postValue).toHaveText('A sample post', { timeout: 10000 })
})
