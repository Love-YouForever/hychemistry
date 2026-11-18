import { expect, test } from '@playwright/test'

const ANSWER = '钠与水反应会生成氢氧化钠和氢气，同时放出大量热。'

test('主页冒烟：导航、桌宠与 AI 对话链路可用', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  // 媒体文件与语音合成不参与冒烟测试，避免无意义的带宽与等待
  await page.route(/\.(mp4|mp3|webm)(\?.*)?$/, (route) => route.abort())
  await page.route('**/speech/synthesize', (route) => route.fulfill({ status: 503, body: '' }))
  await page.route('**/api/health', (route) => route.fulfill({ json: { ok: true } }))
  await page.route('**/api/aigent/bootstrap', (route) =>
    route.fulfill({ json: { intro: '冒烟测试：小幻语已就绪。' } })
  )
  await page.route('**/api/aigent/chat/stream', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store' },
      body: [
        'event: status\ndata: {"text":"正在思考…"}\n\n',
        `event: delta\ndata: ${JSON.stringify({ text: ANSWER })}\n\n`,
        'event: done\ndata: {"scene":"reaction","citations":[]}\n\n',
      ].join(''),
    })
  )

  await page.goto('/')

  // 1. 导航由 Vue 组件渲染
  await expect(page.locator('.btn-group-left .btn')).toHaveCount(3)
  await expect(page.locator('.btn-group-right .btn')).toHaveCount(3)
  await expect(page.locator('#exploreBtn')).toBeVisible()

  // 2. 桌宠渲染并可打开对话面板
  await expect(page.locator('#pet-container')).toBeVisible()
  await page.locator('#pet-container').click()
  await expect(page.locator('.assistant-panel')).toHaveClass(/open/)
  await expect(page.locator('.assistant-title')).toHaveText('小幻语')

  // 3. 发送问题并收到流式回答
  await page.locator('.assistant-input').fill('钠和水反应为什么会剧烈？')
  await page.locator('.assistant-send').click()

  await expect(page.locator('.assistant-message.user').last()).toContainText('钠和水反应')
  await expect(page.locator('.assistant-message.assistant').last()).toContainText(ANSWER)
  await expect(page.locator('.assistant-message.pending')).toHaveCount(0)

  expect(pageErrors).toEqual([])
})
