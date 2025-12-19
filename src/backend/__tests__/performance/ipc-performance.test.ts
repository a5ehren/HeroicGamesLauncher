/**
 * IPC Performance Tests
 *
 * Tests the performance of IPC communication between main and renderer processes
 * - Handler response times
 * - Throughput under load
 * - Memory usage during IPC calls
 * - Large payload handling
 */

import {
  benchmarkFunction,
  printPerformanceStats,
  assertPerformanceThresholds,
  createMockIPCHandler,
  delay,
  generateMockGameLibrary,
  formatMemory
} from './utils/performance-metrics'
import {
  savePerformanceReport,
  saveAsBaseline,
  compareWithBaseline,
  printComparison,
  exportToCSV,
  type TestResult
} from './utils/performance-storage'

jest.mock('electron')

// Collect all test results for saving
const testResults: TestResult[] = []
const shouldSaveBaseline = process.env.SAVE_BASELINE === 'true'
const shouldCompare = process.env.COMPARE_BASELINE === 'true'

describe('IPC Performance Tests', () => {
  afterAll(() => {
    // Save all results to disk
    const report = savePerformanceReport('ipc-performance', testResults)
    console.log(`\n💾 Results saved: ${report}`)

    // Export to CSV for external analysis
    exportToCSV({
      testSuite: 'ipc-performance',
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      results: testResults
    })

    // Save as baseline if requested
    if (shouldSaveBaseline) {
      saveAsBaseline({
        testSuite: 'ipc-performance',
        timestamp: new Date().toISOString(),
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        },
        results: testResults
      })
    }

    // Compare with baseline if requested
    if (shouldCompare) {
      const comparisons = compareWithBaseline({
        testSuite: 'ipc-performance',
        timestamp: new Date().toISOString(),
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        },
        results: testResults
      })
      printComparison(comparisons)
    }
  })
  describe('Simple IPC Handler Performance', () => {
    it('should handle simple string responses quickly', async () => {
      const handler = createMockIPCHandler(() => 'test-response')

      const { stats } = await benchmarkFunction(handler, 1000)

      printPerformanceStats('Simple String Response', stats, 1000)

      // Save result for comparison
      testResults.push({
        testName: 'IPC: Simple String Response',
        timestamp: new Date().toISOString(),
        stats,
        iterations: 1000
      })

      assertPerformanceThresholds(stats, [], {
        maxDuration: 1, // Should be sub-millisecond
        maxP95Duration: 2,
        maxP99Duration: 5
      })
    })

    it('should handle simple object responses quickly', async () => {
      const handler = createMockIPCHandler(() => ({
        status: 'success',
        data: { value: 42 }
      }))

      const { stats } = await benchmarkFunction(handler, 1000)

      printPerformanceStats('Simple Object Response', stats, 1000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 1,
        maxP95Duration: 2,
        maxP99Duration: 5
      })
    })

    it('should handle async operations efficiently', async () => {
      const handler = createMockIPCHandler(async () => {
        await delay(10) // Simulate I/O operation
        return { status: 'complete' }
      })

      const { stats } = await benchmarkFunction(handler, 100)

      printPerformanceStats('Async Operation', stats, 100)

      // Should be close to 10ms with minimal overhead
      assertPerformanceThresholds(stats, [], {
        maxDuration: 15,
        maxP95Duration: 20,
        maxP99Duration: 25
      })
    })
  })

  describe('Large Payload Performance', () => {
    it('should handle typical game library (100 games)', async () => {
      const typicalLibrary = generateMockGameLibrary(100)
      const handler = createMockIPCHandler(() => typicalLibrary)

      const { stats, metrics } = await benchmarkFunction(handler, 100)

      printPerformanceStats('Typical Game Library (100)', stats, 100)
      console.log(`   Memory: ${formatMemory(metrics[0].memoryDelta.heapUsed)}`)

      // Save result for comparison
      testResults.push({
        testName: 'IPC: Typical Library (100 games)',
        timestamp: new Date().toISOString(),
        stats,
        iterations: 100,
        metadata: { memoryDelta: metrics[0].memoryDelta.heapUsed }
      })

      assertPerformanceThresholds(stats, metrics, {
        maxDuration: 5,
        maxP95Duration: 10,
        maxMemoryIncrease: 1024 * 1024 // 1MB
      })
    })

    it('should handle medium game library (500 games)', async () => {
      const mediumLibrary = generateMockGameLibrary(500)
      const handler = createMockIPCHandler(() => mediumLibrary)

      const { stats, metrics } = await benchmarkFunction(handler, 50)

      printPerformanceStats('Medium Game Library (500)', stats, 50)
      console.log(`   Memory: ${formatMemory(metrics[0].memoryDelta.heapUsed)}`)

      // Save result for comparison
      testResults.push({
        testName: 'IPC: Medium Library (500 games)',
        timestamp: new Date().toISOString(),
        stats,
        iterations: 50,
        metadata: { memoryDelta: metrics[0].memoryDelta.heapUsed }
      })

      assertPerformanceThresholds(stats, metrics, {
        maxDuration: 20,
        maxP95Duration: 30,
        maxMemoryIncrease: 5 * 1024 * 1024 // 5MB
      })
    })

    it('should handle large game library (1000 games)', async () => {
      const largeLibrary = generateMockGameLibrary(1000)
      const handler = createMockIPCHandler(() => largeLibrary)

      const { stats, metrics } = await benchmarkFunction(handler, 20)

      printPerformanceStats('Large Game Library (1000)', stats, 20)
      console.log(`   Memory: ${formatMemory(metrics[0].memoryDelta.heapUsed)}`)

      // Save result for comparison
      testResults.push({
        testName: 'IPC: Large Library (1000 games)',
        timestamp: new Date().toISOString(),
        stats,
        iterations: 20,
        metadata: { memoryDelta: metrics[0].memoryDelta.heapUsed }
      })

      assertPerformanceThresholds(stats, metrics, {
        maxDuration: 50,
        maxP95Duration: 75,
        maxMemoryIncrease: 10 * 1024 * 1024 // 10MB
      })
    })

    it('should handle very large game library (5000 games)', async () => {
      const veryLargeLibrary = generateMockGameLibrary(5000)
      const handler = createMockIPCHandler(() => veryLargeLibrary)

      const { stats, metrics } = await benchmarkFunction(handler, 10)

      printPerformanceStats('Very Large Game Library (5000)', stats, 10)
      console.log(`   Memory: ${formatMemory(metrics[0].memoryDelta.heapUsed)}`)

      // Save result for comparison
      testResults.push({
        testName: 'IPC: Very Large Library (5000 games)',
        timestamp: new Date().toISOString(),
        stats,
        iterations: 10,
        metadata: { memoryDelta: metrics[0].memoryDelta.heapUsed }
      })

      assertPerformanceThresholds(stats, metrics, {
        maxDuration: 250,
        maxP95Duration: 350,
        maxMemoryIncrease: 50 * 1024 * 1024 // 50MB
      })
    })
  })

  describe('Concurrent IPC Calls', () => {
    it('should handle multiple concurrent simple calls', async () => {
      const handler = createMockIPCHandler(() => ({ value: 42 }))

      const benchmark = async () => {
        const promises = Array.from({ length: 10 }, () => handler())
        return await Promise.all(promises)
      }

      const { stats } = await benchmarkFunction(benchmark, 100)

      printPerformanceStats('10 Concurrent Simple Calls', stats, 100)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 10,
        maxP95Duration: 15,
        maxP99Duration: 20
      })
    })

    it('should handle multiple concurrent async calls', async () => {
      const handler = createMockIPCHandler(async () => {
        await delay(5)
        return { status: 'complete' }
      })

      const benchmark = async () => {
        const promises = Array.from({ length: 10 }, () => handler())
        return await Promise.all(promises)
      }

      const { stats } = await benchmarkFunction(benchmark, 50)

      printPerformanceStats('10 Concurrent Async Calls', stats, 50)

      // Should complete in ~5ms due to parallelism, not 50ms
      assertPerformanceThresholds(stats, [], {
        maxDuration: 15,
        maxP95Duration: 20,
        maxP99Duration: 30
      })
    })
  })

  describe('IPC Handler Error Performance', () => {
    it('should handle errors efficiently', async () => {
      const handler = createMockIPCHandler(async () => {
        throw new Error('Test error')
      })

      const benchmark = async () => {
        try {
          await handler()
          return null
        } catch (error) {
          return error
        }
      }

      const { stats } = await benchmarkFunction(benchmark, 1000)

      printPerformanceStats('Error Handling', stats, 1000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 1,
        maxP95Duration: 2,
        maxP99Duration: 5
      })
    })
  })

  describe('Sequential IPC Call Performance', () => {
    it('should handle rapid sequential calls', async () => {
      const handler = createMockIPCHandler(() => ({ value: Math.random() }))

      const benchmark = async () => {
        const results = []
        for (let i = 0; i < 50; i++) {
          results.push(await handler())
        }
        return results
      }

      const { stats } = await benchmarkFunction(benchmark, 20)

      printPerformanceStats('50 Sequential Calls', stats, 20)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 50,
        maxP95Duration: 75,
        maxP99Duration: 100
      })
    })
  })

  describe('Complex Data Serialization Performance', () => {
    it('should handle deeply nested objects', async () => {
      const createNestedObject = (depth: number): any => {
        if (depth === 0) return { value: 'leaf' }
        return {
          level: depth,
          nested: createNestedObject(depth - 1),
          array: Array.from({ length: 5 }, (_, i) => ({ id: i }))
        }
      }

      const complexData = createNestedObject(10)
      const handler = createMockIPCHandler(() => complexData)

      const { stats, metrics } = await benchmarkFunction(handler, 100)

      printPerformanceStats('Deeply Nested Object (10 levels)', stats, 100)
      console.log(`   Memory: ${formatMemory(metrics[0].memoryDelta.heapUsed)}`)

      assertPerformanceThresholds(stats, metrics, {
        maxDuration: 5,
        maxP95Duration: 10,
        maxMemoryIncrease: 1024 * 1024 // 1MB
      })
    })

    it('should handle large arrays efficiently', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        metadata: { created: new Date().toISOString() }
      }))

      const handler = createMockIPCHandler(() => largeArray)

      const { stats, metrics } = await benchmarkFunction(handler, 50)

      printPerformanceStats('Large Array (10k items)', stats, 50)
      console.log(`   Memory: ${formatMemory(metrics[0].memoryDelta.heapUsed)}`)

      assertPerformanceThresholds(stats, metrics, {
        maxDuration: 30,
        maxP95Duration: 50,
        maxMemoryIncrease: 10 * 1024 * 1024 // 10MB
      })
    })
  })

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated calls', async () => {
      const handler = createMockIPCHandler(() => {
        // Create temporary objects that should be garbage collected
        const temp = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: new Array(100).fill(Math.random())
        }))
        return { count: temp.length }
      })

      const { metrics } = await benchmarkFunction(handler, 100)

      // Calculate memory growth trend
      const firstHalf = metrics
        .slice(0, 50)
        .reduce((sum, m) => sum + m.memoryDelta.heapUsed, 0)
      const secondHalf = metrics
        .slice(50)
        .reduce((sum, m) => sum + m.memoryDelta.heapUsed, 0)

      const memoryGrowthRatio = secondHalf / firstHalf

      console.log(`\n🔍 Memory Leak Detection`)
      console.log(`   First Half Memory: ${formatMemory(firstHalf)}`)
      console.log(`   Second Half Memory: ${formatMemory(secondHalf)}`)
      console.log(`   Growth Ratio: ${memoryGrowthRatio.toFixed(2)}x`)

      // Memory should not grow significantly between first and second half
      // Allow for some variance but should be roughly similar
      expect(memoryGrowthRatio).toBeLessThan(2.0)
    })
  })
})
