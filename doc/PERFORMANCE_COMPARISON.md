# Performance Results Comparison Guide

Complete guide to tracking, comparing, and analyzing performance test results over time.

## Overview

The performance test suite automatically saves results to disk, enabling:

- **Baseline Tracking**: Establish performance baselines for comparison
- **Regression Detection**: Automatically detect performance regressions
- **Trend Analysis**: Track performance changes over time
- **CSV Export**: Export results for external analysis (Excel, Google Sheets, etc.)

## Quick Start

### 1. Run Performance Tests (Creates Results)

```bash
# Run tests and save results
pnpm test:performance
```

Results are automatically saved to `performance-results/` directory.

### 2. Create Baseline

```bash
# Save current performance as baseline for future comparisons
pnpm test:performance:baseline
```

This creates `performance-results/baseline.json` which serves as the reference point.

### 3. Compare Against Baseline

```bash
# Run tests and automatically compare with baseline
pnpm test:performance:compare
```

Or compare manually:

```bash
# Compare latest results with baseline
pnpm compare-performance
```

## Directory Structure

```
performance-results/
├── baseline.json                              # Reference baseline
├── ipc-performance_report_2025-01-15.json     # Test report
├── ipc-performance_2025-01-15.csv             # CSV export
├── store-performance_report_2025-01-15.json
└── store-performance_2025-01-15.csv
```

## Result File Formats

### JSON Report Format

```json
{
  "testSuite": "ipc-performance",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": {
    "node": "v22.14.0",
    "platform": "linux",
    "arch": "x64"
  },
  "results": [
    {
      "testName": "IPC: Simple String Response",
      "timestamp": "2025-01-15T10:30:01.000Z",
      "commit": "abc1234",
      "branch": "main",
      "stats": {
        "mean": 0.15,
        "median": 0.12,
        "min": 0.08,
        "max": 2.34,
        "p95": 0.28,
        "p99": 0.45,
        "stdDev": 0.12
      },
      "iterations": 1000,
      "metadata": {
        "memoryDelta": 4096
      }
    }
  ]
}
```

### CSV Format

```csv
Test Name,Timestamp,Mean (ms),Median (ms),Min (ms),Max (ms),P95 (ms),P99 (ms),Std Dev (ms),Iterations
IPC: Simple String Response,2025-01-15T10:30:01.000Z,0.15,0.12,0.08,2.34,0.28,0.45,0.12,1000
```

## Comparison Output

### Console Output

```
================================================================================
📊 PERFORMANCE COMPARISON
================================================================================

Baseline: baseline.json
  Test Suite: ipc-performance
  Timestamp:  2025-01-10T10:00:00.000Z
  Environment: Node v22.14.0 on linux

Current: Latest run
  Test Suite: ipc-performance
  Timestamp:  2025-01-15T10:30:00.000Z
  Environment: Node v22.14.0 on linux

--------------------------------------------------------------------------------
DETAILED RESULTS
--------------------------------------------------------------------------------

✅ IPC: Simple String Response
   Mean:   0.15ms → 0.12ms 🟢 -20.0%
   Median: 0.12ms → 0.10ms 🟢 -16.7%
   P95:    0.28ms → 0.25ms 🟢 -10.7%
   P99:    0.45ms → 0.40ms 🟢 -11.1%

❌ IPC: Large Library (500 games)
   Mean:   42.15ms → 52.30ms 🔴 +24.1%
   Median: 40.23ms → 50.12ms 🔴 +24.6%
   P95:    58.32ms → 68.45ms 🔴 +17.4%
   P99:    65.43ms → 75.23ms 🔴 +15.0%

--------------------------------------------------------------------------------
SUMMARY
--------------------------------------------------------------------------------

📈 Total tests: 15
   🔴 Regressions:  1
   🟢 Improvements: 3
   ⚪ Stable:       11

⚠️  PERFORMANCE REGRESSIONS DETECTED!

Regressed tests:
  - IPC: Large Library (500 games): 🔴 +24.1%
```

### Icon Legend

- ✅ **Green check** - Performance improvement (>10% faster)
- ❌ **Red X** - Performance regression (>10% slower)
- ➡️ **Arrow** - Stable performance (within ±10%)
- 🟢 **Green dot** - Faster
- 🔴 **Red dot** - Slower
- ⚪ **White dot** - Neutral

## Workflows

### Setting Initial Baseline

When starting performance tracking:

```bash
# 1. Run tests and create baseline
pnpm test:performance:baseline

# 2. Commit the baseline
git add performance-results/baseline.json
git commit -m "Add performance baseline"
```

### Daily Development

```bash
# Run tests with automatic comparison
pnpm test:performance:compare
```

If regressions detected, the command exits with code 1 (fails).

### Before Committing Changes

```bash
# Check if your changes affected performance
pnpm test:performance:compare

# If improvements, update baseline
pnpm test:performance:baseline
git add performance-results/baseline.json
git commit -m "Update performance baseline with improvements"
```

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Performance Tests

on: [pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2

      - name: Run performance tests
        run: pnpm test:performance

      - name: Compare with baseline
        run: pnpm compare-performance
        continue-on-error: true

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results/

      - name: Comment PR with results
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync('performance-results/comparison.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Test Results\n\n\`\`\`\n${results}\n\`\`\``
            });
```

## Advanced Usage

### Compare Two Specific Reports

```bash
# Compare any two result files
pnpm compare-performance performance-results/report1.json performance-results/report2.json
```

### Custom Thresholds

Edit `scripts/compare-performance.ts`:

```typescript
const REGRESSION_THRESHOLD = 0.15 // 15% slower is regression
const IMPROVEMENT_THRESHOLD = 0.15 // 15% faster is improvement
```

### Cleanup Old Results

The system keeps all results by default. To clean up:

```bash
# Keep only last 10 results (manually run in node)
node -e "require('./src/backend/__tests__/performance/utils/performance-storage').cleanupOldResults(10)"
```

## Analyzing Results

### Using CSV in Excel/Google Sheets

1. Open the CSV file in Excel or Google Sheets
2. Create pivot tables to analyze:
   - Performance over time
   - Test-by-test comparison
   - Statistical analysis

### Plotting Trends

```python
# Python example
import pandas as pd
import matplotlib.pyplot as plt

# Load CSV
df = pd.read_csv('performance-results/ipc-performance_2025-01-15.csv')

# Plot mean performance over tests
plt.figure(figsize=(12, 6))
plt.bar(df['Test Name'], df['Mean (ms)'])
plt.xlabel('Test')
plt.ylabel('Mean Time (ms)')
plt.title('IPC Performance Tests')
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.savefig('performance-chart.png')
```

### Automated Dashboards

Tools like Grafana can ingest CSV files or JSON for dashboard creation:

1. Set up Grafana
2. Configure CSV data source
3. Create dashboards tracking:
   - Mean, P95, P99 over time
   - Regression alerts
   - Performance trends by test suite

## Interpreting Results

### What's a Regression?

A test is marked as regressed if:

- Mean time increased by >10% (configurable)
- Consistently slower, not just variance

### When to Update Baseline

Update baseline when:

- ✅ You've made intentional performance improvements
- ✅ Environment changed (new machine, Node version)
- ✅ Test methodology changed
- ❌ NOT when you've introduced regressions

### Dealing with Noise

Performance tests can be noisy. Tips:

- Run multiple times and average
- Close other applications
- Use CI for consistent environment
- Look at P95/P99, not just mean
- Check standard deviation

## Troubleshooting

### No Baseline Found

```
❌ No baseline found!
   Run: SAVE_BASELINE=true pnpm test:performance to create one
```

**Solution:**

```bash
pnpm test:performance:baseline
```

### No Matching Tests

```
❌ No matching tests found between the two reports
```

**Cause:** Test names changed or different test suites

**Solution:** Ensure consistent test names, or compare reports from same suite

### Results Directory Missing

**Solution:** Tests create it automatically, but you can create manually:

```bash
mkdir performance-results
```

### Large Result Files

If `performance-results/` grows too large:

```bash
# Keep only recent results
git rm performance-results/*.json performance-results/*.csv
git add performance-results/baseline.json
git commit -m "Clean up old performance results"
```

## Best Practices

### 1. Consistent Environment

Run performance tests in consistent environments:

- Same hardware
- Same Node version
- Same system load
- Dedicated CI runners

### 2. Multiple Iterations

More iterations = more reliable stats:

- Fast tests (< 1ms): 1000+ iterations
- Medium tests (1-100ms): 100+ iterations
- Slow tests (> 100ms): 20+ iterations

### 3. Baseline Strategy

Two approaches:

**A. Rolling Baseline** (recommended for active development)

- Update baseline frequently with improvements
- Track relative changes

**B. Fixed Baseline** (recommended for releases)

- Only update baseline per release
- Track absolute changes from release baseline

### 4. Version Control

Commit baselines but not individual results:

```bash
git add performance-results/baseline.json
git commit -m "Update performance baseline"
```

Results are in `.gitignore` except baseline.

### 5. CI Integration

- Run on every PR
- Block merge if regressions detected
- Generate comparison reports
- Track trends in separate dashboard

## Examples

### Example 1: Feature Development

```bash
# Start feature work
git checkout -b feature/new-game-scanner

# Run tests to establish current performance
pnpm test:performance

# Implement feature
# ...

# Check performance impact
pnpm test:performance:compare

# If improved, update baseline
pnpm test:performance:baseline
```

### Example 2: Performance Investigation

```bash
# Baseline current state
pnpm test:performance:baseline

# Try optimization
# ... make changes ...

# Compare
pnpm test:performance:compare

# If not better, revert and try again
git checkout .

# If better, commit
git add .
git commit -m "Optimize IPC handlers"
```

### Example 3: Continuous Monitoring

```bash
# Weekly performance check
pnpm test:performance:compare

# If stable, great!
# If regressions, investigate commits since last baseline
git log performance-results/baseline.json..HEAD

# Find problematic commit
git bisect start
git bisect bad HEAD
git bisect good <last-good-commit>
# Test each commit
pnpm test:performance:compare
git bisect good/bad
```

## Related Documentation

- [Performance Testing Guide](./PERFORMANCE_TESTING.md) - Main testing documentation
- [Backend Performance Tests](../src/backend/__tests__/performance/README.md)
- [Frontend Performance Tests](../src/frontend/__tests__/performance/README.md)

---

**Last Updated**: 2025-12-19
