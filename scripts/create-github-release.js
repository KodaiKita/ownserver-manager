#!/usr/bin/env node

/**
 * GitHub Release Creation Script
 * Creates a GitHub release using the GitHub API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    owner: 'KodaiKita',
    repo: 'ownserver-manager',
    tag: 'alpha-1.0.0',
    name: 'Alpha 1.0.0 - Production-Ready Release',
    draft: false,
    prerelease: true
};

// Read release notes
function readReleaseNotes() {
    try {
        const releaseReportPath = path.join(__dirname, '..', 'ALPHA_1_0_0_FINAL_RELEASE_REPORT.md');
        const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
        
        let body = '# Alpha 1.0.0 Release\n\n';
        
        if (fs.existsSync(releaseReportPath)) {
            const report = fs.readFileSync(releaseReportPath, 'utf8');
            body += '## Release Report\n\n';
            body += report.substring(0, 2000); // Limit size
            body += '\n\n[Full Release Report](./ALPHA_1_0_0_FINAL_RELEASE_REPORT.md)\n\n';
        }
        
        if (fs.existsSync(changelogPath)) {
            const changelog = fs.readFileSync(changelogPath, 'utf8');
            const alpha100Section = changelog.match(/## \[1\.0\.0-alpha\.1\][\s\S]*?(?=## \[|\z)/);
            if (alpha100Section) {
                body += '## Changelog\n\n';
                body += alpha100Section[0];
            }
        }
        
        body += '\n\n## Documentation\n\n';
        body += '- [Quick Start Guide](./docs/deployment/Quick-Start-Guide.md)\n';
        body += '- [Complete Deployment Guide](./docs/deployment/Ubuntu-Server-Complete-Deployment-Guide.md)\n';
        body += '- [Operations Manual](./docs/operations/Operations-Manual.md)\n';
        body += '- [Configuration Guide](./docs/configuration/Configuration-Guide.md)\n';
        body += '- [FAQ](./docs/FAQ.md)\n\n';
        
        body += '## Installation\n\n';
        body += '```bash\n';
        body += 'wget -O - https://raw.githubusercontent.com/KodaiKita/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash\n';
        body += '```\n\n';
        
        body += '**Note**: This is an alpha release. Please test thoroughly before using in production.\n';
        
        return body;
    } catch (error) {
        console.error('Error reading release notes:', error.message);
        return `# Alpha 1.0.0 Release

This is the first alpha release of OwnServer Manager, featuring:

- Production-ready Minecraft server management
- CloudFlare DNS integration
- Docker containerization
- Comprehensive documentation
- Automated installation scripts

## Quick Start

\`\`\`bash
wget -O - https://raw.githubusercontent.com/KodaiKita/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash
\`\`\`

**Note**: This is an alpha release. Please test thoroughly before using in production.`;
    }
}

// Create GitHub release using API
function createGitHubRelease(token) {
    const body = readReleaseNotes();
    
    const releaseData = {
        tag_name: CONFIG.tag,
        target_commitish: 'main',
        name: CONFIG.name,
        body: body,
        draft: CONFIG.draft,
        prerelease: CONFIG.prerelease
    };

    const postData = JSON.stringify(releaseData);
    
    const options = {
        hostname: 'api.github.com',
        port: 443,
        path: `/repos/${CONFIG.owner}/${CONFIG.repo}/releases`,
        method: 'POST',
        headers: {
            'User-Agent': 'ownserver-manager-release-script',
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 201) {
                const release = JSON.parse(data);
                console.log('✅ GitHub release created successfully!');
                console.log(`🔗 Release URL: ${release.html_url}`);
                console.log(`📦 Tag: ${release.tag_name}`);
                console.log(`📄 Name: ${release.name}`);
            } else {
                console.error('❌ Failed to create GitHub release');
                console.error(`Status: ${res.statusCode} ${res.statusMessage}`);
                console.error('Response:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error creating GitHub release:', error.message);
    });

    req.write(postData);
    req.end();
}

// Main execution
function main() {
    const token = process.env.GITHUB_TOKEN || process.argv[2];
    
    if (!token) {
        console.error('❌ GitHub token required!');
        console.error('Usage: node create-github-release.js <GITHUB_TOKEN>');
        console.error('   or: GITHUB_TOKEN=<token> node create-github-release.js');
        console.error('');
        console.error('Create a Personal Access Token at:');
        console.error('https://github.com/settings/tokens/new');
        console.error('Required scopes: repo');
        process.exit(1);
    }
    
    console.log('🚀 Creating GitHub release...');
    console.log(`📋 Repository: ${CONFIG.owner}/${CONFIG.repo}`);
    console.log(`🏷️  Tag: ${CONFIG.tag}`);
    console.log(`📝 Name: ${CONFIG.name}`);
    console.log('');
    
    createGitHubRelease(token);
}

if (require.main === module) {
    main();
}

module.exports = { createGitHubRelease, readReleaseNotes };
