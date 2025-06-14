const OwnServerManagerApp = require('./src/index.js');

async function test() {
  try {
    console.log('Starting test...');
    const app = new OwnServerManagerApp();
    console.log('App created');
    
    await app.initialize();
    console.log('App initialized');
    
    const status = await app.getStatus();
    console.log('Status obtained:');
    console.log(JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
