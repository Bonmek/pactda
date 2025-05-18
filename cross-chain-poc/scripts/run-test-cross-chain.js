import { exec } from 'child_process';

console.log('Running the cross-chain test...');

// First build the JavaScript files
exec('node scripts/build-js.js', (buildError, buildStdout, buildStderr) => {
  if (buildError) {
    console.error(`Error building JavaScript: ${buildError.message}`);
    return;
  }
  
  if (buildStdout) {
    console.log(buildStdout);
  }
  
  if (buildStderr) {
    console.error(buildStderr);
  }
  
  // Then run the test
  console.log('\nStarting cross-chain test...');
  exec('node scripts/test-cross-chain.js', (testError, testStdout, testStderr) => {
    if (testError) {
      console.error(`Error running test: ${testError.message}`);
      return;
    }
    
    if (testStdout) {
      console.log(testStdout);
    }
    
    if (testStderr) {
      console.error(testStderr);
    }
    
    console.log('Cross-chain test completed.');
  });
});
