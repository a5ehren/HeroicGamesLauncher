/**
 * End-to-End Performance Tests
 *
 * Tests full application performance using Playwright:
 * - Application startup time
 * - Navigation performance
 * - Page load times
 * - User interaction responsiveness
 * - Memory usage patterns
 */

import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

interface PerformanceMetrics {
  duration: number
  memoryBefore?: number
  memoryAfter?: number
}

async function measurePageNavigation(
  page: Page,
  navigationFn: () => Promise<void>
): Promise<PerformanceMetrics> {
  const startTime = performance.now()

  await navigationFn()
  await page.waitForLoadState('domcontentloaded')

  const endTime = performance.now()

  return {
    duration: endTime - startTime
  }
}

async function measureInteraction(
  page: Page,
  interactionFn: () => Promise<void>
): Promise<PerformanceMetrics> {
  const startTime = performance.now()

  await interactionFn()

  const endTime = performance.now()

  return {
    duration: endTime - startTime
  }
}

test.describe('E2E Performance Tests', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    console.log('\n🚀 Starting Electron app...')
    const startTime = performance.now()

    electronApp = await electron.launch({
      args: ['build/main/main.js'],
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    })

    window = await electronApp.firstWindow()

    const endTime = performance.now()
    const startupTime = endTime - startTime

    console.log(`   Startup time: ${startupTime.toFixed(2)}ms`)

    // Startup should be reasonably fast
    expect(startupTime).toBeLessThan(10000) // 10 seconds max
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('application should load main window quickly', async () => {
    await window.waitForLoadState('domcontentloaded')

    const metrics = await window.evaluate(() => {
      const perfData = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd,
        loadComplete: perfData.loadEventEnd,
        domInteractive: perfData.domInteractive
      }
    })

    console.log('\n📊 Initial Load Performance')
    console.log(`   DOM Interactive: ${metrics.domInteractive.toFixed(2)}ms`)
    console.log(
      `   DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`
    )
    console.log(`   Load Complete: ${metrics.loadComplete.toFixed(2)}ms`)

    expect(metrics.domContentLoaded).toBeLessThan(3000)
    expect(metrics.loadComplete).toBeLessThan(5000)
  })

  test('should measure Core Web Vitals', async () => {
    const vitals = await window.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const vitalsData: Record<string, number> = {}

          entries.forEach((entry: PerformanceEntry) => {
            if (entry.name === 'first-contentful-paint') {
              vitalsData.FCP = entry.startTime
            }
          })

          if (Object.keys(vitalsData).length > 0) {
            observer.disconnect()
            resolve(vitalsData)
          }
        })

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })

        // Resolve after timeout if no metrics collected
        setTimeout(() => {
          observer.disconnect()
          resolve({})
        }, 5000)
      })
    })

    console.log('\n📊 Core Web Vitals')
    console.log(`   Metrics collected: ${JSON.stringify(vitals, null, 2)}`)

    // Note: Core Web Vitals might not be fully available in Electron
    // This test documents what's available
  })

  test('library page should render quickly', async () => {
    const metrics = await measurePageNavigation(window, async () => {
      await window.goto('/')
      await window.waitForSelector('[data-testid="library"]', {
        timeout: 5000
      })
    })

    console.log('\n📊 Library Page Load')
    console.log(`   Duration: ${metrics.duration.toFixed(2)}ms`)

    expect(metrics.duration).toBeLessThan(2000)
  })

  test('search interaction should be responsive', async () => {
    const metrics = await measureInteraction(window, async () => {
      const searchInput = window.locator('input[type="search"]').first()

      if (await searchInput.isVisible()) {
        await searchInput.click()
        await searchInput.fill('test game')
      }
    })

    console.log('\n📊 Search Interaction')
    console.log(`   Duration: ${metrics.duration.toFixed(2)}ms`)

    expect(metrics.duration).toBeLessThan(500)
  })

  test('settings page navigation should be fast', async () => {
    const metrics = await measurePageNavigation(window, async () => {
      const settingsButton = window.locator('[data-testid="settings"]').first()

      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await window.waitForLoadState('domcontentloaded')
      }
    })

    console.log('\n📊 Settings Page Navigation')
    console.log(`   Duration: ${metrics.duration.toFixed(2)}ms`)

    expect(metrics.duration).toBeLessThan(1000)
  })

  test('should measure memory usage during session', async () => {
    const getMemoryUsage = async () => {
      const metrics = await electronApp.evaluate(({ app }) => {
        const processMetrics = app.getAppMetrics()
        const totalMemory = processMetrics.reduce(
          (sum, process) => sum + process.memory.workingSetSize,
          0
        )
        return totalMemory
      })
      return metrics
    }

    const initialMemory = await getMemoryUsage()
    console.log(
      `\n📊 Memory Usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`
    )

    // Perform some operations
    await window.goto('/')
    await window.waitForTimeout(1000)

    const afterNavigationMemory = await getMemoryUsage()
    console.log(
      `   After navigation: ${(afterNavigationMemory / 1024 / 1024).toFixed(2)}MB`
    )

    const memoryIncrease = afterNavigationMemory - initialMemory
    console.log(
      `   Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
    )

    // Memory should not increase dramatically (allow 100MB increase)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
  })

  test('rapid navigation should not cause memory leaks', async () => {
    const getMemoryUsage = async () => {
      const metrics = await electronApp.evaluate(({ app }) => {
        const processMetrics = app.getAppMetrics()
        return processMetrics.reduce(
          (sum, process) => sum + process.memory.workingSetSize,
          0
        )
      })
      return metrics
    }

    const initialMemory = await getMemoryUsage()

    // Perform rapid navigation
    for (let i = 0; i < 10; i++) {
      await window.goto('/')
      await window.waitForTimeout(100)

      const settingsButton = window.locator('[data-testid="settings"]').first()
      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await window.waitForTimeout(100)
      }
    }

    const finalMemory = await getMemoryUsage()
    const memoryIncrease = finalMemory - initialMemory

    console.log('\n📊 Memory Leak Detection (10 rapid navigations)')
    console.log(`   Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

    // Memory should not grow excessively (allow 200MB for 10 navigations)
    expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024)
  })

  test('concurrent operations should not block UI', async () => {
    const startTime = performance.now()

    // Simulate multiple concurrent operations
    await Promise.all([
      window.evaluate(() => {
        return new Promise((resolve) => setTimeout(resolve, 100))
      }),
      window.evaluate(() => {
        return new Promise((resolve) => setTimeout(resolve, 100))
      }),
      window.evaluate(() => {
        return new Promise((resolve) => setTimeout(resolve, 100))
      })
    ])

    const endTime = performance.now()
    const duration = endTime - startTime

    console.log('\n📊 Concurrent Operations')
    console.log(`   Duration: ${duration.toFixed(2)}ms`)

    // Should complete close to 100ms (parallelism), not 300ms (sequential)
    expect(duration).toBeLessThan(200)
  })

  test('should measure rendering performance with large lists', async () => {
    const renderTime = await window.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now()

        // Create a large list
        const container = document.createElement('div')
        container.id = 'perf-test-container'

        for (let i = 0; i < 1000; i++) {
          const item = document.createElement('div')
          item.textContent = `Item ${i}`
          item.className = 'game-card'
          container.appendChild(item)
        }

        document.body.appendChild(container)

        requestAnimationFrame(() => {
          const endTime = performance.now()
          document.body.removeChild(container)
          resolve(endTime - startTime)
        })
      })
    })

    console.log('\n📊 Large List Rendering (1000 items)')
    console.log(`   Duration: ${renderTime.toFixed(2)}ms`)

    expect(renderTime).toBeLessThan(500)
  })

  test('should measure IPC round-trip time', async () => {
    const ipcDurations: number[] = []

    for (let i = 0; i < 50; i++) {
      const startTime = performance.now()

      await window.evaluate(async () => {
        // Simulate IPC call
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        if ((window as any).api?.getAppSettings) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
          await (window as any).api.getAppSettings()
        }
      })

      const endTime = performance.now()
      ipcDurations.push(endTime - startTime)
    }

    const sorted = ipcDurations.sort((a, b) => a - b)
    const mean =
      ipcDurations.reduce((sum, d) => sum + d, 0) / ipcDurations.length
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    console.log('\n📊 IPC Round-trip Performance (50 calls)')
    console.log(`   Mean: ${mean.toFixed(2)}ms`)
    console.log(`   P95:  ${p95.toFixed(2)}ms`)
    console.log(`   P99:  ${p99.toFixed(2)}ms`)

    expect(mean).toBeLessThan(50)
    expect(p95).toBeLessThan(100)
  })

  test('should measure frame rate during animations', async () => {
    const frameData = await window.evaluate(() => {
      return new Promise<{ fps: number; frameTime: number }>((resolve) => {
        let frames = 0
        let lastTime = performance.now()
        const frameTimes: number[] = []

        const measureFrames = () => {
          frames++
          const currentTime = performance.now()
          frameTimes.push(currentTime - lastTime)
          lastTime = currentTime

          if (frames < 60) {
            requestAnimationFrame(measureFrames)
          } else {
            const avgFrameTime =
              frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length
            const fps = 1000 / avgFrameTime

            resolve({
              fps,
              frameTime: avgFrameTime
            })
          }
        }

        requestAnimationFrame(measureFrames)
      })
    })

    console.log('\n📊 Frame Rate Performance')
    console.log(`   FPS: ${frameData.fps.toFixed(2)}`)
    console.log(`   Avg Frame Time: ${frameData.frameTime.toFixed(2)}ms`)

    // Should maintain at least 30 FPS (33.33ms per frame)
    expect(frameData.frameTime).toBeLessThan(33.33)
  })
})
