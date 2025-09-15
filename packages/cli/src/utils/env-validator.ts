import chalk from 'chalk';
import { EnvironmentConfig } from '../types/index.js';

interface ValidationResult {
  isValid: boolean;
  config?: EnvironmentConfig;
  missingVars?: string[];
}

export function validateEnvironment(
  requiredVars: string[],
  logger: { log: (message: string) => void }
): ValidationResult {
  const missing = requiredVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    logger.log(chalk.red('❌ Missing required environment variables:'));
    missing.forEach(envVar => {
      logger.log(chalk.red(`  - ${envVar}`));
    });
    logger.log('');
    logger.log(chalk.yellow('💡 Add these to your .env file:'));
    
    // Show examples for known variables
    const examples: Record<string, string> = {
      'UIPATH_BASE_URL': 'UIPATH_BASE_URL=https://your-orchestrator.com',
      'UIPATH_ORG_ID': 'UIPATH_ORG_ID=your-org-id',
      'UIPATH_TENANT_ID': 'UIPATH_TENANT_ID=your-tenant-id',
      'UIPATH_TENANT_NAME': 'UIPATH_TENANT_NAME=your-tenant-name',
      'UIPATH_FOLDER_KEY': 'UIPATH_FOLDER_KEY=your-folder-key',
      'UIPATH_BEARER_TOKEN': 'UIPATH_BEARER_TOKEN=your-bearer-token',
    };
    
    missing.forEach(envVar => {
      if (examples[envVar]) {
        logger.log(chalk.dim(examples[envVar]));
      }
    });
    
    return { isValid: false, missingVars: missing };
  }
  
  // Normalize the base URL to ensure it has the protocol
  let baseUrl = process.env.UIPATH_BASE_URL!;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  const config: EnvironmentConfig = {
    baseUrl,
    orgId: process.env.UIPATH_ORG_ID!,
    tenantId: process.env.UIPATH_TENANT_ID!,
    tenantName: process.env.UIPATH_TENANT_NAME!,
    bearerToken: process.env.UIPATH_BEARER_TOKEN!,
  };
  
  // Add optional fields if they're in the required list
  if (requiredVars.includes('UIPATH_FOLDER_KEY')) {
    config.folderKey = process.env.UIPATH_FOLDER_KEY!;
  }
  
  return { isValid: true, config };
}