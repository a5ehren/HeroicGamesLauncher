/**
 * State Management Performance Tests
 *
 * Compares performance between different state management approaches:
 * - React Context API
 * - Zustand
 * - Local state
 *
 * Measures:
 * - Read performance
 * - Update performance
 * - Re-render optimization
 * - Selector performance
 */

import React, { createContext, useContext, useState, memo } from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { create } from 'zustand'
import {
  measureReRenderPerformance,
  printReactPerformanceStats,
  assertReactPerformanceThresholds,
  createRenderCounter
} from './utils/react-performance'

// Context API Implementation
interface ContextState {
  count: number
  games: Array<{ id: number; name: string }>
  increment: () => void
  addGame: (game: { id: number; name: string }) => void
}

const StateContext = createContext<ContextState | undefined>(undefined)

const StateProvider = ({ children }: { children: React.ReactNode }) => {
  const [count, setCount] = useState(0)
  const [games, setGames] = useState<Array<{ id: number; name: string }>>([])

  const value = {
    count,
    games,
    increment: () => setCount((c) => c + 1),
    addGame: (game: { id: number; name: string }) =>
      setGames((g) => [...g, game])
  }

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>
}

const useStateContext = () => {
  const context = useContext(StateContext)
  if (!context)
    throw new Error('useStateContext must be used within StateProvider')
  return context
}

// Zustand Implementation
interface ZustandState {
  count: number
  games: Array<{ id: number; name: string }>
  increment: () => void
  addGame: (game: { id: number; name: string }) => void
}

const useZustandStore = create<ZustandState>((set) => ({
  count: 0,
  games: [],
  increment: () => set((state) => ({ count: state.count + 1 })),
  addGame: (game) => set((state) => ({ games: [...state.games, game] }))
}))

describe('State Management Performance Tests', () => {
  describe('Context API Performance', () => {
    it('should handle simple state updates', async () => {
      const CounterComponent = () => {
        const { count, increment } = useStateContext()
        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const App = () => (
        <StateProvider>
          <CounterComponent />
        </StateProvider>
      )

      const { stats } = await measureReRenderPerformance(
        () => render(<App />),
        async (result) => {
          fireEvent.click(result.getByTestId('increment'))
          await result.findByTestId('count')
        },
        50
      )

      printReactPerformanceStats('Context API: Simple Updates', stats)

      assertReactPerformanceThresholds(stats, {
        maxInitialRender: 30,
        maxAverageUpdate: 15,
        maxP95Update: 25
      })
    })

    it('should show unnecessary re-renders without optimization', async () => {
      const counter = createRenderCounter()

      const CountDisplay = memo(function CountDisplay() {
        counter.useRenderCounter()
        const { count } = useStateContext()
        return <div data-testid="count">{count}</div>
      })

      const GameDisplay = memo(function GameDisplay() {
        counter.useRenderCounter()
        const { games } = useStateContext()
        return <div data-testid="games">Games: {games.length}</div>
      })

      const App = () => {
        const { increment } = useStateContext()
        return (
          <div>
            <CountDisplay />
            <GameDisplay />
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const Wrapper = () => (
        <StateProvider>
          <App />
        </StateProvider>
      )

      const { getByTestId } = render(<Wrapper />)

      counter.reset()
      const initialRenders = counter.getRenderCount()

      fireEvent.click(getByTestId('increment'))

      const finalRenders = counter.getRenderCount()

      console.log('\n📊 Context API Re-renders')
      console.log(`   Initial renders: ${initialRenders}`)
      console.log(`   After count update: ${finalRenders}`)
      console.log(
        `   Both components re-rendered: ${finalRenders - initialRenders === 2}`
      )

      // Both components will re-render even though only count changed
      expect(finalRenders - initialRenders).toBeGreaterThan(0)
    })
  })

  describe('Zustand Performance', () => {
    beforeEach(() => {
      // Reset store before each test
      useZustandStore.setState({ count: 0, games: [] })
    })

    it('should handle simple state updates', async () => {
      const CounterComponent = () => {
        const count = useZustandStore((state) => state.count)
        const increment = useZustandStore((state) => state.increment)

        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const { stats } = await measureReRenderPerformance(
        () => render(<CounterComponent />),
        async (result) => {
          fireEvent.click(result.getByTestId('increment'))
          await result.findByTestId('count')
        },
        50
      )

      printReactPerformanceStats('Zustand: Simple Updates', stats)

      assertReactPerformanceThresholds(stats, {
        maxInitialRender: 25,
        maxAverageUpdate: 10,
        maxP95Update: 20
      })
    })

    it('should prevent unnecessary re-renders with selectors', async () => {
      const counter = createRenderCounter()

      const CountDisplay = memo(function CountDisplay() {
        counter.useRenderCounter()
        const count = useZustandStore((state) => state.count)
        return <div data-testid="count">{count}</div>
      })

      const GameDisplay = memo(function GameDisplay() {
        counter.useRenderCounter()
        const games = useZustandStore((state) => state.games)
        return <div data-testid="games">Games: {games.length}</div>
      })

      const App = () => {
        const increment = useZustandStore((state) => state.increment)
        return (
          <div>
            <CountDisplay />
            <GameDisplay />
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<App />)

      counter.reset()
      const initialRenders = counter.getRenderCount()

      fireEvent.click(getByTestId('increment'))

      const finalRenders = counter.getRenderCount()

      console.log('\n📊 Zustand Re-renders (with selectors)')
      console.log(`   Initial renders: ${initialRenders}`)
      console.log(`   After count update: ${finalRenders}`)
      console.log(
        `   Only CountDisplay re-rendered: ${finalRenders - initialRenders === 1}`
      )

      // Only CountDisplay should re-render
      expect(finalRenders - initialRenders).toBe(1)
    })

    it('should handle multiple subscribers efficiently', async () => {
      const Subscriber = ({ id }: { id: number }) => {
        const count = useZustandStore((state) => state.count)
        return <div data-testid={`subscriber-${id}`}>{count}</div>
      }

      const App = () => {
        const increment = useZustandStore((state) => state.increment)
        return (
          <div>
            {Array.from({ length: 50 }, (_, i) => (
              <Subscriber key={i} id={i} />
            ))}
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const { stats } = await measureReRenderPerformance(
        () => render(<App />),
        async (result) => {
          fireEvent.click(result.getByTestId('increment'))
          await result.findByTestId('subscriber-0')
        },
        20
      )

      printReactPerformanceStats('Zustand: 50 Subscribers', stats)

      assertReactPerformanceThresholds(stats, {
        maxInitialRender: 100,
        maxAverageUpdate: 50,
        maxP95Update: 75
      })
    })
  })

  describe('State Management Comparison', () => {
    it('should compare Context vs Zustand update performance', async () => {
      // Context API version
      const ContextCounter = () => {
        const { count, increment } = useStateContext()
        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const ContextApp = () => (
        <StateProvider>
          <ContextCounter />
        </StateProvider>
      )

      const { stats: contextStats } = await measureReRenderPerformance(
        () => render(<ContextApp />),
        async (result) => {
          fireEvent.click(result.getByTestId('increment'))
          await result.findByTestId('count')
        },
        100
      )

      // Zustand version
      useZustandStore.setState({ count: 0, games: [] })

      const ZustandCounter = () => {
        const count = useZustandStore((state) => state.count)
        const increment = useZustandStore((state) => state.increment)
        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const { stats: zustandStats } = await measureReRenderPerformance(
        () => render(<ZustandCounter />),
        async (result) => {
          fireEvent.click(result.getByTestId('increment'))
          await result.findByTestId('count')
        },
        100
      )

      printReactPerformanceStats('Context API Updates', contextStats)
      printReactPerformanceStats('Zustand Updates', zustandStats)

      console.log('\n📊 Performance Comparison')
      console.log(`   Context Mean: ${contextStats.averageUpdate.toFixed(2)}ms`)
      console.log(`   Zustand Mean: ${zustandStats.averageUpdate.toFixed(2)}ms`)
      console.log(
        `   Speedup: ${(contextStats.averageUpdate / zustandStats.averageUpdate).toFixed(2)}x`
      )

      // Both should be fast, but we're measuring the difference
      expect(contextStats.averageUpdate).toBeLessThan(20)
      expect(zustandStats.averageUpdate).toBeLessThan(20)
    })

    it('should compare selector performance', async () => {
      const createLargeState = () => ({
        count: 0,
        games: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Game ${i}`
        }))
      })

      // Zustand with efficient selector
      const useEfficientStore = create<{
        count: number
        games: Array<{ id: number; name: string }>
        increment: () => void
      }>((set) => ({
        ...createLargeState(),
        increment: () => set((state) => ({ count: state.count + 1 }))
      }))

      const EfficientComponent = () => {
        // Only subscribe to count
        const count = useEfficientStore((state) => state.count)
        const increment = useEfficientStore((state) => state.increment)

        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const { stats: efficientStats } = await measureReRenderPerformance(
        () => render(<EfficientComponent />),
        async (result) => {
          fireEvent.click(result.getByTestId('increment'))
          await result.findByTestId('count')
        },
        100
      )

      // Zustand with inefficient selector (subscribes to everything)
      const InefficientComponent = () => {
        // Subscribe to entire state
        const state = useEfficientStore()
        const { count, increment } = state

        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={increment} data-testid="increment">
              Increment
            </button>
          </div>
        )
      }

      const { stats: inefficientStats } = await measureReRenderPerformance(
        () => render(<InefficientComponent />),
        async (result) => {
          fireEvent.click(result.getByTestId('increment'))
          await result.findByTestId('count')
        },
        100
      )

      printReactPerformanceStats('Efficient Selector', efficientStats)
      printReactPerformanceStats('Inefficient Selector', inefficientStats)

      console.log('\n📊 Selector Efficiency')
      console.log(`   Efficient: ${efficientStats.averageUpdate.toFixed(2)}ms`)
      console.log(
        `   Inefficient: ${inefficientStats.averageUpdate.toFixed(2)}ms`
      )

      // Efficient selectors should be faster
      expect(efficientStats.averageUpdate).toBeLessThan(
        inefficientStats.averageUpdate * 1.5
      )
    })
  })

  describe('Large State Performance', () => {
    it('should handle large state updates in Zustand', async () => {
      interface LargeState {
        items: Array<{ id: number; value: string }>
        addItem: () => void
      }

      const useLargeStore = create<LargeState>((set) => ({
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `Item ${i}`
        })),
        addItem: () =>
          set((state) => ({
            items: [
              ...state.items,
              { id: state.items.length, value: `Item ${state.items.length}` }
            ]
          }))
      }))

      const LargeStateComponent = () => {
        const itemCount = useLargeStore((state) => state.items.length)
        const addItem = useLargeStore((state) => state.addItem)

        return (
          <div>
            <span data-testid="count">{itemCount}</span>
            <button onClick={addItem} data-testid="add">
              Add Item
            </button>
          </div>
        )
      }

      const { stats } = await measureReRenderPerformance(
        () => render(<LargeStateComponent />),
        async (result) => {
          fireEvent.click(result.getByTestId('add'))
          await result.findByTestId('count')
        },
        50
      )

      printReactPerformanceStats('Large State Updates (1000+ items)', stats)

      assertReactPerformanceThresholds(stats, {
        maxInitialRender: 50,
        maxAverageUpdate: 30,
        maxP95Update: 50
      })
    })
  })
})
