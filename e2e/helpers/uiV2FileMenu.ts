import { type Download, type Page } from '@playwright/test'

export async function readDownload(download: Download) {
  const stream = await download.createReadStream()
  let text = ''
  for await (const chunk of stream) text += chunk.toString()
  return text
}

export async function downloadFromFileMenu(page: Page, label: string) {
  await page.getByRole('menuitem', { name: 'Файл', exact: true }).click()
  const menu = page.getByRole('menu', { name: 'Файл', exact: true })
  const downloadPromise = page.waitForEvent('download')
  await menu.getByRole('menuitem', { name: label, exact: true }).click()
  return downloadPromise
}

export async function downloadTextFromFileMenu(page: Page, label: string) {
  return readDownload(await downloadFromFileMenu(page, label))
}
