# Backend Performance Tests

Performance tests for Heroic Games Launcher backend operations.

## Test Files

### `ipc-performance.test.ts`

Tests IPC (Inter-Process Communication) performance between main and renderer processes.

**Covers:**

- Simple handler responses (< 1ms)
- Async operations with I/O simulation
- Large payload handling (100, 500, 1000 game libraries)
- Concurrent IPC calls
- Error handling performance
- Complex data serialization
- Memory leak detection

**Run:**

```bash
pnpm test -- ipc-performance.test.ts
```

### `store-performance.test.ts`

Tests electron-store read/write performance.

**Covers:**

- Simple value read/write (< 0.5ms read, < 2ms write)
- Object operations
- Large data handling (100-1000 games)
- Bulk operations
- Store initialization
- Nested property access

**Run:**

```bash
pnpm test -- store-performance.test.ts
```

## Utilities

### `utils/performance-metrics.ts`

Shared performance measurement utilities:

- `measurePerformance()` - Measure single execution
- `benchmarkFunction()` - Run multiple iterations with stats
- `calculateStats()` - Calculate mean, median, P95, P99
- `assertPerformanceThresholds()` - Verify performance requirements
- `formatDuration()` / `formatMemory()` - Human-readable output
- Helper functions for testing (mock data generation, delays)

## Quick Start

```bash
# Run all backend performance tests
pnpm test:performance:backend

# Run specific test
pnpm test -- ipc-performance

# Run with verbose output
pnpm test -- ipc-performance --verbose
```

## Example Output

```
📊 Performance Stats: Simple String Response
   Iterations: 1000
   Mean:   0.15ms
   Median: 0.12ms
   Min:    0.08ms
   Max:    2.34ms
   P95:    0.28ms
   P99:    0.45ms
   StdDev: 0.12ms

📊 Large Game Library (500)
   Time: 42.15ms
   Memory: 8.42 MB
```

## Adding New Tests

```typescript
import {
  benchmarkFunction,
  printPerformanceStats,
  assertPerformanceThresholds
} from './utils/performance-metrics'

it('should perform operation quickly', async () => {
  const operation = async () => {
    // Your code to test
    return await myFunction()
  }

  const { stats, metrics } = await benchmarkFunction(operation, 100)

  printPerformanceStats('My Operation', stats, 100)

  assertPerformanceThresholds(stats, metrics, {
    maxDuration: 10,
    maxP95Duration: 20,
    maxMemoryIncrease: 1024 * 1024 // 1MB
  })
})
```

## See Also

- [Frontend Performance Tests](../../../frontend/__tests__/performance/README.md)
- [E2E Performance Tests](../../../../e2e/performance.spec.ts)
- [Performance Testing Guide](../../../../docs/PERFORMANCE_TESTING.md)
