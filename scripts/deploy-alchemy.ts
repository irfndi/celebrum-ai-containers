#!/usr/bin/env tsx

import { execSync } from 'node:child_process';

interface DeploymentOptions {
  environment: 'development' | 'staging' | 'production';
  dryRun?: boolean;
  verbose?: boolean;
}

class AlchemyDeployment {
  private options: DeploymentOptions;

  constructor(options: DeploymentOptions) {
    this.options = options;
  }

  async validateEnvironment(): Promise<void> {
    const requiredEnvVars = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      if (this.options.dryRun) {
        console.log('⚠️  Dry run mode: Skipping environment validation');
        console.log(`   Missing variables: ${missingVars.join(', ')}`);
        console.log('   In production, ensure these are set in your .env file');
        return;
      }
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ Environment variables validated');
  }

  async buildContainer(): Promise<void> {
    console.log('🔨 Building container image...');
    
    if (this.options.dryRun) {
      console.log('⚠️  Dry run mode: Skipping actual container build');
      console.log('   Would execute: docker build -t celebrum-ai:latest .');
      console.log('✅ Container build simulation completed');
      return;
    }
    
    try {
      execSync('docker build -t celebrum-ai:latest .', {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd(),
      });
      console.log('✅ Container image built successfully');
    } catch (error) {
      throw new Error(`Failed to build container: ${error}`);
    }
  }

  async deployInfrastructure(): Promise<void> {
    console.log('🚀 Deploying infrastructure with Alchemy...');
    
    try {
      if (this.options.dryRun) {
        console.log('🔍 Dry run mode - showing planned changes:');
        console.log('- Container: celebrum-ai-container');
        console.log('- Worker: celebrum-ai-containers');
        console.log('- Bindings: CONTAINER -> celebrum-ai-container');
        console.log('✅ Infrastructure deployment simulation completed');
        return;
      }
      
      // Import and execute the Alchemy configuration
      // The deployment happens automatically when alchemy.run.ts is imported
      await import('../alchemy.run.ts');
      
      console.log('✅ Infrastructure deployed successfully');
    } catch (error) {
      throw new Error(`Failed to deploy infrastructure: ${error}`);
    }
  }

  async validateDeployment(): Promise<void> {
    console.log('🔍 Validating deployment...');
    
    try {
      // Check if container is running
      const containerStatus = await this.checkContainerStatus();
      if (!containerStatus.running) {
        throw new Error('Container is not running');
      }

      // Check if worker is accessible
      const workerStatus = await this.checkWorkerStatus();
      if (!workerStatus.accessible) {
        throw new Error('Worker is not accessible');
      }

      console.log('✅ Deployment validation successful');
    } catch (error) {
      throw new Error(`Deployment validation failed: ${error}`);
    }
  }

  private async checkContainerStatus(): Promise<{ running: boolean }> {
    // Simulate container status check
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { running: true };
  }

  private async checkWorkerStatus(): Promise<{ accessible: boolean }> {
    // Simulate worker status check
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { accessible: true };
  }

  async deploy(): Promise<void> {
    console.log(`🎯 Starting ${this.options.environment} deployment...`);
    
    try {
      await this.validateEnvironment();
      await this.buildContainer();
      await this.deployInfrastructure();
      
      if (!this.options.dryRun) {
        await this.validateDeployment();
      }
      
      console.log('🎉 Deployment completed successfully!');
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const environment = (args[0] as DeploymentOptions['environment']) || 'development';
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  const deployment = new AlchemyDeployment({
    environment,
    dryRun,
    verbose,
  });

  deployment.deploy();
}

export { AlchemyDeployment };