/**
 * Test Result Tracker
 *
 * Helper utility to simplify tracking test results across test suites
 */

import type { PerformanceStats } from './performance-metrics'
import type { TestResult } from './performance-storage'

export class TestResultTracker {
  private results: TestResult[] = []

  /**
   * Track a test result
   */
  track(
    testName: string,
    stats: PerformanceStats,
    iterations: number,
    metadata?: TestResult['metadata']
  ): void {
    this.results.push({
      testName,
      timestamp: new Date().toISOString(),
      stats,
      iterations,
      metadata
    })
  }

  /**
   * Get all tracked results
   */
  getResults(): TestResult[] {
    return this.results
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results = []
  }

  /**
   * Get result count
   */
  count(): number {
    return this.results.length
  }
}

/**
 * Create a tracker instance for a test suite
 */
export function createTracker(): TestResultTracker {
  return new TestResultTracker()
}
