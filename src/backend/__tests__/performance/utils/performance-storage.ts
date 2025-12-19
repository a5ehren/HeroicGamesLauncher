/**
 * Performance Results Storage
 *
 * Utilities for saving and comparing performance test results over time.
 * Results are stored in JSON format with timestamps for trend analysis.
 */

import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  statSync
} from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import type { PerformanceStats } from './performance-metrics'

export interface TestResult {
  testName: string
  timestamp: string
  commit?: string
  branch?: string
  stats: PerformanceStats
  iterations: number
  metadata?: {
    memoryDelta?: number
    additionalMetrics?: Record<string, number>
  }
}

export interface PerformanceReport {
  testSuite: string
  timestamp: string
  environment: {
    node: string
    platform: string
    arch: string
  }
  results: TestResult[]
}

export interface ComparisonResult {
  testName: string
  baseline: PerformanceStats
  current: PerformanceStats
  changes: {
    meanChange: number
    medianChange: number
    p95Change: number
    p99Change: number
  }
  regression: boolean
  improvement: boolean
}

const RESULTS_DIR = join(process.cwd(), 'performance-results')
const BASELINE_FILE = join(RESULTS_DIR, 'baseline.json')

/**
 * Ensure results directory exists
 */
function ensureResultsDir(): void {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true })
  }
}

/**
 * Get git commit hash (if available)
 */
function getGitCommit(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return undefined
  }
}

/**
 * Get git branch (if available)
 */
function getGitBranch(): string | undefined {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8'
    }).trim()
  } catch {
    return undefined
  }
}

/**
 * Save a single test result
 */
export function saveTestResult(
  testSuite: string,
  testName: string,
  stats: PerformanceStats,
  iterations: number,
  metadata?: TestResult['metadata']
): void {
  ensureResultsDir()

  const result: TestResult = {
    testName,
    timestamp: new Date().toISOString(),
    commit: getGitCommit(),
    branch: getGitBranch(),
    stats,
    iterations,
    metadata
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${testSuite}_${timestamp}.json`
  const filepath = join(RESULTS_DIR, filename)

  writeFileSync(filepath, JSON.stringify(result, null, 2))
}

/**
 * Save a complete performance report
 */
export function savePerformanceReport(
  testSuite: string,
  results: TestResult[]
): string {
  ensureResultsDir()

  const report: PerformanceReport = {
    testSuite,
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    results
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${testSuite}_report_${timestamp}.json`
  const filepath = join(RESULTS_DIR, filename)

  writeFileSync(filepath, JSON.stringify(report, null, 2))

  return filepath
}

/**
 * Save current results as baseline for future comparisons
 */
export function saveAsBaseline(report: PerformanceReport): void {
  ensureResultsDir()
  writeFileSync(BASELINE_FILE, JSON.stringify(report, null, 2))
  console.log(`\n✅ Baseline saved: ${BASELINE_FILE}`)
}

/**
 * Load baseline results
 */
export function loadBaseline(): PerformanceReport | null {
  if (!existsSync(BASELINE_FILE)) {
    return null
  }

  try {
    const data = readFileSync(BASELINE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load baseline:', error)
    return null
  }
}

/**
 * Load a specific performance report
 */
export function loadReport(filepath: string): PerformanceReport | null {
  if (!existsSync(filepath)) {
    return null
  }

  try {
    const data = readFileSync(filepath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Failed to load report from ${filepath}:`, error)
    return null
  }
}

/**
 * Compare current results with baseline
 */
export function compareWithBaseline(
  current: PerformanceReport,
  regressionThreshold: number = 0.1 // 10% slower is regression
): ComparisonResult[] {
  const baseline = loadBaseline()

  if (!baseline) {
    console.warn(
      '⚠️  No baseline found. Run with --save-baseline to create one.'
    )
    return []
  }

  const comparisons: ComparisonResult[] = []

  for (const currentResult of current.results) {
    const baselineResult = baseline.results.find(
      (r) => r.testName === currentResult.testName
    )

    if (!baselineResult) {
      console.warn(`⚠️  No baseline found for test: ${currentResult.testName}`)
      continue
    }

    const meanChange =
      (currentResult.stats.mean - baselineResult.stats.mean) /
      baselineResult.stats.mean
    const medianChange =
      (currentResult.stats.median - baselineResult.stats.median) /
      baselineResult.stats.median
    const p95Change =
      (currentResult.stats.p95 - baselineResult.stats.p95) /
      baselineResult.stats.p95
    const p99Change =
      (currentResult.stats.p99 - baselineResult.stats.p99) /
      baselineResult.stats.p99

    const regression = meanChange > regressionThreshold
    const improvement = meanChange < -regressionThreshold

    comparisons.push({
      testName: currentResult.testName,
      baseline: baselineResult.stats,
      current: currentResult.stats,
      changes: {
        meanChange,
        medianChange,
        p95Change,
        p99Change
      },
      regression,
      improvement
    })
  }

  return comparisons
}

/**
 * Print comparison results in a readable format
 */
export function printComparison(comparisons: ComparisonResult[]): void {
  if (comparisons.length === 0) {
    console.log('\n📊 No comparisons available')
    return
  }

  console.log('\n📊 Performance Comparison vs Baseline\n')

  let hasRegressions = false
  let hasImprovements = false

  for (const comp of comparisons) {
    const icon = comp.regression ? '❌' : comp.improvement ? '✅' : '➡️ '
    console.log(`${icon} ${comp.testName}`)
    console.log(
      `   Mean:   ${comp.baseline.mean.toFixed(2)}ms → ${comp.current.mean.toFixed(2)}ms (${formatPercentChange(comp.changes.meanChange)})`
    )
    console.log(
      `   Median: ${comp.baseline.median.toFixed(2)}ms → ${comp.current.median.toFixed(2)}ms (${formatPercentChange(comp.changes.medianChange)})`
    )
    console.log(
      `   P95:    ${comp.baseline.p95.toFixed(2)}ms → ${comp.current.p95.toFixed(2)}ms (${formatPercentChange(comp.changes.p95Change)})`
    )
    console.log(
      `   P99:    ${comp.baseline.p99.toFixed(2)}ms → ${comp.current.p99.toFixed(2)}ms (${formatPercentChange(comp.changes.p99Change)})`
    )
    console.log()

    if (comp.regression) hasRegressions = true
    if (comp.improvement) hasImprovements = true
  }

  console.log('\n📈 Summary')
  console.log(`   Total tests: ${comparisons.length}`)
  console.log(
    `   Regressions: ${comparisons.filter((c) => c.regression).length}`
  )
  console.log(
    `   Improvements: ${comparisons.filter((c) => c.improvement).length}`
  )
  console.log(
    `   Stable: ${comparisons.filter((c) => !c.regression && !c.improvement).length}`
  )

  if (hasRegressions) {
    console.log('\n⚠️  Performance regressions detected!')
  } else if (hasImprovements) {
    console.log('\n🎉 Performance improvements detected!')
  } else {
    console.log('\n✅ Performance is stable')
  }
}

/**
 * Format percentage change for display
 */
function formatPercentChange(change: number): string {
  const percent = (change * 100).toFixed(1)
  const sign = change > 0 ? '+' : ''
  const color = change > 0 ? '↗' : change < 0 ? '↘' : '→'
  return `${color} ${sign}${percent}%`
}

/**
 * Check if performance test should fail based on comparisons
 */
export function shouldFailOnRegression(
  comparisons: ComparisonResult[]
): boolean {
  return comparisons.some((c) => c.regression)
}

/**
 * Export results as CSV for external analysis
 */
export function exportToCSV(report: PerformanceReport): string {
  const lines = [
    'Test Name,Timestamp,Mean (ms),Median (ms),Min (ms),Max (ms),P95 (ms),P99 (ms),Std Dev (ms),Iterations'
  ]

  for (const result of report.results) {
    lines.push(
      [
        result.testName,
        result.timestamp,
        result.stats.mean.toFixed(2),
        result.stats.median.toFixed(2),
        result.stats.min.toFixed(2),
        result.stats.max.toFixed(2),
        result.stats.p95.toFixed(2),
        result.stats.p99.toFixed(2),
        result.stats.stdDev.toFixed(2),
        result.iterations
      ].join(',')
    )
  }

  const csv = lines.join('\n')
  const filename = `${report.testSuite}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
  const filepath = join(RESULTS_DIR, filename)

  writeFileSync(filepath, csv)
  console.log(`\n📊 CSV exported: ${filepath}`)

  return filepath
}

/**
 * Helper to get results directory
 */
export function getResultsDir(): string {
  return RESULTS_DIR
}

/**
 * Clean up old result files (keep last N)
 */
export function cleanupOldResults(keepLast: number = 10): void {
  if (!existsSync(RESULTS_DIR)) {
    return
  }

  const files = readdirSync(RESULTS_DIR)
    .filter((f: string) => f.endsWith('.json') && f !== 'baseline.json')
    .map((f: string) => ({
      name: f,
      path: join(RESULTS_DIR, f),
      mtime: statSync(join(RESULTS_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  const toDelete = files.slice(keepLast)

  for (const file of toDelete) {
    try {
      unlinkSync(file.path)
      console.log(`🗑️  Deleted old result: ${file.name}`)
    } catch (error) {
      console.error(`Failed to delete ${file.name}:`, error)
    }
  }

  if (toDelete.length > 0) {
    console.log(`\n✅ Cleaned up ${toDelete.length} old result files`)
  }
}
