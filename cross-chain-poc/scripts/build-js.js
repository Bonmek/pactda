import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ensure dist directory exists
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist', { recursive: true });
}

// Run TypeScript compiler
console.log('Building JavaScript files from TypeScript...');
exec('npx tsc --project tsconfig.node.json', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building TypeScript: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`TypeScript compiler stderr: ${stderr}`);
  }
  
  if (stdout) {
    console.log(`TypeScript compiler stdout: ${stdout}`);
  }
  
  console.log('Build completed. JavaScript files are in the dist/ directory.');
});
