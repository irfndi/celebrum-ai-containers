#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all files that import test-helpers
const result = execSync('grep -r "import.*test-helpers" tests/ src/ --include="*.ts" --include="*.js"', { encoding: 'utf8' });
const lines = result.trim().split('\n');

const fixes = [
  // Pattern: relative path -> absolute path
  { from: "from '../utils/test-helpers'", to: "from '../../../../../src/shared/tests/utils/test-helpers'" },
  { from: "from '../../../shared/tests/utils/test-helpers'", to: "from '../../../../../src/shared/tests/utils/test-helpers'" },
  { from: "from '../../shared/tests/utils/test-helpers'", to: "from '../../../../src/shared/tests/utils/test-helpers'" },
  { from: "from './utils/test-helpers'", to: "from '../../../src/shared/tests/utils/test-helpers'" },
  { from: "from '../utils/test-helpers.ts'", to: "from '../../../../../src/shared/tests/utils/test-helpers'" },
  { from: "from '../../../shared/tests/utils/test-helpers.ts'", to: "from '../../../../../src/shared/tests/utils/test-helpers'" },
];

lines.forEach(line => {
  const [filePath] = line.split(':');
  if (!filePath || !fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fixes.forEach(fix => {
    if (content.includes(fix.from)) {
      content = content.replace(fix.from, fix.to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in: ${filePath}`);
  }
});

console.log('Import fixes completed!');