# Frontend Performance Tests

Performance tests for React components and state management in Heroic Games Launcher.

## Test Files

### `react-component-performance.test.tsx`

Tests React component rendering and update performance.

**Covers:**

- Simple component rendering (< 10ms)
- State updates and re-renders (< 10ms avg)
- List rendering scalability (10, 50, 200 items)
- Optimization comparison (memo vs unoptimized)
- Render count tracking
- Nested component updates
- Conditional rendering performance

**Run:**

```bash
pnpm test -- react-component-performance.test.tsx
```

### `state-management-performance.test.tsx`

Compares Context API vs Zustand performance.

**Covers:**

- Context API simple updates
- Context API re-render issues
- Zustand with efficient selectors
- Multiple subscriber performance
- Selector efficiency comparison
- Large state handling (1000+ items)

**Run:**

```bash
pnpm test -- state-management-performance.test.tsx
```

## Utilities

### `utils/react-performance.ts`

React-specific performance utilities:

- `measureRenderPerformance()` - Measure initial render
- `measureReRenderPerformance()` - Measure updates with stats
- `createRenderCounter()` - Track re-render counts
- `measureListRenderPerformance()` - Test list scalability
- `assertReactPerformanceThresholds()` - Verify requirements
- Helper functions (mock data, delays)

## Quick Start

```bash
# Run all frontend performance tests
pnpm test:performance:frontend

# Run specific test
pnpm test -- react-component-performance

# Run in watch mode
pnpm test-watch -- performance
```

## Example Output

```
⚛️  React Performance: State Updates
  Initial Render: 12.34ms
  Average Update: 3.21ms
  Min Update:     1.89ms
  Max Update:     8.45ms
  P95 Update:     5.67ms
  Total Updates:  50

📊 Performance Comparison
   Context Mean: 8.45ms
   Zustand Mean: 4.23ms
   Speedup: 2.00x

📊 List Rendering Scalability
    10 items:  23.45ms |   102.34KB
    50 items:  89.12ms |   456.78KB
   100 items: 165.34ms |   834.56KB
   200 items: 287.89ms |  1567.23KB
   500 items: 654.32ms |  3456.78KB
```

## Key Findings

### React Component Optimization

**Without memo():**

```typescript
const ExpensiveComponent = ({ data }) => {
  // Re-renders on every parent update
  const result = expensiveCalculation(data)
  return <div>{result}</div>
}
```

**With memo() and useMemo():**

```typescript
const OptimizedComponent = memo(({ data }) => {
  // Only re-renders when data changes
  const result = useMemo(() => expensiveCalculation(data), [data])
  return <div>{result}</div>
})
```

**Performance Impact:** 2-5x faster updates

### State Management

**Context API:**

- Simple to use
- All consumers re-render on any state change
- Best for infrequently updated state

**Zustand:**

- Granular subscriptions
- Only re-renders components using changed state
- Best for frequently updated state
- 1.5-2x faster updates with proper selectors

### List Rendering

**Scalability:**

- Roughly linear scaling up to 200 items
- Virtual scrolling recommended for 500+ items
- memo() helps with partial updates

## Adding New Tests

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
      50 // iterations
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

## Performance Best Practices

### 1. Use memo() for Expensive Components

```typescript
export const GameCard = memo(({ game }) => {
  // Component only re-renders when game prop changes
  return <div>...</div>
})
```

### 2. Use Efficient Zustand Selectors

```typescript
// ❌ Bad: Subscribes to entire store
const state = useStore()

// ✅ Good: Subscribes only to count
const count = useStore((state) => state.count)
```

### 3. Avoid Inline Objects/Functions

```typescript
// ❌ Bad: Creates new object every render
<Component style={{ color: 'red' }} />

// ✅ Good: Use constant
const style = { color: 'red' }
<Component style={style} />
```

### 4. Use useMemo for Expensive Calculations

```typescript
const filteredGames = useMemo(
  () => games.filter((game) => game.installed),
  [games]
)
```

### 5. Minimize useEffect

```typescript
// ❌ Bad: Unnecessary effect
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// ✅ Good: Calculate directly
const fullName = firstName + ' ' + lastName
```

## Troubleshooting

### Tests Failing

1. **Increase thresholds** - CI systems may be slower
2. **Check React Compiler** - Automatic optimizations may change results
3. **Run in isolation** - Other tests may affect timing

### Memory Leaks

1. Clean up in `afterEach`:

```typescript
afterEach(() => {
  cleanup() // React Testing Library
})
```

2. Remove event listeners
3. Clear timers

## See Also

- [Backend Performance Tests](../../../backend/__tests__/performance/README.md)
- [E2E Performance Tests](../../../../e2e/performance.spec.ts)
- [Performance Testing Guide](../../../../docs/PERFORMANCE_TESTING.md)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
