#!/bin/bash

# GitHub Push and Release Script
# Handles authentication and creates GitHub release

set -e

echo "🔧 OwnServer Manager - GitHub Release Script"
echo "============================================="

# Check if we have changes to push
UNPUSHED_COMMITS=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l || echo "0")

if [ "$UNPUSHED_COMMITS" -gt 0 ]; then
    echo "📦 Found $UNPUSHED_COMMITS unpushed commits"
else
    echo "✅ All commits are already pushed"
fi

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo ""
    echo "🔑 GitHub Personal Access Token required for authentication"
    echo ""
    echo "Please create a token at: https://github.com/settings/tokens/new"
    echo "Required scopes: repo, workflow"
    echo ""
    read -p "Enter your GitHub token: " -s GITHUB_TOKEN
    echo ""
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "❌ Token is required to proceed"
        exit 1
    fi
fi

echo "🔍 Validating GitHub token..."

# Test GitHub API access
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/github_test \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "User-Agent: ownserver-manager-release" \
    https://api.github.com/repos/KodaiKita/ownserver-manager)

if [ "$RESPONSE" != "200" ]; then
    echo "❌ GitHub API access failed (HTTP $RESPONSE)"
    echo "Please check your token permissions"
    exit 1
fi

echo "✅ GitHub token validated"

# Push commits if needed
if [ "$UNPUSHED_COMMITS" -gt 0 ]; then
    echo "⬆️  Pushing commits to GitHub..."
    
    # Use token for push authentication
    git remote set-url origin "https://$GITHUB_TOKEN@github.com/KodaiKita/ownserver-manager.git"
    
    # Push main branch
    git push origin main
    
    # Push tags
    git push origin --tags
    
    echo "✅ Successfully pushed commits and tags"
    
    # Reset remote URL for security
    git remote set-url origin "https://github.com/KodaiKita/ownserver-manager.git"
else
    echo "ℹ️  No commits to push"
fi

echo ""
echo "🏷️  Creating GitHub release..."

# Create GitHub release
GITHUB_TOKEN="$GITHUB_TOKEN" node scripts/create-github-release.js

echo ""
echo "🎉 Release process completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Visit: https://github.com/KodaiKita/ownserver-manager/releases"
echo "   2. Review the release"
echo "   3. Test installation: wget -O - https://raw.githubusercontent.com/KodaiKita/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash"
echo ""
