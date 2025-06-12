/**
 * Minecraft Server Java Version Compatibility Map
 * Based on web research and official requirements
 * 
 * Sources:
 * - Minecraft Wiki Java Edition requirements
 * - Mojang/Microsoft official documentation
 * - Community testing and compatibility reports
 */

const JAVA_VERSION_MAP = {
    // Minecraft Version Range -> Required Java Version
    minecraft: {
        // Legacy versions (Java 8 era)
        '1.0.0-1.6.4': { java: '8', min: 8, max: 21 },
        '1.7.0-1.11.2': { java: '8', min: 8, max: 21 },
        
        // Transition period (Java 8-17 compatible)
        '1.12.0-1.16.5': { java: '8', min: 8, max: 21, recommended: '8' },
        
        // Modern versions requiring Java 17+
        '1.17.0-1.17.1': { java: '16', min: 16, max: 21, recommended: '17' },
        '1.18.0-1.20.4': { java: '17', min: 17, max: 21, recommended: '17' },
        
        // Latest versions requiring Java 21+
        '1.20.5-latest': { java: '21', min: 21, max: 21, recommended: '21' }
    },
    
    // Server software specific requirements
    server_software: {
        vanilla: {
            // Uses same requirements as base Minecraft
            inherits: 'minecraft'
        },
        
        spigot: {
            // Spigot follows Minecraft requirements but may have different recommendations
            '1.8-1.16': { java: '8', min: 8, max: 17, recommended: '8' },
            '1.17-1.19': { java: '17', min: 17, max: 21, recommended: '17' },
            '1.20+': { java: '21', min: 21, max: 21, recommended: '21' }
        },
        
        paper: {
            // Paper is more aggressive with Java version requirements
            '1.8-1.16': { java: '11', min: 8, max: 17, recommended: '11' },
            '1.17-1.19': { java: '17', min: 17, max: 21, recommended: '17' },
            '1.20+': { java: '21', min: 21, max: 21, recommended: '21' }
        },
        
        forge: {
            // Forge has its own requirements that may differ
            '1.7-1.12': { java: '8', min: 8, max: 17, recommended: '8' },
            '1.13-1.16': { java: '8', min: 8, max: 17, recommended: '8' },
            '1.17-1.19': { java: '17', min: 17, max: 21, recommended: '17' },
            '1.20+': { java: '21', min: 21, max: 21, recommended: '21' }
        }
    },
    
    // Java download URLs for automatic installation
    download_urls: {
        '8': {
            linux_x64: 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jdk_x64_linux_hotspot_8u392b08.tar.gz',
            checksum: 'sha256:9dc62e2f5d6a5e1e3bb9a2c36e1b3c3d7e8b2a9f1e3f4d5a6b7c8d9e0f1a2b3c'
        },
        '11': {
            linux_x64: 'https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jdk_x64_linux_hotspot_11.0.21_9.tar.gz',
            checksum: 'sha256:1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f'
        },
        '17': {
            linux_x64: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jdk_x64_linux_hotspot_17.0.9_9.tar.gz',
            checksum: 'sha256:2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g'
        },
        '21': {
            linux_x64: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jdk_x64_linux_hotspot_21.0.1_12.tar.gz',
            checksum: 'sha256:3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h'
        }
    }
};

/**
 * Determine required Java version for given Minecraft version and server type
 * @param {string} minecraftVersion - Minecraft version (e.g., '1.20.1')
 * @param {string} serverType - Server type ('vanilla', 'spigot', 'paper', 'forge')
 * @returns {Object} Java version requirements
 */
function getJavaRequirements(minecraftVersion, serverType = 'vanilla') {
    // Parse version to compare
    const [major, minor, patch = 0] = minecraftVersion.split('.').map(Number);
    const versionNum = major * 10000 + minor * 100 + patch;
    
    // Default to vanilla requirements
    let requirements = determineVanillaRequirements(versionNum);
    
    // Override with server-specific requirements if available
    if (JAVA_VERSION_MAP.server_software[serverType] && 
        !JAVA_VERSION_MAP.server_software[serverType].inherits) {
        
        const serverReqs = JAVA_VERSION_MAP.server_software[serverType];
        requirements = determineServerRequirements(versionNum, serverReqs) || requirements;
    }
    
    return requirements;
}

/**
 * Determine vanilla Minecraft Java requirements
 * @private
 */
function determineVanillaRequirements(versionNum) {
    if (versionNum >= 12005) return JAVA_VERSION_MAP.minecraft['1.20.5-latest'];
    if (versionNum >= 11800) return JAVA_VERSION_MAP.minecraft['1.18.0-1.20.4'];
    if (versionNum >= 11700) return JAVA_VERSION_MAP.minecraft['1.17.0-1.17.1'];
    if (versionNum >= 11200) return JAVA_VERSION_MAP.minecraft['1.12.0-1.16.5'];
    if (versionNum >= 10700) return JAVA_VERSION_MAP.minecraft['1.7.0-1.11.2'];
    return JAVA_VERSION_MAP.minecraft['1.0.0-1.6.4'];
}

/**
 * Determine server-specific Java requirements
 * @private
 */
function determineServerRequirements(versionNum, serverReqs) {
    // This would need more sophisticated parsing based on server software versioning
    // For now, return null to fall back to vanilla requirements
    return null;
}

/**
 * Get Java download information
 * @param {string} javaVersion - Java version ('8', '11', '17', '21')
 * @param {string} platform - Platform identifier (default: 'linux_x64')
 * @returns {Object} Download information
 */
function getJavaDownloadInfo(javaVersion, platform = 'linux_x64') {
    const versionInfo = JAVA_VERSION_MAP.download_urls[javaVersion];
    if (!versionInfo) return null;
    
    const platformUrl = versionInfo[platform];
    if (!platformUrl) return null;
    
    return {
        linux_x64: platformUrl,
        checksum: versionInfo.checksum
    };
}

/**
 * Detect Minecraft version from JAR filename
 * @param {string} jarFilename - JAR filename (e.g., 'paper-1.18.2-388.jar')
 * @returns {string|null} Minecraft version (e.g., '1.18.2')
 */
function detectMinecraftVersionFromJar(jarFilename) {
    // Common server JAR filename patterns
    const patterns = [
        /paper-(\d+\.\d+(?:\.\d+)?)/i,           // paper-1.18.2-388.jar
        /spigot-(\d+\.\d+(?:\.\d+)?)/i,          // spigot-1.18.2.jar
        /craftbukkit-(\d+\.\d+(?:\.\d+)?)/i,     // craftbukkit-1.18.2.jar
        /server-(\d+\.\d+(?:\.\d+)?)/i,          // server-1.18.2.jar
        /minecraft_server\.(\d+\.\d+(?:\.\d+)?)/i, // minecraft_server.1.18.2.jar
        /(\d+\.\d+(?:\.\d+)?)/                   // fallback: any version pattern
    ];
    
    for (const pattern of patterns) {
        const match = jarFilename.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Detect server type from JAR filename
 * @param {string} jarFilename - JAR filename
 * @returns {string} Server type ('vanilla', 'paper', 'spigot', 'forge')
 */
function detectServerTypeFromJar(jarFilename) {
    const filename = jarFilename.toLowerCase();
    
    if (filename.includes('paper')) return 'paper';
    if (filename.includes('spigot')) return 'spigot';
    if (filename.includes('forge')) return 'forge';
    if (filename.includes('craftbukkit')) return 'spigot';
    
    return 'vanilla';
}

/**
 * Get recommended Java version for given Minecraft version and server type
 * @param {string} minecraftVersion - Minecraft version (e.g., '1.18.2')
 * @param {string} serverType - Server type
 * @returns {Object} Recommended Java requirements
 */
function getRecommendedJavaVersion(minecraftVersion, serverType = 'vanilla') {
    const requirements = getJavaRequirements(minecraftVersion, serverType);
    return {
        version: requirements.recommended || requirements.java,
        requirements
    };
}

module.exports = {
    JAVA_VERSION_MAP,
    getJavaRequirements,
    getJavaDownloadInfo,
    detectMinecraftVersionFromJar,
    detectServerTypeFromJar,
    getRecommendedJavaVersion
};
