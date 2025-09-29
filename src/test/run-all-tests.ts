#!/usr/bin/env node

import { spawn } from 'child_process';
import { DevShowcase } from './showcase/dev.showcase';
import { StagingShowcase } from './showcase/staging.showcase';
import { ProductionShowcase } from './showcase/production.showcase';

// Simple console coloring without log (log v5 has ESM issues)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const log = {
  blue: (text: string) => console.log(`${colors.blue}${text}${colors.reset}`),
  green: (text: string) => console.log(`${colors.green}${text}${colors.reset}`),
  red: (text: string) => console.log(`${colors.red}${text}${colors.reset}`),
  yellow: (text: string) => console.log(`${colors.yellow}${text}${colors.reset}`),
  cyan: (text: string) => console.log(`${colors.cyan}${text}${colors.reset}`),
  gray: (text: string) => console.log(`${colors.gray}${text}${colors.reset}`),
  bold: (text: string) => console.log(`${colors.bold}${text}${colors.reset}`),
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  async runCommand(name: string, command: string, args: string[] = []): Promise<TestResult> {
    log.blue(`\n🧪 Running: ${name}`);
    log.gray(`Command: ${command} ${args.join(' ')}`);

    const startTime = Date.now();

    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(`${colors.gray}${data}${colors.reset}`);
      });

      childProcess.stderr.on('data', (data) => {
        error += data.toString();
        process.stderr.write(`${colors.red}${data}${colors.reset}`);
      });

      childProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;

        const result: TestResult = {
          name,
          passed,
          duration,
          output,
          error: error || undefined,
        };

        this.results.push(result);

        if (passed) {
          log.green(`✅ ${name} passed (${duration}ms)`);
        } else {
          log.red(`❌ ${name} failed (${duration}ms)`);
        }

        resolve(result);
      });
    });
  }

  async runShowcase(name: string, ShowcaseClass: any): Promise<TestResult> {
    console.log(log.blue(`\n🎭 Running Showcase: ${name}`));
    const startTime = Date.now();

    try {
      const showcase = new ShowcaseClass();
      const success = await showcase.runAll();

      const duration = Date.now() - startTime;
      const result: TestResult = {
        name: `Showcase: ${name}`,
        passed: success,
        duration,
      };

      this.results.push(result);

      if (success) {
        console.log(log.green(`✅ ${name} Showcase passed (${duration}ms)`));
      } else {
        console.log(log.yellow(`⚠️ ${name} Showcase had some failures (${duration}ms)`));
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        name: `Showcase: ${name}`,
        passed: false,
        duration,
        error: error.message,
      };

      this.results.push(result);
      console.log(log.red(`❌ ${name} Showcase failed: ${error.message}`));

      return result;
    }
  }

  async runAllTests() {
    log.cyan('\n🚀 Starting Comprehensive Test Suite\n');
    log.gray('='.repeat(60));

    // 1. Unit Tests
    log.yellow('\n📦 UNIT TESTS');
    await this.runCommand('Unit Tests', 'npm', ['run', 'test', '--', '--testPathPattern=unit']);

    // 2. Integration Tests
    log.yellow('\n🔗 INTEGRATION TESTS');
    await this.runCommand('Integration Tests', 'npm', [
      'run',
      'test',
      '--',
      '--testPathPattern=integration',
    ]);

    // 3. E2E Tests
    log.yellow('\n🌐 E2E TESTS');
    await this.runCommand('E2E Tests', 'npm', ['run', 'test:e2e']);

    // 4. Showcases
    log.yellow('\n🎭 SHOWCASE SCENARIOS');

    // Check if services are running
    log.gray('\nChecking service availability...');
    const servicesAvailable = await this.checkServices();

    if (servicesAvailable) {
      await this.runShowcase('Development', DevShowcase);
      await this.runShowcase('Staging', StagingShowcase);
      await this.runShowcase('Production', ProductionShowcase);
    } else {
      console.log(log.yellow('⚠️ Services not available, skipping showcases'));
    }

    // 5. Code Quality Checks
    log.yellow('\n🔍 CODE QUALITY');
    await this.runCommand('Linting', 'npm', ['run', 'lint']);
    await this.runCommand('Type Checking', 'npx', ['tsc', '--noEmit']);

    // 6. Test Coverage
    log.yellow('\n📊 TEST COVERAGE');
    await this.runCommand('Coverage Report', 'npm', ['run', 'test:cov']);

    this.printSummary();
  }

  async checkServices(): Promise<boolean> {
    try {
      // Check if app is running
      const { default: axios } = await import('axios');
      await axios.get('http://localhost:3000/health');
      console.log(log.green('✅ Application is running'));
      return true;
    } catch {
      console.log(log.yellow('⚠️ Application is not running'));
      console.log(log.gray('Start the application with: npm run start:dev'));
      return false;
    }
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    log.gray('\n' + '='.repeat(60));
    log.cyan('\n📊 TEST RESULTS SUMMARY\n');

    // Results table
    log.bold('Test Results:');
    this.results.forEach((result) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const statusColor = result.passed ? colors.green : colors.red;
      const duration = `(${result.duration}ms)`;
      console.log(
        `  ${statusColor}${status}${colors.reset} ${result.name} ${colors.gray}${duration}${colors.reset}`,
      );
      if (result.error) {
        console.log(`${colors.red}     Error: ${result.error.split('\n')[0]}${colors.reset}`);
      }
    });

    // Summary statistics
    log.bold('\n📈 Statistics:');
    console.log(`  Total Tests: ${this.results.length}`);
    log.green(`  Passed: ${passed}`);
    log.red(`  Failed: ${failed}`);
    console.log(`  Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    // Final verdict
    log.gray('\n' + '='.repeat(60));
    if (failed === 0) {
      log.green('\n✅ ALL TESTS PASSED! 🎉\n');
      process.exit(0);
    } else {
      log.red(`\n❌ ${failed} TEST(S) FAILED\n`);
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const runner = new TestRunner();

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(log.yellow('\n\n⚠️ Test run interrupted'));
    process.exit(1);
  });

  runner.runAllTests().catch((error) => {
    console.error(log.red('\n💥 Fatal error:'), error);
    process.exit(1);
  });
}
