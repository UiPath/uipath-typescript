import chalk from 'chalk';
import { EnvironmentConfig } from '../types/index.js';

interface ValidationResult {
  isValid: boolean;
  config?: EnvironmentConfig;
  missingVars?: string[];
}

interface ParsedUiPathUrl {
  baseUrl: string;
  orgName: string;
  tenantName: string;
}

export function parseUiPathUrl(uipathUrl: string): ParsedUiPathUrl {
  const url = new URL(uipathUrl);
  const [orgName, tenantName] = url.pathname.split('/').filter(Boolean);
  
  return {
    baseUrl: `${url.protocol}//${url.host}`,
    orgName,
    tenantName,
  };
}

export function constructUiPathUrl(baseUrl: string, orgName: string, tenantName: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${orgName}/${tenantName}`;
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
      'UIPATH_URL': 'UIPATH_URL=https://cloud.uipath.com/your-org-name/your-tenant-name',
      'UIPATH_FOLDER_KEY': 'UIPATH_FOLDER_KEY=your-folder-key',
      'UIPATH_ACCESS_TOKEN': 'UIPATH_ACCESS_TOKEN=your-bearer-token',
    };
    
    missing.forEach(envVar => {
      if (examples[envVar]) {
        logger.log(chalk.dim(examples[envVar]));
      }
    });
    
    return { isValid: false, missingVars: missing };
  }
  
  const config: EnvironmentConfig = {
    uipathUrl: process.env.UIPATH_URL!,
    orgId: process.env.UIPATH_ORGANIZATION_ID!,
    tenantId: process.env.UIPATH_TENANT_ID!,
    bearerToken: process.env.UIPATH_ACCESS_TOKEN!,
  };
  
  // Add optional fields if they're in the required list
  if (requiredVars.includes('UIPATH_FOLDER_KEY')) {
    config.folderKey = process.env.UIPATH_FOLDER_KEY!;
  }
  
  return { isValid: true, config };
}