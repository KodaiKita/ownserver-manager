/**
 * Basic Phase2 Test - Environment Check
 */

const assert = require('assert');
const path = require('path');

describe('Phase2 Environment Test', () => {
    it('should load test setup utilities', () => {
        try {
            const testSetup = require('../helpers/testSetup');
            assert.ok(testSetup.setupTestEnvironment, 'setupTestEnvironment should exist');
            assert.ok(testSetup.createTestConfig, 'createTestConfig should exist');
            console.log('✅ Test setup utilities loaded');
        } catch (error) {
            console.error('❌ Failed to load test utilities:', error.message);
            throw error;
        }
    });
    
    it('should be able to setup test environment', async () => {
        try {
            const { setupTestEnvironment, cleanupTestEnvironment } = require('../helpers/testSetup');
            const result = await setupTestEnvironment();
            assert.ok(result, 'Setup should complete');
            await cleanupTestEnvironment();
            console.log('✅ Test environment setup successful');
        } catch (error) {
            console.error('❌ Test environment setup failed:', error.message);
            throw error;
        }
    });
    
    it('should be able to create test config', () => {
        try {
            const { createTestConfig } = require('../helpers/testSetup');
            const config = createTestConfig();
            assert.ok(config.javaVersion, 'Config should have javaVersion');
            assert.ok(config.serverJar, 'Config should have serverJar');
            console.log('✅ Test config creation successful');
        } catch (error) {
            console.error('❌ Test config creation failed:', error.message);
            throw error;
        }
    });
});
