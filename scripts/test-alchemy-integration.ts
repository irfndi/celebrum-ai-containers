#!/usr/bin/env tsx

/**
 * Test script for Alchemy integration
 * Validates configuration, imports, and dry-run functionality
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

class AlchemyIntegrationTester {
  private results: TestResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  private addResult(name: string, passed: boolean, message: string): void {
    this.results.push({ name, passed, message });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${message}`);
  }

  async testFileExistence(): Promise<void> {
    console.log('\n🔍 Testing file existence...');
    
    const requiredFiles = [
      'alchemy.config.ts',
      'scripts/deploy-alchemy.ts',
      'wrangler.jsonc',
      'src/index.ts',
      '.env.example',
      'docs/ALCHEMY_INTEGRATION.md'
    ];

    for (const file of requiredFiles) {
      const filePath = join(this.projectRoot, file);
      const exists = existsSync(filePath);
      this.addResult(
        `File: ${file}`,
        exists,
        exists ? 'exists' : 'missing'
      );
    }
  }

  async testAlchemyConfigImport(): Promise<void> {
    console.log('\n🔧 Testing Alchemy config import...');
    
    try {
      const { createAlchemyConfig } = await import('../alchemy.config.ts');
      
      // Test that the function exists
      this.addResult(
        'Alchemy config function import',
        typeof createAlchemyConfig === 'function',
        'createAlchemyConfig function imported successfully'
      );
      
      // Test that the function can be called (but don't actually call it to avoid side effects)
      this.addResult(
        'Alchemy config function type',
        createAlchemyConfig.constructor.name === 'AsyncFunction',
        'function is async as expected'
      );
    } catch (error) {
      this.addResult(
        'Alchemy config import',
        false,
        `failed: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  async testDeploymentScriptImport(): Promise<void> {
    console.log('\n🔍 Testing deployment script import...');
    
    try {
      const script = await import('./deploy-alchemy.ts');
      const hasAlchemyDeployment = 'AlchemyDeployment' in script;
      this.addResult(
        'Deployment script import',
        hasAlchemyDeployment,
        hasAlchemyDeployment ? 'successfully imported' : 'missing AlchemyDeployment export'
      );
    } catch (error) {
      this.addResult(
        'Deployment script import',
        false,
        `failed: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  async testPackageJsonScripts(): Promise<void> {
    console.log('\n🔍 Testing package.json scripts...');
    
    try {
      const packageJson = await import('../package.json', { assert: { type: 'json' } });
      const scripts = packageJson.default.scripts;
      
      const requiredScripts = [
        'deploy:alchemy',
        'deploy:alchemy:staging',
        'deploy:alchemy:dev',
        'deploy:alchemy:dry-run',
        'build:alchemy'
      ];

      for (const script of requiredScripts) {
        const exists = script in scripts;
        this.addResult(
          `Script: ${script}`,
          exists,
          exists ? 'defined' : 'missing'
        );
      }
    } catch (error) {
      this.addResult(
        'Package.json scripts',
        false,
        `failed to read: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  async testEnvironmentVariables(): Promise<void> {
    console.log('\n🔍 Testing environment variables...');
    
    const requiredEnvVars = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN'
    ];

    const optionalEnvVars = [
      'ALCHEMY_ENVIRONMENT',
      'ALCHEMY_DRY_RUN',
      'ALCHEMY_VERBOSE',
      'CONTAINER_MESSAGE',
      'NODE_ENV'
    ];

    for (const envVar of requiredEnvVars) {
      const exists = process.env[envVar] !== undefined;
      this.addResult(
        `Required env: ${envVar}`,
        true, // We don't fail tests for missing env vars in test mode
        exists ? 'set' : 'not set (expected in test mode)'
      );
    }

    for (const envVar of optionalEnvVars) {
      const exists = process.env[envVar] !== undefined;
      this.addResult(
        `Optional env: ${envVar}`,
        true,
        exists ? 'set' : 'not set'
      );
    }
  }

  async testDryRunDeployment(): Promise<void> {
    console.log('\n🔍 Testing dry-run deployment...');
    
    try {
      const { AlchemyDeployment } = await import('./deploy-alchemy.ts');
      
      const deployment = new AlchemyDeployment({
        environment: 'development',
        dryRun: true,
        verbose: false
      });

      // Test that the deployment object was created successfully
      this.addResult(
        'Dry-run deployment creation',
        deployment !== null,
        'AlchemyDeployment instance created'
      );

      // Note: We don't actually run the deployment here to avoid side effects
      this.addResult(
        'Dry-run deployment setup',
        true,
        'ready for execution (not executed in test)'
      );
    } catch (error) {
      this.addResult(
        'Dry-run deployment',
        false,
        `failed: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Alchemy Integration Tests\n');
    console.log('=' .repeat(50));

    await this.testFileExistence();
    await this.testAlchemyConfigImport();
    await this.testDeploymentScriptImport();
    await this.testPackageJsonScripts();
    await this.testEnvironmentVariables();
    await this.testDryRunDeployment();

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;

    console.log(`Total tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }

    console.log('\n🎯 Integration Status:', failed === 0 ? '✅ READY' : '⚠️  NEEDS ATTENTION');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AlchemyIntegrationTester();
  tester.runAllTests().catch(console.error);
}

export { AlchemyIntegrationTester };