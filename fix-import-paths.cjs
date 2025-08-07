#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing import paths in test files...');

// Define the import path mappings based on actual project structure
const importMappings = [
  // Schema imports - point to actual schema location
  {
    pattern: /from ['"].*\/db\/src\/schema['"]/g,
    replacement: "from '../../../../../src/db/src/schema'"
  },
  {
    pattern: /from ['"]@\/schema['"]/g,
    replacement: "from '../../../../../src/db/src/schema'"
  },
  {
    pattern: /from ['"].*\/src\/schema\/index\.js?['"]/g,
    replacement: "from '../../../../../src/db/src/schema'"
  },
  
  // Handler imports - point to actual handlers location
  {
    pattern: /from ['"].*\/src\/handlers\/index['"]/g,
    replacement: "from '../../../../../src/telegram-bot/src/handlers'"
  },
  
  // Setup DB Cloudflare imports - point to correct location
  {
    pattern: /from ['"].*setup-db-cloudflare['"]/g,
    replacement: "from '../../../../../tests/setup/setup-db-cloudflare'"
  },
  
  // Test helpers imports - already fixed but ensure consistency
  {
    pattern: /from ['"].*\/utils\/test-helpers(\.js)?['"]/g,
    replacement: "from '../../../../../src/shared/tests/utils/test-helpers'"
  },
  
  // Feature flag service imports
  {
    pattern: /from ['"].*\/services\/feature-flag-service['"]/g,
    replacement: "from '../../../../../src/shared/src/services/feature-flag-service'"
  }
];

// Get all test files that might have import issues
const testFiles = execSync('find tests -name "*.test.ts" -o -name "*.test.js"', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(file => file.length > 0);

console.log(`Found ${testFiles.length} test files to process`);

let fixedFiles = 0;
let totalFixes = 0;

testFiles.forEach(filePath => {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let fileChanged = false;
    let fileFixes = 0;
    
    importMappings.forEach(mapping => {
      const matches = content.match(mapping.pattern);
      if (matches) {
        content = content.replace(mapping.pattern, mapping.replacement);
        fileFixes += matches.length;
        fileChanged = true;
      }
    });
    
    if (fileChanged) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${fileFixes} imports in ${filePath}`);
      fixedFiles++;
      totalFixes += fileFixes;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Import path fixes completed!`);
console.log(`📊 Fixed ${totalFixes} imports across ${fixedFiles} files`);