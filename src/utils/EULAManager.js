/**
 * EULA Manager
 * Minecraft End User License Agreement management
 * 
 * This module handles automatic EULA agreement for Minecraft servers
 * based on user configuration and consent.
 */

const { promises: fs } = require('fs');
const path = require('path');

class EULAManager {
    constructor(logger) {
        this.logger = logger;
    }
    
    /**
     * Check if user has consented to EULA in configuration
     * @param {Object} config - Configuration object
     * @returns {boolean} True if user has agreed to EULA
     */
    hasUserConsentedToEULA(config) {
        return config.minecraft?.eula?.agreed === true && 
               config.minecraft?.eula?.userConsent === true;
    }
    
    /**
     * Create or update eula.txt file in server directory
     * @param {string} serverDirectory - Server directory path
     * @param {boolean} agreed - Whether EULA is agreed
     * @returns {Promise<void>}
     */
    async createEULAFile(serverDirectory, agreed = true) {
        const eulaPath = path.join(serverDirectory, 'eula.txt');
        const timestamp = new Date().toISOString();
        
        const eulaContent = `# By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).
# You also agree that tacos are tasty, and the best food in the world.
# ${timestamp}
eula=${agreed ? 'true' : 'false'}
`;
        
        await fs.writeFile(eulaPath, eulaContent, 'utf8');
        
        this.logger.info('EULA file created/updated', {
            serverDirectory,
            agreed,
            eulaPath
        });
    }
    
    /**
     * Check if EULA file exists and is agreed
     * @param {string} serverDirectory - Server directory path
     * @returns {Promise<boolean>} True if EULA exists and is agreed
     */
    async checkEULAStatus(serverDirectory) {
        const eulaPath = path.join(serverDirectory, 'eula.txt');
        
        try {
            const content = await fs.readFile(eulaPath, 'utf8');
            const isAgreed = /eula\s*=\s*true/i.test(content);
            
            this.logger.debug('EULA status checked', {
                serverDirectory,
                isAgreed,
                eulaPath
            });
            
            return isAgreed;
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.logger.debug('EULA file not found', { serverDirectory });
                return false;
            }
            throw error;
        }
    }
    
    /**
     * Ensure EULA is properly handled based on configuration
     * @param {string} serverDirectory - Server directory path
     * @param {Object} config - Configuration object
     * @returns {Promise<boolean>} True if EULA is handled successfully
     */
    async ensureEULACompliance(serverDirectory, config) {
        // Check if user has consented in configuration
        if (!this.hasUserConsentedToEULA(config)) {
            throw new Error(
                'Minecraft EULA consent required. Please set minecraft.eula.agreed=true and minecraft.eula.userConsent=true in configuration to indicate your agreement to Minecraft EULA (https://aka.ms/MinecraftEULA)'
            );
        }
        
        // Check current EULA status
        const currentStatus = await this.checkEULAStatus(serverDirectory);
        
        if (!currentStatus) {
            // Create EULA file with agreement
            await this.createEULAFile(serverDirectory, true);
            
            this.logger.info('EULA automatically agreed based on user configuration', {
                serverDirectory,
                userConsent: config.minecraft.eula.userConsent
            });
        }
        
        return true;
    }
    
    /**
     * Get EULA information and status
     * @param {string} serverDirectory - Server directory path
     * @returns {Promise<Object>} EULA information
     */
    async getEULAInfo(serverDirectory) {
        const eulaPath = path.join(serverDirectory, 'eula.txt');
        const exists = await this.checkEULAExists(eulaPath);
        const agreed = exists ? await this.checkEULAStatus(serverDirectory) : false;
        
        return {
            eulaPath,
            exists,
            agreed,
            url: 'https://aka.ms/MinecraftEULA'
        };
    }
    
    /**
     * Check if EULA file exists
     * @private
     * @param {string} eulaPath - EULA file path
     * @returns {Promise<boolean>}
     */
    async checkEULAExists(eulaPath) {
        try {
            await fs.access(eulaPath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = EULAManager;
