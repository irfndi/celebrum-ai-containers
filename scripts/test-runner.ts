#!/usr/bin/env tsx
/**
 * Comprehensive test runner script
 * Executes different types of tests and generates reports
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logging utilities
const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

// Test configuration
interface TestConfig {
  name: string;
  description: string;
  command: string;
  pattern?: string;
  timeout?: number;
  coverage?: boolean;
}

const testConfigs: Record<string, TestConfig> = {
  unit: {
    name: 'Unit Tests',
    description: 'Run unit tests for individual components',
    command: 'vitest run src/*/tests/unit/*.test.ts src/**/tests/unit/**/*.test.ts src/tests/unit.test.ts',
    pattern: '{src/*/tests/unit/*.test.ts,src/**/tests/unit/**/*.test.ts,src/tests/unit.test.ts}',
    coverage: true,
    timeout: 30000
  },
  integration: {
    name: 'Integration Tests',
    description: 'Run integration tests for component interactions',
    command: 'vitest run src/*/tests/integration/*.test.ts src/**/tests/integration/**/*.test.ts',
    pattern: '{src/*/tests/integration/*.test.ts,src/**/tests/integration/**/*.test.ts}',
    coverage: true,
    timeout: 60000
  },
  e2e: {
    name: 'End-to-End Tests',
    description: 'Run end-to-end tests for complete workflows',
    command: 'vitest run src/*/tests/e2e/*.test.ts src/**/tests/e2e/**/*.test.ts',
    pattern: '{src/*/tests/e2e/*.test.ts,src/**/tests/e2e/**/*.test.ts}',
    coverage: false,
    timeout: 120000
  },
  telegram: {
    name: 'Telegram Bot Tests',
    description: 'Run tests specific to Telegram bot functionality',
    command: 'vitest run src/telegram-bot/tests/*.test.ts src/telegram-bot/tests/**/*.test.ts',
    pattern: '{src/telegram-bot/tests/*.test.ts,src/telegram-bot/tests/**/*.test.ts}',
    coverage: true,
    timeout: 45000
  },
  web: {
    name: 'Web API Tests',
    description: 'Run tests for web API endpoints',
    command: 'vitest run src/web/tests/*.test.ts src/web/tests/**/*.test.ts',
    pattern: '{src/web/tests/*.test.ts,src/web/tests/**/*.test.ts}',
    coverage: true,
    timeout: 45000
  },
  shared: {
    name: 'Shared Module Tests',
    description: 'Run tests for shared utilities and services',
    command: 'vitest run src/shared/tests/*.test.ts src/shared/tests/**/*.test.ts',
    pattern: '{src/shared/tests/*.test.ts,src/shared/tests/**/*.test.ts}',
    coverage: true,
    timeout: 30000
  },
  all: {
    name: 'All Tests',
    description: 'Run complete test suite',
    command: 'vitest run src/tests/unit.test.ts src/*/tests/unit/*.test.ts src/**/tests/unit/**/*.test.ts src/*/tests/integration/*.test.ts src/**/tests/integration/**/*.test.ts src/*/tests/e2e/*.test.ts src/**/tests/e2e/**/*.test.ts',
    pattern: '{src/tests/unit.test.ts,src/*/tests/unit/*.test.ts,src/**/tests/unit/**/*.test.ts,src/*/tests/integration/*.test.ts,src/**/tests/integration/**/*.test.ts,src/*/tests/e2e/*.test.ts,src/**/tests/e2e/**/*.test.ts}',
    coverage: true,
    timeout: 300000
  },
  watch: {
    name: 'Watch Mode',
    description: 'Run tests in watch mode for development',
    command: 'vitest',
    coverage: false,
    timeout: 0
  },
  coverage: {
    name: 'Coverage Report',
    description: 'Generate comprehensive coverage report',
    command: 'vitest run --coverage',
    coverage: true,
    timeout: 180000
  }
};

// Test result interface
interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

// Test report interface
interface TestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    totalDuration: number;
  };
  results: TestResult[];
}

// Execute a test configuration
async function runTest(config: TestConfig): Promise<TestResult> {
  const startTime = Date.now();
  
  log.info(`Running ${config.name}...`);
  log.info(`Description: ${config.description}`);
  
  try {
    // Set environment variables for testing
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      VITEST_TIMEOUT: config.timeout?.toString() || '30000'
    };

    // Execute the test command
    const output = execSync(config.command, {
      cwd: rootDir,
      env,
      encoding: 'utf8',
      timeout: config.timeout || 30000,
      stdio: 'pipe'
    });

    const duration = Date.now() - startTime;
    
    log.success(`${config.name} completed in ${duration}ms`);
    
    return {
      name: config.name,
      success: true,
      duration,
      output,
      coverage: config.coverage ? extractCoverageInfo(output) : undefined
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    
    log.error(`${config.name} failed after ${duration}ms`);
    
    const errorObj = error as { stdout?: string; stderr?: string; message?: string };
    return {
      name: config.name,
      success: false,
      duration,
      output: errorObj.stdout || '',
      error: errorObj.stderr || errorObj.message || 'Unknown error'
    };
  }
}

// Extract coverage information from test output
function extractCoverageInfo(output: string): { lines: number; functions: number; branches: number; statements: number } | undefined {
  const coverageRegex = /Lines\s+:\s+(\d+\.\d+)%.*Functions\s+:\s+(\d+\.\d+)%.*Branches\s+:\s+(\d+\.\d+)%.*Statements\s+:\s+(\d+\.\d+)%/s;
  const match = output.match(coverageRegex);
  
  if (match) {
    return {
      lines: parseFloat(match[1]),
      functions: parseFloat(match[2]),
      branches: parseFloat(match[3]),
      statements: parseFloat(match[4])
    };
  }
  
  return undefined;
}

// Generate test report
function generateReport(results: TestResult[]): void {
  const reportDir = path.join(rootDir, 'test-reports');
  
  // Ensure report directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Generate JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    },
    results
  };

  fs.writeFileSync(
    path.join(reportDir, 'test-results.json'),
    JSON.stringify(jsonReport, null, 2)
  );

  // Generate HTML report
  const htmlReport = generateHtmlReport(jsonReport);
  fs.writeFileSync(
    path.join(reportDir, 'test-results.html'),
    htmlReport
  );

  // Generate console summary
  log.header('Test Summary');
  log.info(`Total tests: ${jsonReport.summary.total}`);
  log.success(`Passed: ${jsonReport.summary.passed}`);
  if (jsonReport.summary.failed > 0) {
    log.error(`Failed: ${jsonReport.summary.failed}`);
  }
  log.info(`Total duration: ${jsonReport.summary.totalDuration}ms`);
  
  // Coverage summary
  const coverageResults = results.filter(r => r.coverage);
  if (coverageResults.length > 0) {
    log.header('Coverage Summary');
    coverageResults.forEach(result => {
      if (result.coverage) {
        log.info(`${result.name}:`);
        log.info(`  Lines: ${result.coverage.lines}%`);
        log.info(`  Functions: ${result.coverage.functions}%`);
        log.info(`  Branches: ${result.coverage.branches}%`);
        log.info(`  Statements: ${result.coverage.statements}%`);
      }
    });
  }

  log.info(`\nReports generated in: ${reportDir}`);
}

// Generate HTML report
function generateHtmlReport(report: TestReport): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Celebrum AI Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .total { color: #007bff; }
        .duration { color: #6c757d; }
        .results { margin-top: 30px; }
        .result-item { margin-bottom: 20px; padding: 15px; border-radius: 8px; border-left: 4px solid; }
        .result-success { background: #d4edda; border-color: #28a745; }
        .result-failure { background: #f8d7da; border-color: #dc3545; }
        .result-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .result-name { font-weight: bold; font-size: 1.1em; }
        .result-duration { color: #6c757d; font-size: 0.9em; }
        .coverage { margin-top: 10px; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #28a745, #ffc107, #dc3545); transition: width 0.3s ease; }
        .error-output { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.9em; margin-top: 10px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Celebrum AI Test Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value total">${report.summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value passed">${report.summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value failed">${report.summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value duration">${report.summary.totalDuration}ms</div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Results</h2>
            ${report.results.map((result: TestResult) => `
                <div class="result-item ${result.success ? 'result-success' : 'result-failure'}">
                    <div class="result-header">
                        <span class="result-name">${result.success ? '✅' : '❌'} ${result.name}</span>
                        <span class="result-duration">${result.duration}ms</span>
                    </div>
                    ${result.coverage ? `
                        <div class="coverage">
                            <strong>Coverage:</strong>
                            <div>Lines: ${result.coverage.lines}%</div>
                            <div class="coverage-bar"><div class="coverage-fill" style="width: ${result.coverage.lines}%"></div></div>
                            <div>Functions: ${result.coverage.functions}%</div>
                            <div class="coverage-bar"><div class="coverage-fill" style="width: ${result.coverage.functions}%"></div></div>
                            <div>Branches: ${result.coverage.branches}%</div>
                            <div class="coverage-bar"><div class="coverage-fill" style="width: ${result.coverage.branches}%"></div></div>
                            <div>Statements: ${result.coverage.statements}%</div>
                            <div class="coverage-bar"><div class="coverage-fill" style="width: ${result.coverage.statements}%"></div></div>
                        </div>
                    ` : ''}
                    ${result.error ? `<div class="error-output">${result.error}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
  `;
}

// Check if test files exist for a given pattern
function checkTestFiles(pattern?: string): boolean {
  if (!pattern) return true;
  // Use fast-glob to match files
  const files = fg.sync(pattern, { cwd: rootDir, absolute: true });
  return files.length > 0;
}

// Main execution function
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    bail: args.includes('--bail') || args.includes('-b'),
    parallel: args.includes('--parallel') || args.includes('-p')
  };

  log.header('🧪 Celebrum AI Test Runner');
  
  // Validate test type
  if (!testConfigs[testType]) {
    log.error(`Unknown test type: ${testType}`);
    log.info('Available test types:');
    Object.entries(testConfigs).forEach(([key, config]) => {
      log.info(`  ${key}: ${config.description}`);
    });
    process.exit(1);
  }

  const config = testConfigs[testType];
  
  // Check if test files exist
  if (config.pattern && !checkTestFiles(config.pattern)) {
    log.warning(`No test files found matching pattern: ${config.pattern}`);
    log.info('Skipping test execution.');
    return;
  }

  const results: TestResult[] = [];

  if (testType === 'all') {
    // Run all test types sequentially
    const testTypes = ['unit', 'integration', 'e2e'];
    
    for (const type of testTypes) {
      const typeConfig = testConfigs[type];
      if (typeConfig.pattern && !checkTestFiles(typeConfig.pattern)) {
        log.warning(`Skipping ${type} tests - no test files found`);
        continue;
      }
      
      const result = await runTest(typeConfig);
      results.push(result);
      
      if (!result.success && options.bail) {
        log.error('Test failed and --bail option is set. Stopping execution.');
        break;
      }
    }
  } else {
    // Run specific test type
    const result = await runTest(config);
    results.push(result);
  }

  // Generate reports
  if (results.length > 0) {
    generateReport(results);
  }

  // Exit with appropriate code
  const hasFailures = results.some(r => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    log.error(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

export { main, runTest, generateReport, testConfigs };