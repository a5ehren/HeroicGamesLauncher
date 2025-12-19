#!/usr/bin/env ts-node
/**
 * Performance Comparison Tool
 *
 * Compares performance test results between two runs or against baseline.
 * Usage:
 *   pnpm compare-performance                    # Compare latest with baseline
 *   pnpm compare-performance file1.json file2.json  # Compare two specific files
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, basename } from 'path'

interface PerformanceStats {
  mean: number
  median: number
  min: number
  max: number
  p95: number
  p99: number
  stdDev: number
}

interface TestResult {
  testName: string
  timestamp: string
  stats: PerformanceStats
  iterations: number
}

interface PerformanceReport {
  testSuite: string
  timestamp: string
  environment: {
    node: string
    platform: string
    arch: string
  }
  results: TestResult[]
}

interface ComparisonResult {
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
const REGRESSION_THRESHOLD = 0.1 // 10% slower is regression
const IMPROVEMENT_THRESHOLD = 0.1 // 10% faster is improvement

function loadReport(filepath: string): PerformanceReport {
  if (!existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`)
  }

  const data = readFileSync(filepath, 'utf-8')
  return JSON.parse(data)
}

function getLatestReport(): string | null {
  if (!existsSync(RESULTS_DIR)) {
    return null
  }

  const files = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('_report_') && f.endsWith('.json'))
    .map((f) => ({
      name: f,
      path: join(RESULTS_DIR, f),
      mtime: statSync(join(RESULTS_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  return files.length > 0 ? files[0].path : null
}

function compareReports(
  baseline: PerformanceReport,
  current: PerformanceReport
): ComparisonResult[] {
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

    const regression = meanChange > REGRESSION_THRESHOLD
    const improvement = meanChange < -IMPROVEMENT_THRESHOLD

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

function formatPercentChange(change: number): string {
  const percent = (change * 100).toFixed(1)
  const sign = change > 0 ? '+' : ''
  const color = change > 0.1 ? '🔴' : change < -0.1 ? '🟢' : '⚪'
  return `${color} ${sign}${percent}%`
}

function printComparison(
  baseline: PerformanceReport,
  current: PerformanceReport,
  comparisons: ComparisonResult[]
): void {
  console.log('\n' + '='.repeat(80))
  console.log('📊 PERFORMANCE COMPARISON')
  console.log('='.repeat(80))

  console.log(`\nBaseline: ${basename(BASELINE_FILE)}`)
  console.log(`  Test Suite: ${baseline.testSuite}`)
  console.log(`  Timestamp:  ${baseline.timestamp}`)
  console.log(
    `  Environment: Node ${baseline.environment.node} on ${baseline.environment.platform}`
  )

  console.log(`\nCurrent: Latest run`)
  console.log(`  Test Suite: ${current.testSuite}`)
  console.log(`  Timestamp:  ${current.timestamp}`)
  console.log(
    `  Environment: Node ${current.environment.node} on ${current.environment.platform}`
  )

  console.log('\n' + '-'.repeat(80))
  console.log('DETAILED RESULTS')
  console.log('-'.repeat(80) + '\n')

  for (const comp of comparisons) {
    const icon = comp.regression ? '❌' : comp.improvement ? '✅' : '➡️ '
    console.log(`${icon} ${comp.testName}`)
    console.log(
      `   Mean:   ${comp.baseline.mean.toFixed(2)}ms → ${comp.current.mean.toFixed(2)}ms ${formatPercentChange(comp.changes.meanChange)}`
    )
    console.log(
      `   Median: ${comp.baseline.median.toFixed(2)}ms → ${comp.current.median.toFixed(2)}ms ${formatPercentChange(comp.changes.medianChange)}`
    )
    console.log(
      `   P95:    ${comp.baseline.p95.toFixed(2)}ms → ${comp.current.p95.toFixed(2)}ms ${formatPercentChange(comp.changes.p95Change)}`
    )
    console.log(
      `   P99:    ${comp.baseline.p99.toFixed(2)}ms → ${comp.current.p99.toFixed(2)}ms ${formatPercentChange(comp.changes.p99Change)}`
    )
    console.log()
  }

  console.log('-'.repeat(80))
  console.log('SUMMARY')
  console.log('-'.repeat(80))

  const regressionCount = comparisons.filter((c) => c.regression).length
  const improvementCount = comparisons.filter((c) => c.improvement).length
  const stableCount = comparisons.filter(
    (c) => !c.regression && !c.improvement
  ).length

  console.log(`\n📈 Total tests: ${comparisons.length}`)
  console.log(`   🔴 Regressions:  ${regressionCount}`)
  console.log(`   🟢 Improvements: ${improvementCount}`)
  console.log(`   ⚪ Stable:       ${stableCount}`)

  if (regressionCount > 0) {
    console.log('\n⚠️  PERFORMANCE REGRESSIONS DETECTED!')
    console.log('\nRegressed tests:')
    comparisons
      .filter((c) => c.regression)
      .forEach((c) => {
        console.log(
          `  - ${c.testName}: ${formatPercentChange(c.changes.meanChange)}`
        )
      })
  } else if (improvementCount > 0) {
    console.log('\n🎉 PERFORMANCE IMPROVEMENTS DETECTED!')
    console.log('\nImproved tests:')
    comparisons
      .filter((c) => c.improvement)
      .forEach((c) => {
        console.log(
          `  - ${c.testName}: ${formatPercentChange(c.changes.meanChange)}`
        )
      })
  } else {
    console.log('\n✅ Performance is stable')
  }

  console.log('\n' + '='.repeat(80) + '\n')

  // Exit with error if regressions detected
  if (regressionCount > 0) {
    process.exit(1)
  }
}

function main(): void {
  const args = process.argv.slice(2)

  let baselineReport: PerformanceReport
  let currentReport: PerformanceReport

  if (args.length === 2) {
    // Compare two specific files
    console.log(`Comparing: ${args[0]} vs ${args[1]}`)
    baselineReport = loadReport(args[0])
    currentReport = loadReport(args[1])
  } else if (args.length === 0) {
    // Compare latest with baseline
    if (!existsSync(BASELINE_FILE)) {
      console.error('❌ No baseline found!')
      console.error(
        '   Run: SAVE_BASELINE=true pnpm test:performance to create one'
      )
      process.exit(1)
    }

    const latestFile = getLatestReport()
    if (!latestFile) {
      console.error('❌ No performance results found!')
      console.error('   Run: pnpm test:performance to generate results')
      process.exit(1)
    }

    console.log(`Comparing latest run against baseline...`)
    baselineReport = loadReport(BASELINE_FILE)
    currentReport = loadReport(latestFile)
  } else {
    console.error('Usage:')
    console.error(
      '  pnpm compare-performance                    # Compare latest with baseline'
    )
    console.error(
      '  pnpm compare-performance file1.json file2.json  # Compare two files'
    )
    process.exit(1)
  }

  const comparisons = compareReports(baselineReport, currentReport)

  if (comparisons.length === 0) {
    console.error('❌ No matching tests found between the two reports')
    process.exit(1)
  }

  printComparison(baselineReport, currentReport, comparisons)
}

main()
