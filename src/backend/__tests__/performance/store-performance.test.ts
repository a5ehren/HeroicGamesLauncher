/**
 * electron-store Performance Tests
 *
 * Tests the performance of electron-store operations
 * - Read performance
 * - Write performance
 * - Bulk operations
 * - Large data handling
 * - Concurrent access
 */

import Store from 'electron-store'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, rmSync } from 'fs'
import {
  benchmarkFunction,
  printPerformanceStats,
  assertPerformanceThresholds,
  generateMockGameLibrary,
  formatMemory
} from './utils/performance-metrics'

jest.mock('electron')

describe('electron-store Performance Tests', () => {
  let testDir: string
  let store: Store

  beforeEach(() => {
    // Create unique test directory for each test
    testDir = join(tmpdir(), `heroic-test-${Date.now()}-${Math.random()}`)
    mkdirSync(testDir, { recursive: true })

    store = new Store({
      cwd: testDir,
      name: 'performance-test',
      clearInvalidConfig: true
    })
  })

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Basic Read Performance', () => {
    it('should read simple string values quickly', async () => {
      store.set('test-key', 'test-value')

      const benchmark = () => store.get('test-key')
      const { stats } = await benchmarkFunction(benchmark, 10000)

      printPerformanceStats('Simple String Read', stats, 10000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 0.5,
        maxP95Duration: 1,
        maxP99Duration: 2
      })
    })

    it('should read simple object values quickly', async () => {
      store.set('test-obj', { foo: 'bar', baz: 42 })

      const benchmark = () => store.get('test-obj')
      const { stats } = await benchmarkFunction(benchmark, 10000)

      printPerformanceStats('Simple Object Read', stats, 10000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 0.5,
        maxP95Duration: 1,
        maxP99Duration: 2
      })
    })

    it('should handle missing keys efficiently', async () => {
      const benchmark = () => store.get('non-existent-key', 'default')
      const { stats } = await benchmarkFunction(benchmark, 10000)

      printPerformanceStats('Missing Key Read (with default)', stats, 10000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 0.5,
        maxP95Duration: 1,
        maxP99Duration: 2
      })
    })
  })

  describe('Basic Write Performance', () => {
    it('should write simple values quickly', async () => {
      let counter = 0
      const benchmark = () => {
        store.set('counter', counter++)
      }

      const { stats } = await benchmarkFunction(benchmark, 1000)

      printPerformanceStats('Simple Value Write', stats, 1000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 2,
        maxP95Duration: 5,
        maxP99Duration: 10
      })
    })

    it('should write object values efficiently', async () => {
      let counter = 0
      const benchmark = () => {
        store.set('data', {
          id: counter++,
          timestamp: Date.now(),
          metadata: { version: 1 }
        })
      }

      const { stats } = await benchmarkFunction(benchmark, 1000)

      printPerformanceStats('Object Write', stats, 1000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 3,
        maxP95Duration: 7,
        maxP99Duration: 15
      })
    })
  })

  describe('Large Data Performance', () => {
    it('should handle typical game library (100 games)', async () => {
      const library = generateMockGameLibrary(100)

      const writeBenchmark = () => store.set('library', library)
      const { stats: writeStats, metrics: writeMetrics } =
        await benchmarkFunction(writeBenchmark, 100)

      printPerformanceStats('Write Typical Library (100)', writeStats, 100)
      console.log(
        `   Memory: ${formatMemory(writeMetrics[0].memoryDelta.heapUsed)}`
      )

      assertPerformanceThresholds(writeStats, writeMetrics, {
        maxDuration: 20,
        maxP95Duration: 30,
        maxMemoryIncrease: 2 * 1024 * 1024 // 2MB
      })

      const readBenchmark = () => store.get('library')
      const { stats: readStats } = await benchmarkFunction(readBenchmark, 1000)

      printPerformanceStats('Read Typical Library (100)', readStats, 1000)

      assertPerformanceThresholds(readStats, [], {
        maxDuration: 5,
        maxP95Duration: 10,
        maxP99Duration: 15
      })
    })

    it('should handle medium game library (500 games)', async () => {
      const library = generateMockGameLibrary(500)

      const writeBenchmark = () => store.set('library', library)
      const { stats: writeStats, metrics: writeMetrics } =
        await benchmarkFunction(writeBenchmark, 50)

      printPerformanceStats('Write Medium Library (500)', writeStats, 50)
      console.log(
        `   Memory: ${formatMemory(writeMetrics[0].memoryDelta.heapUsed)}`
      )

      assertPerformanceThresholds(writeStats, writeMetrics, {
        maxDuration: 50,
        maxP95Duration: 75,
        maxMemoryIncrease: 10 * 1024 * 1024 // 10MB
      })

      const readBenchmark = () => store.get('library')
      const { stats: readStats } = await benchmarkFunction(readBenchmark, 500)

      printPerformanceStats('Read Medium Library (500)', readStats, 500)

      assertPerformanceThresholds(readStats, [], {
        maxDuration: 10,
        maxP95Duration: 20,
        maxP99Duration: 30
      })
    })

    it('should handle large game library (1000 games)', async () => {
      const library = generateMockGameLibrary(1000)

      const writeBenchmark = () => store.set('library', library)
      const { stats: writeStats, metrics: writeMetrics } =
        await benchmarkFunction(writeBenchmark, 20)

      printPerformanceStats('Write Large Library (1000)', writeStats, 20)
      console.log(
        `   Memory: ${formatMemory(writeMetrics[0].memoryDelta.heapUsed)}`
      )

      assertPerformanceThresholds(writeStats, writeMetrics, {
        maxDuration: 100,
        maxP95Duration: 150,
        maxMemoryIncrease: 20 * 1024 * 1024 // 20MB
      })

      const readBenchmark = () => store.get('library')
      const { stats: readStats } = await benchmarkFunction(readBenchmark, 200)

      printPerformanceStats('Read Large Library (1000)', readStats, 200)

      assertPerformanceThresholds(readStats, [], {
        maxDuration: 20,
        maxP95Duration: 35,
        maxP99Duration: 50
      })
    })

    it('should handle very large game library (5000 games)', async () => {
      const library = generateMockGameLibrary(5000)

      const writeBenchmark = () => store.set('library', library)
      const { stats: writeStats, metrics: writeMetrics } =
        await benchmarkFunction(writeBenchmark, 10)

      printPerformanceStats('Write Very Large Library (5000)', writeStats, 10)
      console.log(
        `   Memory: ${formatMemory(writeMetrics[0].memoryDelta.heapUsed)}`
      )

      assertPerformanceThresholds(writeStats, writeMetrics, {
        maxDuration: 500,
        maxP95Duration: 750,
        maxMemoryIncrease: 100 * 1024 * 1024 // 100MB
      })

      const readBenchmark = () => store.get('library')
      const { stats: readStats } = await benchmarkFunction(readBenchmark, 50)

      printPerformanceStats('Read Very Large Library (5000)', readStats, 50)

      assertPerformanceThresholds(readStats, [], {
        maxDuration: 100,
        maxP95Duration: 150,
        maxP99Duration: 200
      })
    })
  })

  describe('Bulk Operations Performance', () => {
    it('should handle multiple key reads efficiently', async () => {
      // Set up test data
      for (let i = 0; i < 100; i++) {
        store.set(`key-${i}`, { value: i })
      }

      const benchmark = () => {
        const results = []
        for (let i = 0; i < 100; i++) {
          results.push(store.get(`key-${i}`))
        }
        return results
      }

      const { stats } = await benchmarkFunction(benchmark, 100)

      printPerformanceStats('100 Sequential Reads', stats, 100)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 50,
        maxP95Duration: 75,
        maxP99Duration: 100
      })
    })

    it('should handle multiple key writes efficiently', async () => {
      const benchmark = () => {
        for (let i = 0; i < 100; i++) {
          store.set(`key-${i}`, { value: i, timestamp: Date.now() })
        }
      }

      const { stats } = await benchmarkFunction(benchmark, 50)

      printPerformanceStats('100 Sequential Writes', stats, 50)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 200,
        maxP95Duration: 300,
        maxP99Duration: 400
      })
    })
  })

  describe('Store Initialization Performance', () => {
    it('should initialize empty store quickly', async () => {
      const benchmark = () => {
        const tempStore = new Store({
          cwd: testDir,
          name: `init-test-${Math.random()}`,
          clearInvalidConfig: true
        })
        return tempStore
      }

      const { stats } = await benchmarkFunction(benchmark, 100)

      printPerformanceStats('Empty Store Initialization', stats, 100)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 10,
        maxP95Duration: 20,
        maxP99Duration: 30
      })
    })

    it('should initialize store with existing data', async () => {
      // Create a store with data
      const setupStore = new Store({
        cwd: testDir,
        name: 'init-with-data-test',
        clearInvalidConfig: true
      })

      const library = generateMockGameLibrary(500)
      setupStore.set('library', library)
      setupStore.set('config', { version: '1.0.0' })
      setupStore.set('settings', { theme: 'dark' })

      const benchmark = () => {
        const tempStore = new Store({
          cwd: testDir,
          name: 'init-with-data-test',
          clearInvalidConfig: true
        })
        return tempStore
      }

      const { stats } = await benchmarkFunction(benchmark, 50)

      printPerformanceStats('Store Init with Existing Data', stats, 50)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 30,
        maxP95Duration: 50,
        maxP99Duration: 75
      })
    })
  })

  describe('Nested Data Performance', () => {
    it('should handle deeply nested reads efficiently', async () => {
      store.set('config', {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { value: 'deep' }
              }
            }
          }
        }
      })

      const benchmark = () => store.get('config.level1.level2.level3')
      const { stats } = await benchmarkFunction(benchmark, 10000)

      printPerformanceStats('Nested Property Read', stats, 10000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 1,
        maxP95Duration: 2,
        maxP99Duration: 5
      })
    })

    it('should handle nested writes efficiently', async () => {
      let counter = 0
      const benchmark = () => {
        store.set('config.counter', counter++)
      }

      const { stats } = await benchmarkFunction(benchmark, 1000)

      printPerformanceStats('Nested Property Write', stats, 1000)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 3,
        maxP95Duration: 7,
        maxP99Duration: 15
      })
    })
  })

  describe('Store Clearing Performance', () => {
    it('should clear store with minimal data quickly', async () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')
      store.set('key3', 'value3')

      const benchmark = () => {
        store.clear()
        // Re-add some data for next iteration
        store.set('key1', 'value1')
        store.set('key2', 'value2')
        store.set('key3', 'value3')
      }

      const { stats } = await benchmarkFunction(benchmark, 100)

      printPerformanceStats('Clear Small Store', stats, 100)

      assertPerformanceThresholds(stats, [], {
        maxDuration: 10,
        maxP95Duration: 20,
        maxP99Duration: 30
      })
    })
  })
})
