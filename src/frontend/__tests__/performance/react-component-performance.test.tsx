/**
 * React Component Performance Tests
 *
 * Tests React component rendering performance:
 * - Initial render times
 * - Re-render performance
 * - List rendering with varying sizes
 * - Component update optimization
 */

import { useState, useMemo, memo } from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  measureRenderPerformance,
  measureReRenderPerformance,
  printReactPerformanceStats,
  assertReactPerformanceThresholds,
  measureListRenderPerformance,
  createRenderCounter
} from './utils/react-performance'

// Mock components for testing
const SimpleComponent = () => <div>Simple Component</div>

const ComponentWithState = () => {
  const [count, setCount] = useState(0)
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  )
}

const ExpensiveComponent = ({ data }: { data: number[] }) => {
  const sum = data.reduce((acc, val) => acc + val, 0)
  return <div data-testid="sum">{sum}</div>
}

const OptimizedExpensiveComponent = memo(
  function OptimizedExpensiveComponent({ data }: { data: number[] }) {
    const sum = useMemo(() => data.reduce((acc, val) => acc + val, 0), [data])
    return <div data-testid="sum">{sum}</div>
  },
  (prev, next) => {
    return prev.data.length === next.data.length
  }
)

interface GameCardProps {
  title: string
  cover: string
  installed: boolean
}

const GameCard = ({ title, cover, installed }: GameCardProps) => (
  <div className="game-card">
    <img src={cover} alt={title} />
    <h3>{title}</h3>
    {installed && <span>Installed</span>}
  </div>
)

const OptimizedGameCard = memo(GameCard)

const GameList = ({ games }: { games: Array<GameCardProps> }) => (
  <div data-testid="game-list">
    {games.map((game, index) => (
      <GameCard key={index} {...game} />
    ))}
  </div>
)

const OptimizedGameList = ({ games }: { games: Array<GameCardProps> }) => (
  <div data-testid="game-list">
    {games.map((game, index) => (
      <OptimizedGameCard key={index} {...game} />
    ))}
  </div>
)

describe('React Component Performance Tests', () => {
  describe('Simple Component Rendering', () => {
    it('should render simple component quickly', () => {
      const metrics = measureRenderPerformance(<SimpleComponent />)

      console.log('\n📊 Simple Component Render')
      console.log(`   Time: ${metrics.initialRenderTime.toFixed(2)}ms`)
      console.log(`   Memory: ${(metrics.memoryDelta / 1024).toFixed(2)}KB`)

      expect(metrics.initialRenderTime).toBeLessThan(10)
    })

    it('should render component with state quickly', () => {
      const metrics = measureRenderPerformance(<ComponentWithState />)

      console.log('\n📊 Component With State Render')
      console.log(`   Time: ${metrics.initialRenderTime.toFixed(2)}ms`)

      expect(metrics.initialRenderTime).toBeLessThan(15)
    })
  })

  describe('Component Update Performance', () => {
    it('should handle state updates efficiently', async () => {
      const { stats } = await measureReRenderPerformance(
        () => render(<ComponentWithState />),
        async (result) => {
          const button = result.getByRole('button')
          fireEvent.click(button)
          await result.findByTestId('count')
        },
        50
      )

      printReactPerformanceStats('State Updates', stats)

      assertReactPerformanceThresholds(stats, {
        maxInitialRender: 20,
        maxAverageUpdate: 10,
        maxP95Update: 20
      })
    })

    it('should show performance difference between optimized and unoptimized', async () => {
      const testData = Array.from({ length: 1000 }, (_, i) => i)

      // Unoptimized
      const UnoptimizedWrapper = () => {
        const [data] = useState(testData)
        const [, setTrigger] = useState(0)

        return (
          <div>
            <ExpensiveComponent data={data} />
            <button
              onClick={() => setTrigger((t) => t + 1)}
              data-testid="trigger"
            >
              Trigger
            </button>
          </div>
        )
      }

      const { stats: unoptimizedStats } = await measureReRenderPerformance(
        () => render(<UnoptimizedWrapper />),
        async (result) => {
          const button = result.getByTestId('trigger')
          fireEvent.click(button)
        },
        20
      )

      // Optimized
      const OptimizedWrapper = () => {
        const [data] = useState(testData)
        const [, setTrigger] = useState(0)

        return (
          <div>
            <OptimizedExpensiveComponent data={data} />
            <button
              onClick={() => setTrigger((t) => t + 1)}
              data-testid="trigger"
            >
              Trigger
            </button>
          </div>
        )
      }

      const { stats: optimizedStats } = await measureReRenderPerformance(
        () => render(<OptimizedWrapper />),
        async (result) => {
          const button = result.getByTestId('trigger')
          fireEvent.click(button)
        },
        20
      )

      printReactPerformanceStats('Unoptimized Updates', unoptimizedStats)
      printReactPerformanceStats('Optimized Updates', optimizedStats)

      console.log('\n💡 Performance Improvement')
      console.log(
        `   Speedup: ${(unoptimizedStats.averageUpdate / optimizedStats.averageUpdate).toFixed(2)}x`
      )

      // Optimized should be significantly faster
      expect(optimizedStats.averageUpdate).toBeLessThan(
        unoptimizedStats.averageUpdate * 0.5
      )
    })
  })

  describe('List Rendering Performance', () => {
    it('should render typical game list (100 items)', () => {
      const games = Array.from({ length: 100 }, (_, i) => ({
        title: `Game ${i}`,
        cover: `cover_${i}.jpg`,
        installed: i % 2 === 0
      }))

      const metrics = measureRenderPerformance(<GameList games={games} />)

      console.log('\n📊 Typical Game List (100 items)')
      console.log(`   Time: ${metrics.initialRenderTime.toFixed(2)}ms`)

      expect(metrics.initialRenderTime).toBeLessThan(150)
    })

    it('should render medium game list (500 items)', () => {
      const games = Array.from({ length: 500 }, (_, i) => ({
        title: `Game ${i}`,
        cover: `cover_${i}.jpg`,
        installed: i % 2 === 0
      }))

      const metrics = measureRenderPerformance(<GameList games={games} />)

      console.log('\n📊 Medium Game List (500 items)')
      console.log(`   Time: ${metrics.initialRenderTime.toFixed(2)}ms`)
      console.log(
        `   Memory: ${(metrics.memoryDelta / 1024 / 1024).toFixed(2)}MB`
      )

      expect(metrics.initialRenderTime).toBeLessThan(500)
    })

    it('should render large game list (1000 items)', () => {
      const games = Array.from({ length: 1000 }, (_, i) => ({
        title: `Game ${i}`,
        cover: `cover_${i}.jpg`,
        installed: i % 2 === 0
      }))

      const metrics = measureRenderPerformance(<GameList games={games} />)

      console.log('\n📊 Large Game List (1000 items)')
      console.log(`   Time: ${metrics.initialRenderTime.toFixed(2)}ms`)
      console.log(
        `   Memory: ${(metrics.memoryDelta / 1024 / 1024).toFixed(2)}MB`
      )

      expect(metrics.initialRenderTime).toBeLessThan(1000)
    })

    it('should render very large game list (5000 items)', () => {
      const games = Array.from({ length: 5000 }, (_, i) => ({
        title: `Game ${i}`,
        cover: `cover_${i}.jpg`,
        installed: i % 2 === 0
      }))

      const metrics = measureRenderPerformance(<GameList games={games} />)

      console.log('\n📊 Very Large Game List (5000 items)')
      console.log(`   Time: ${metrics.initialRenderTime.toFixed(2)}ms`)
      console.log(
        `   Memory: ${(metrics.memoryDelta / 1024 / 1024).toFixed(2)}MB`
      )

      // This will be slow, consider virtual scrolling for production
      expect(metrics.initialRenderTime).toBeLessThan(5000)
    })

    it('should compare list rendering at different sizes', () => {
      const sizes = [100, 500, 1000, 2000, 5000]

      const createGameList = (size: number) => {
        const games = Array.from({ length: size }, (_, i) => ({
          title: `Game ${i}`,
          cover: `cover_${i}.jpg`,
          installed: i % 2 === 0
        }))
        return <GameList games={games} />
      }

      const results = measureListRenderPerformance(createGameList, sizes)

      console.log('\n📊 List Rendering Scalability')
      results.forEach(({ size, renderTime, memoryDelta }) => {
        console.log(
          `   ${size.toString().padStart(4)} items: ${renderTime.toFixed(2).padStart(7)}ms | ${(memoryDelta / 1024 / 1024).toFixed(2).padStart(8)}MB`
        )
      })

      // Verify linear or sub-linear scaling
      const timePerItem1000 = results[2].renderTime / 1000
      const timePerItem5000 = results[4].renderTime / 5000

      console.log('\n📈 Scaling Efficiency')
      console.log(`   Time/item (1000): ${timePerItem1000.toFixed(4)}ms`)
      console.log(`   Time/item (5000): ${timePerItem5000.toFixed(4)}ms`)

      // Should not scale worse than linearly
      expect(timePerItem5000).toBeLessThan(timePerItem1000 * 1.5)
    })

    it('should show performance benefit of memo in lists', () => {
      const games = Array.from({ length: 100 }, (_, i) => ({
        title: `Game ${i}`,
        cover: `cover_${i}.jpg`,
        installed: i % 2 === 0
      }))

      const unoptimizedMetrics = measureRenderPerformance(
        <GameList games={games} />
      )

      const optimizedMetrics = measureRenderPerformance(
        <OptimizedGameList games={games} />
      )

      console.log('\n📊 List Rendering: memo() Comparison (100 items)')
      console.log(
        `   Unoptimized: ${unoptimizedMetrics.initialRenderTime.toFixed(2)}ms`
      )
      console.log(
        `   Optimized:   ${optimizedMetrics.initialRenderTime.toFixed(2)}ms`
      )

      // Both should be reasonably fast for initial render
      expect(unoptimizedMetrics.initialRenderTime).toBeLessThan(200)
      expect(optimizedMetrics.initialRenderTime).toBeLessThan(200)
    })
  })

  describe('Render Count Optimization', () => {
    it('should track unnecessary re-renders', async () => {
      const counter = createRenderCounter()

      const TrackedComponent = () => {
        counter.useRenderCounter()
        const [count, setCount] = useState(0)
        const [, setOther] = useState(0)

        return (
          <div>
            <span data-testid="count">{count}</span>
            <button
              onClick={() => setCount((c) => c + 1)}
              data-testid="increment-count"
            >
              Increment Count
            </button>
            <button
              onClick={() => setOther((o) => o + 1)}
              data-testid="increment-other"
            >
              Increment Other
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<TrackedComponent />)

      const initialRenders = counter.getRenderCount()

      fireEvent.click(getByTestId('increment-count'))
      fireEvent.click(getByTestId('increment-other'))

      const finalRenders = counter.getRenderCount()
      const additionalRenders = finalRenders - initialRenders

      console.log('\n📊 Render Count Tracking')
      console.log(`   Initial renders: ${initialRenders}`)
      console.log(`   After 2 updates: ${finalRenders}`)
      console.log(`   Additional renders: ${additionalRenders}`)

      // Should be 2 additional renders (one per state update)
      expect(additionalRenders).toBe(2)
    })
  })

  describe('Complex Component Hierarchies', () => {
    it('should handle nested component updates efficiently', async () => {
      const ParentComponent = () => {
        const [parentState, setParentState] = useState(0)

        const ChildComponent = () => {
          const [childState, setChildState] = useState(0)

          return (
            <div>
              <span data-testid="child-state">{childState}</span>
              <button
                onClick={() => setChildState((c) => c + 1)}
                data-testid="child-button"
              >
                Child Update
              </button>
            </div>
          )
        }

        return (
          <div>
            <span data-testid="parent-state">{parentState}</span>
            <button
              onClick={() => setParentState((p) => p + 1)}
              data-testid="parent-button"
            >
              Parent Update
            </button>
            <ChildComponent />
          </div>
        )
      }

      const { stats } = await measureReRenderPerformance(
        () => render(<ParentComponent />),
        async (result) => {
          fireEvent.click(result.getByTestId('parent-button'))
          await result.findByTestId('parent-state')
        },
        30
      )

      printReactPerformanceStats('Nested Component Updates', stats)

      assertReactPerformanceThresholds(stats, {
        maxInitialRender: 30,
        maxAverageUpdate: 15,
        maxP95Update: 25
      })
    })
  })

  describe('Conditional Rendering Performance', () => {
    it('should handle conditional rendering efficiently', async () => {
      const ConditionalComponent = () => {
        const [showContent, setShowContent] = useState(false)

        return (
          <div>
            <button
              onClick={() => setShowContent((s) => !s)}
              data-testid="toggle"
            >
              Toggle
            </button>
            {showContent && (
              <div data-testid="content">
                {Array.from({ length: 50 }, (_, i) => (
                  <div key={i}>Content {i}</div>
                ))}
              </div>
            )}
          </div>
        )
      }

      const { stats } = await measureReRenderPerformance(
        () => render(<ConditionalComponent />),
        async (result) => {
          fireEvent.click(result.getByTestId('toggle'))
          await result.findByTestId('content')
        },
        20
      )

      printReactPerformanceStats('Conditional Rendering', stats)

      assertReactPerformanceThresholds(stats, {
        maxInitialRender: 25,
        maxAverageUpdate: 50,
        maxP95Update: 75
      })
    })
  })
})
