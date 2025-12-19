# Performance Testing Quick Reference

## 🚀 Quick Commands

```bash
# Run all performance tests
pnpm test:all-performance

# Run backend tests only
pnpm test:performance:backend

# Run frontend tests only
pnpm test:performance:frontend

# Run E2E performance tests
pnpm test:e2e:performance

# Save current results as baseline
pnpm test:performance:baseline

# Run and compare with baseline
pnpm test:performance:compare

# Manually compare latest vs baseline
pnpm compare-performance
```

## 📊 Results & Comparison

All test results are automatically saved to `performance-results/`:

- **JSON Reports**: Full test results with stats
- **CSV Exports**: For Excel/Google Sheets analysis
- **Baseline**: Reference point for comparisons

### Typical Workflow

```bash
# 1. Initial setup - create baseline
pnpm test:performance:baseline

# 2. During development - check for regressions
pnpm test:performance:compare

# 3. If improved - update baseline
pnpm test:performance:baseline
git add performance-results/baseline.json
git commit -m "Update performance baseline"
```

## 📈 What's Tested

### Backend

- IPC handler response times (< 1ms for simple calls)
- electron-store operations (read < 0.5ms, write < 2ms)
- Large data handling (1000+ games)
- Memory leak detection
- Concurrent operations

### Frontend

- React component rendering
- State management (Context vs Zustand)
- List performance (10-500+ items)
- Re-render optimization
- Memory usage

### E2E

- Application startup (< 10s)
- Page navigation (< 2s)
- User interactions (< 500ms)
- Frame rate (> 30 FPS)
- Memory patterns

## 📖 Documentation

- **[Performance Testing Guide](./doc/PERFORMANCE_TESTING.md)** - Complete testing documentation
- **[Performance Comparison Guide](./doc/PERFORMANCE_COMPARISON.md)** - Results tracking & analysis
- **[Backend Tests README](./src/backend/__tests__/performance/README.md)** - Backend-specific guide
- **[Frontend Tests README](./src/frontend/__tests__/performance/README.md)** - Frontend-specific guide

## 🔍 Comparison Output Example

```
================================================================================
📊 PERFORMANCE COMPARISON
================================================================================

✅ IPC: Simple String Response
   Mean:   0.15ms → 0.12ms 🟢 -20.0%

❌ IPC: Large Library (500 games)
   Mean:   42.15ms → 52.30ms 🔴 +24.1%

📈 Summary
   Total tests: 15
   🔴 Regressions:  1
   🟢 Improvements: 3
   ⚪ Stable:       11
```

## 🛠 CI/CD Integration

```yaml
# .github/workflows/performance.yml
- name: Run performance tests
  run: pnpm test:performance

- name: Compare with baseline
  run: pnpm compare-performance
```

## 💡 Tips

- Run tests in consistent environment
- Use baselines for regression detection
- Export CSV for trend analysis
- Update baseline when intentionally improving performance
- Check P95/P99 not just mean for reliability

---

For detailed information, see [Performance Testing Guide](./doc/PERFORMANCE_TESTING.md)
