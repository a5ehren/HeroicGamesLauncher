# Performance Testing Guide

Comprehensive performance testing suite for Heroic Games Launcher measuring backend, frontend, and end-to-end performance.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Suites](#test-suites)
- [Performance Metrics](#performance-metrics)
- [Adding New Tests](#adding-new-tests)
- [Performance Thresholds](#performance-thresholds)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The performance test suite covers three main areas:

1. **Backend Performance**: IPC handlers, electron-store operations, game launch pipeline
2. **Frontend Performance**: React component rendering, state management, list performance
3. **E2E Performance**: Full application startup, navigation, memory usage

### Test Structure

```
src/
├── backend/
│   └── __tests__/
│       └── performance/
│           ├── utils/
│           │   └── performance-metrics.ts    # Backend test utilities
│           ├── ipc-performance.test.ts       # IPC performance tests
│           └── store-performance.test.ts     # electron-store tests
│
└── frontend/
    └── __tests__/
        └── performance/
            ├── utils/
            │   └── react-performance.ts      # React test utilities
            ├── react-component-performance.test.tsx
            └── state-management-performance.test.tsx

e2e/
└── performance.spec.ts                        # End-to-end performance tests
```

## Running Tests

> **📊 Results Tracking**: All performance tests automatically save results to `performance-results/` for comparison. See [Performance Comparison Guide](./PERFORMANCE_COMPARISON.md) for details.

### All Performance Tests

```bash
# Run all performance tests (backend + frontend + E2E)
pnpm test:all-performance

# Run tests and save as baseline for future comparisons
pnpm test:performance:baseline

# Run tests and compare with baseline (fails if regressions detected)
pnpm test:performance:compare

# Manually compare latest results with baseline
pnpm compare-performance
```

### Backend Performance Tests

```bash
# Run all backend performance tests
pnpm test:performance:backend

# Run specific backend test
pnpm test -- ipc-performance.test.ts
pnpm test -- store-performance.test.ts
```

### Frontend Performance Tests

```bash
# Run all frontend performance tests
pnpm test:performance:frontend

# Run specific frontend test
pnpm test -- react-component-performance.test.tsx
pnpm test -- state-management-performance.test.tsx
```

### E2E Performance Tests

```bash
# Run E2E performance tests
pnpm test:e2e:performance
```

## Test Suites

### Backend Tests

#### IPC Performance (`ipc-performance.test.ts`)

Tests inter-process communication performance:

- **Simple Handler Performance**: Basic string/object responses (< 1ms)
- **Async Operations**: I/O simulation with minimal overhead
- **Large Payload Handling**:
  - Typical library (100 games): < 5ms
  - Medium library (500 games): < 20ms
  - Large library (1000 games): < 50ms
  - Very large library (5000 games): < 250ms
- **Concurrent Calls**: Multiple parallel IPC requests
- **Error Handling**: Exception performance
- **Serialization**: Deep nesting and large arrays
- **Memory Leak Detection**: Memory growth analysis

Example metrics:

```
📊 Performance Stats: Simple String Response
   Iterations: 1000
   Mean:   0.15ms
   Median: 0.12ms
   P95:    0.28ms
   P99:    0.45ms
```

#### electron-store Performance (`store-performance.test.ts`)

Tests persistent storage operations:

- **Read Performance**:
  - Simple values: < 0.5ms
  - Complex objects: < 1ms
- **Write Performance**:
  - Simple values: < 2ms
  - Complex objects: < 3ms
- **Large Data**:
  - 100 games: Read < 5ms, Write < 20ms
  - 500 games: Read < 10ms, Write < 50ms
  - 1000 games: Read < 20ms, Write < 100ms
  - 5000 games: Read < 100ms, Write < 500ms
- **Bulk Operations**: Sequential read/write batches
- **Store Initialization**: Cold start vs existing data
- **Nested Properties**: Deep object path access

Example metrics:

```
📊 Performance Stats: Write Medium Library (500)
   Iterations: 50
   Mean:   42.15ms
   P95:    58.32ms
   Memory: 8.42 MB
```

### Frontend Tests

#### React Component Performance (`react-component-performance.test.tsx`)

Tests React rendering performance:

- **Simple Components**: Basic render (< 10ms)
- **State Updates**: Re-render performance (< 10ms avg)
- **List Rendering**:
  - 100 items (typical): < 150ms
  - 500 items (medium): < 500ms
  - 1000 items (large): < 1000ms
  - 5000 items (very large): < 5000ms (consider virtualization)
- **Optimization Comparison**: memo() vs unoptimized
- **Render Counting**: Unnecessary re-render detection
- **Conditional Rendering**: Show/hide performance
- **Nested Updates**: Parent/child update isolation

Example metrics:

```
⚛️  React Performance: State Updates
  Initial Render: 12.34ms
  Average Update: 3.21ms
  P95 Update:     5.67ms
  Total Updates:  50
```

#### State Management Performance (`state-management-performance.test.tsx`)

Compares state management approaches:

- **Context API**:
  - Simple updates: < 15ms
  - Identifies re-render issues
- **Zustand**:
  - Simple updates: < 10ms
  - Selector optimization
  - Multiple subscribers (50+)
- **Performance Comparison**: Context vs Zustand speedup
- **Selector Efficiency**: Efficient vs inefficient patterns
- **Large State**: 1000+ item handling

Example metrics:

```
📊 Performance Comparison
   Context Mean: 8.45ms
   Zustand Mean: 4.23ms
   Speedup: 2.00x
```

### E2E Tests

#### Full Application Performance (`performance.spec.ts`)

Tests complete user experience:

- **Application Startup**: < 10 seconds
- **Initial Load**: DOM content loaded < 3s
- **Core Web Vitals**: FCP, LCP measurement
- **Page Navigation**: < 1-2 seconds
- **User Interactions**: Search, clicks < 500ms
- **Memory Usage**: Session memory tracking
- **Memory Leak Detection**: Rapid navigation test
- **Concurrent Operations**: UI responsiveness
- **Frame Rate**: 30+ FPS during animations
- **IPC Round-trip**: Mean < 50ms, P95 < 100ms

Example metrics:

```
📊 Initial Load Performance
   DOM Interactive: 1234.56ms
   DOM Content Loaded: 2345.67ms
   Load Complete: 3456.78ms
```

## Performance Metrics

### Measured Values

| Metric           | Description                    | Typical Range     |
| ---------------- | ------------------------------ | ----------------- |
| **Duration**     | Time to complete operation     | 0.1ms - 5000ms    |
| **Mean**         | Average execution time         | Context-dependent |
| **Median**       | Middle value (50th percentile) | Context-dependent |
| **P95**          | 95th percentile (worst 5%)     | < 2x mean         |
| **P99**          | 99th percentile (worst 1%)     | < 3x mean         |
| **Memory Delta** | Memory usage change            | < 100MB typical   |
| **FPS**          | Frames per second              | > 30 FPS          |

### Statistical Analysis

Tests use statistical methods to identify performance issues:

```typescript
// Calculate performance statistics
const stats = calculateStats(durations)
console.log(`Mean: ${stats.mean.toFixed(2)}ms`)
console.log(`P95:  ${stats.p95.toFixed(2)}ms`)
console.log(`P99:  ${stats.p99.toFixed(2)}ms`)
```

## Adding New Tests

### Backend Performance Test

```typescript
import {
  benchmarkFunction,
  printPerformanceStats,
  assertPerformanceThresholds
} from './utils/performance-metrics'

describe('My Backend Feature Performance', () => {
  it('should handle operation quickly', async () => {
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
})
```

### Frontend Performance Test

```typescript
import {
  measureReRenderPerformance,
  printReactPerformanceStats,
  assertReactPerformanceThresholds
} from './utils/react-performance'

describe('My Component Performance', () => {
  it('should render efficiently', async () => {
    const { stats } = await measureReRenderPerformance(
      () => render(<MyComponent />),
      async (result) => {
        fireEvent.click(result.getByRole('button'))
        await result.findByTestId('result')
      },
      50
    )

    printReactPerformanceStats('My Component', stats)

    assertReactPerformanceThresholds(stats, {
      maxInitialRender: 30,
      maxAverageUpdate: 15,
      maxP95Update: 25
    })
  })
})
```

### E2E Performance Test

```typescript
test('my feature should perform well', async () => {
  const startTime = performance.now()

  await page.goto('/my-feature')
  await page.waitForLoadState('domcontentloaded')

  const endTime = performance.now()
  const duration = endTime - startTime

  console.log(`Duration: ${duration.toFixed(2)}ms`)
  expect(duration).toBeLessThan(2000)
})
```

## Performance Thresholds

### Backend Thresholds

| Operation            | Max Duration | Max P95 | Max Memory |
| -------------------- | ------------ | ------- | ---------- |
| Simple IPC           | 1ms          | 2ms     | -          |
| Async IPC (10ms I/O) | 15ms         | 20ms    | -          |
| Store Read           | 5ms          | 10ms    | -          |
| Store Write          | 20ms         | 30ms    | 2MB        |
| Large Library (500)  | 50ms         | 75ms    | 10MB       |

### Frontend Thresholds

| Operation         | Max Initial | Max Avg Update | Max P95 |
| ----------------- | ----------- | -------------- | ------- |
| Simple Component  | 15ms        | -              | -       |
| State Update      | 20ms        | 10ms           | 20ms    |
| List (100 items)  | 150ms       | -              | -       |
| List (500 items)  | 500ms       | -              | -       |
| List (1000 items) | 1000ms      | -              | -       |
| List (5000 items) | 5000ms      | -              | -       |

### E2E Thresholds

| Metric               | Threshold     |
| -------------------- | ------------- |
| Startup Time         | < 10s         |
| DOM Content Loaded   | < 3s          |
| Page Load Complete   | < 5s          |
| Page Navigation      | < 2s          |
| User Interaction     | < 500ms       |
| Memory Leak (10 nav) | < 200MB       |
| FPS                  | > 30          |
| IPC Round-trip       | < 50ms (mean) |

## Best Practices

### Writing Performance Tests

1. **Warm-up Iterations**: First run is often slower, consider excluding from stats
2. **Multiple Iterations**: Use 50-100+ iterations for statistical significance
3. **Realistic Data**: Use representative data sizes from production
4. **Isolation**: Each test should be independent
5. **Clean-up**: Always clean up resources (stores, DOM, listeners)

### Performance Optimization

1. **React Components**:
   - Use `memo()` for expensive components
   - Use `useMemo()` for expensive calculations
   - Use efficient selectors with Zustand
   - Avoid inline function/object creation in props

2. **State Management**:
   - Prefer Zustand over Context for frequently updated state
   - Use granular selectors to minimize re-renders
   - Keep state normalized

3. **Backend**:
   - Cache IPC results when appropriate
   - Use bulk operations for electron-store
   - Minimize serialization overhead

### Monitoring Performance

```bash
# Run with verbose output
pnpm test:performance -- --verbose

# Run with coverage
pnpm test:performance -- --coverage

# Run in watch mode for development
pnpm test-watch -- performance
```

## Troubleshooting

### Tests Failing Inconsistently

Performance tests can be flaky. If tests fail occasionally:

1. **Increase Thresholds**: Add 20-30% buffer to thresholds
2. **More Iterations**: Increase iteration count for better statistics
3. **Check System Load**: Close other applications
4. **CI Considerations**: CI systems may be slower, adjust thresholds

### Memory Leaks

If memory tests fail:

1. **Check Cleanup**: Ensure `afterEach` removes all resources
2. **Event Listeners**: Remove all event listeners
3. **Timers**: Clear all timers/intervals
4. **Store Instances**: Clean up store references

### Slow Tests

If tests run too slowly:

1. **Reduce Iterations**: Use fewer iterations during development
2. **Skip E2E**: E2E tests are slowest, skip during rapid iteration
3. **Run Specific Tests**: Use test name filters
4. **Parallel Execution**: Jest runs tests in parallel by default

### Test Environment Issues

Frontend tests need jsdom:

```bash
# Ensure jsdom environment
pnpm test:performance:frontend
```

If you see "window is not defined":

```typescript
// Add to test file
/**
 * @jest-environment jsdom
 */
```

## CI Integration

Add to CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Run performance tests
        run: pnpm test:all-performance
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: coverage/
```

## Continuous Monitoring

Track performance trends over time:

1. **Store Results**: Save performance metrics from each run
2. **Compare Baselines**: Compare against previous commits
3. **Regression Detection**: Alert on significant slowdowns
4. **Visualization**: Graph trends over time

## References

- [Jest Performance Testing](https://jestjs.io/docs/timer-mocks)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Performance](https://playwright.dev/docs/test-timeouts)
- [Electron Performance](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

## Contributing

When adding new features:

1. **Add Performance Tests**: Include performance tests for new features
2. **Document Thresholds**: Explain why thresholds are set to specific values
3. **Update This Guide**: Keep documentation current
4. **Run Before PR**: Ensure all performance tests pass before submitting

---

**Last Updated**: 2025-12-19
