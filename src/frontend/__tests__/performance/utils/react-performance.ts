/**
 * React Performance Testing Utilities
 *
 * Provides tools for measuring React component performance:
 * - Render times
 * - Re-render counts
 * - Update performance
 * - Memory usage
 */

import { render, RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

export interface RenderPerformanceMetrics {
  initialRenderTime: number
  totalRenders: number
  averageRenderTime: number
  memoryBefore: number
  memoryAfter: number
  memoryDelta: number
}

export interface UpdatePerformanceMetrics {
  updateTime: number
  renderCount: number
  memoryDelta: number
}

export interface ComponentPerformanceStats {
  initialRender: number
  updates: number[]
  averageUpdate: number
  maxUpdate: number
  minUpdate: number
  p95Update: number
}

/**
 * Measure initial render performance of a React component
 */
export function measureRenderPerformance(
  component: ReactElement
): RenderPerformanceMetrics {
  const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0
  const startTime = performance.now()

  const result = render(component)

  const endTime = performance.now()
  const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0

  return {
    initialRenderTime: endTime - startTime,
    totalRenders: 1,
    averageRenderTime: endTime - startTime,
    memoryBefore,
    memoryAfter,
    memoryDelta: memoryAfter - memoryBefore
  }
}

/**
 * Measure re-render performance
 */
export async function measureReRenderPerformance(
  renderFn: () => RenderResult,
  updateFn: (result: RenderResult) => Promise<void> | void,
  iterations: number = 10
): Promise<{
  initialRender: number
  updateTimes: number[]
  stats: ComponentPerformanceStats
}> {
  const startTime = performance.now()
  const result = renderFn()
  const initialRenderTime = performance.now() - startTime

  const updateTimes: number[] = []

  for (let i = 0; i < iterations; i++) {
    const updateStart = performance.now()
    await updateFn(result)
    const updateEnd = performance.now()
    updateTimes.push(updateEnd - updateStart)
  }

  const sorted = [...updateTimes].sort((a, b) => a - b)
  const stats: ComponentPerformanceStats = {
    initialRender: initialRenderTime,
    updates: updateTimes,
    averageUpdate:
      updateTimes.reduce((sum, t) => sum + t, 0) / updateTimes.length,
    maxUpdate: sorted[sorted.length - 1],
    minUpdate: sorted[0],
    p95Update: sorted[Math.floor(sorted.length * 0.95)]
  }

  return { initialRender: initialRenderTime, updateTimes, stats }
}

/**
 * Count renders using a custom hook
 */
export function createRenderCounter(): {
  getRenderCount: () => number
  reset: () => void
  useRenderCounter: () => void
} {
  let renderCount = 0

  return {
    getRenderCount: () => renderCount,
    reset: () => {
      renderCount = 0
    },
    useRenderCounter: () => {
      renderCount++
    }
  }
}

/**
 * Measure list rendering performance
 */
export function measureListRenderPerformance(
  renderList: (size: number) => ReactElement,
  sizes: number[]
): Array<{ size: number; renderTime: number; memoryDelta: number }> {
  return sizes.map((size) => {
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0
    const startTime = performance.now()

    render(renderList(size))

    const endTime = performance.now()
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0

    return {
      size,
      renderTime: endTime - startTime,
      memoryDelta: memoryAfter - memoryBefore
    }
  })
}

/**
 * Format React performance stats for display
 */
export function formatReactPerformanceStats(
  stats: ComponentPerformanceStats
): string {
  return `
  Initial Render: ${stats.initialRender.toFixed(2)}ms
  Average Update: ${stats.averageUpdate.toFixed(2)}ms
  Min Update:     ${stats.minUpdate.toFixed(2)}ms
  Max Update:     ${stats.maxUpdate.toFixed(2)}ms
  P95 Update:     ${stats.p95Update.toFixed(2)}ms
  Total Updates:  ${stats.updates.length}
  `
}

/**
 * Print React performance stats to console
 */
export function printReactPerformanceStats(
  name: string,
  stats: ComponentPerformanceStats
): void {
  console.log(`\n⚛️  React Performance: ${name}`)
  console.log(formatReactPerformanceStats(stats))
}

/**
 * Assert React performance thresholds
 */
export function assertReactPerformanceThresholds(
  stats: ComponentPerformanceStats,
  thresholds: {
    maxInitialRender?: number
    maxAverageUpdate?: number
    maxP95Update?: number
    maxRenders?: number
  }
): void {
  if (thresholds.maxInitialRender !== undefined) {
    expect(stats.initialRender).toBeLessThan(thresholds.maxInitialRender)
  }

  if (thresholds.maxAverageUpdate !== undefined) {
    expect(stats.averageUpdate).toBeLessThan(thresholds.maxAverageUpdate)
  }

  if (thresholds.maxP95Update !== undefined) {
    expect(stats.p95Update).toBeLessThan(thresholds.maxP95Update)
  }

  if (thresholds.maxRenders !== undefined) {
    expect(stats.updates.length).toBeLessThanOrEqual(thresholds.maxRenders)
  }
}

/**
 * Mock window.api for testing
 */
export function createMockWindowAPI(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).api = {
    getGameInfo: jest.fn().mockResolvedValue({}),
    getGameSettings: jest.fn().mockResolvedValue({}),
    getLibrary: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    off: jest.fn()
  }
}

/**
 * Create mock game data for testing
 */
export function createMockGames(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    app_name: `game_${i}`,
    title: `Game ${i}`,
    art_cover: `https://example.com/cover_${i}.jpg`,
    art_square: `https://example.com/square_${i}.jpg`,
    install: {
      install_path: `/games/game_${i}`,
      is_installed: i % 3 === 0,
      install_size: '10GB',
      platform: 'linux' as const
    },
    runner: 'legendary' as const,
    is_installed: i % 3 === 0
  }))
}

/**
 * Simulate user interaction delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Measure multiple renders and calculate statistics
 */
export async function benchmarkComponentRender(
  renderFn: () => void,
  iterations: number = 100
): Promise<{
  durations: number[]
  mean: number
  median: number
  p95: number
  p99: number
}> {
  const durations: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    renderFn()
    const end = performance.now()
    durations.push(end - start)
  }

  const sorted = [...durations].sort((a, b) => a - b)
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length

  return {
    durations,
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  }
}
