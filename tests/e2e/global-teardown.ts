import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  // Clean up any test artifacts if needed
  const testResultsDir = path.join(process.cwd(), 'test-results');
  
  // Remove any temporary files
  try {
    const tempFiles = fs.readdirSync(testResultsDir).filter(file => 
      file.endsWith('.tmp') || file.endsWith('.log')
    );
    
    for (const file of tempFiles) {
      fs.unlinkSync(path.join(testResultsDir, file));
    }
  } catch (error) {
    console.warn('Error during test cleanup:', error);
  }
  
  console.log('Global teardown completed');
}

export default globalTeardown;
