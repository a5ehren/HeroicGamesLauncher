/**
 * Performance testing utilities for Heroic Games Launcher
 *
 * Provides tools for measuring:
 * - Execution time
 * - Memory usage
 * - CPU usage
 * - Throughput metrics
 */

import { performance } from 'perf_hooks'

export interface PerformanceMetrics {
  duration: number
  memoryBefore: NodeJS.MemoryUsage
  memoryAfter: NodeJS.MemoryUsage
  memoryDelta: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
}

export interface PerformanceStats {
  mean: number
  median: number
  min: number
  max: number
  p95: number
  p99: number
  stdDev: number
}

export interface PerformanceThresholds {
  maxDuration?: number
  maxMemoryIncrease?: number
  maxP95Duration?: number
  maxP99Duration?: number
}

/**
 * Measures performance of an async function
 */
export async function measurePerformance<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const memoryBefore = process.memoryUsage()
  const startTime = performance.now()

  const result = await fn()

  const endTime = performance.now()
  const memoryAfter = process.memoryUsage()

  const metrics: PerformanceMetrics = {
    duration: endTime - startTime,
    memoryBefore,
    memoryAfter,
    memoryDelta: {
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      external: memoryAfter.external - memoryBefore.external,
      rss: memoryAfter.rss - memoryBefore.rss
    }
  }

  return { result, metrics }
}

/**
 * Runs a function multiple times and collects performance statistics
 */
export async function benchmarkFunction<T>(
  fn: () => Promise<T> | T,
  iterations: number = 100
): Promise<{
  results: T[]
  durations: number[]
  stats: PerformanceStats
  metrics: PerformanceMetrics[]
}> {
  const results: T[] = []
  const durations: number[] = []
  const metrics: PerformanceMetrics[] = []

  for (let i = 0; i < iterations; i++) {
    const { result, metrics: iterationMetrics } = await measurePerformance(fn)
    results.push(result)
    durations.push(iterationMetrics.duration)
    metrics.push(iterationMetrics)
  }

  const stats = calculateStats(durations)

  return { results, durations, stats, metrics }
}

/**
 * Calculate statistical metrics from an array of durations
 */
export function calculateStats(durations: number[]): PerformanceStats {
  const sorted = [...durations].sort((a, b) => a - b)
  const n = sorted.length

  const mean = sorted.reduce((sum, val) => sum + val, 0) / n
  const median = sorted[Math.floor(n / 2)]
  const min = sorted[0]
  const max = sorted[n - 1]
  const p95 = sorted[Math.floor(n * 0.95)]
  const p99 = sorted[Math.floor(n * 0.99)]

  const variance =
    sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
  const stdDev = Math.sqrt(variance)

  return { mean, median, min, max, p95, p99, stdDev }
}

/**
 * Assert that performance metrics meet specified thresholds
 */
export function assertPerformanceThresholds(
  stats: PerformanceStats,
  metrics: PerformanceMetrics[],
  thresholds: PerformanceThresholds
): void {
  if (thresholds.maxDuration !== undefined) {
    expect(stats.mean).toBeLessThan(thresholds.maxDuration)
  }

  if (thresholds.maxP95Duration !== undefined) {
    expect(stats.p95).toBeLessThan(thresholds.maxP95Duration)
  }

  if (thresholds.maxP99Duration !== undefined) {
    expect(stats.p99).toBeLessThan(thresholds.maxP99Duration)
  }

  if (thresholds.maxMemoryIncrease !== undefined) {
    const maxMemoryDelta = Math.max(
      ...metrics.map((m) => m.memoryDelta.heapUsed)
    )
    expect(maxMemoryDelta).toBeLessThan(thresholds.maxMemoryIncrease)
  }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Format memory size in human-readable format
 */
export function formatMemory(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Print performance stats to console
 */
export function printPerformanceStats(
  name: string,
  stats: PerformanceStats,
  iterations: number
): void {
  console.log(`\n📊 Performance Stats: ${name}`)
  console.log(`   Iterations: ${iterations}`)
  console.log(`   Mean:   ${formatDuration(stats.mean)}`)
  console.log(`   Median: ${formatDuration(stats.median)}`)
  console.log(`   Min:    ${formatDuration(stats.min)}`)
  console.log(`   Max:    ${formatDuration(stats.max)}`)
  console.log(`   P95:    ${formatDuration(stats.p95)}`)
  console.log(`   P99:    ${formatDuration(stats.p99)}`)
  console.log(`   StdDev: ${formatDuration(stats.stdDev)}`)
}

/**
 * Create a mock IPC handler for testing
 */
export function createMockIPCHandler<T>(
  implementation: () => Promise<T> | T
): () => Promise<T> {
  return async () => {
    return await implementation()
  }
}

/**
 * Simulate realistic delays for testing
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate mock data for performance testing
 */
export function generateMockGameLibrary(size: number): Array<{
  app_name: string
  title: string
  art_cover: string
  install_path: string
  is_installed: boolean
}> {
  return Array.from({ length: size }, (_, i) => ({
    app_name: `game_${i}`,
    title: `Game ${i}`,
    art_cover: `https://example.com/cover_${i}.jpg`,
    install_path: `/games/game_${i}`,
    is_installed: i % 3 === 0
  }))
}
