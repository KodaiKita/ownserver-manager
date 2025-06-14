#!/bin/bash

echo "🧪 OwnServer Manager - CLI & Docker Integration Test"
echo "=================================================="

echo ""
echo "1. 🔍 Testing CLI Help Command..."
if node bin/ownserver-manager --help > /dev/null 2>&1; then
    echo "✅ CLI Help: PASS"
else
    echo "❌ CLI Help: FAIL"
    exit 1
fi

echo ""
echo "2. 🔍 Testing CLI Version Command..."
if node bin/ownserver-manager --version > /dev/null 2>&1; then
    echo "✅ CLI Version: PASS"
else
    echo "❌ CLI Version: FAIL" 
    exit 1
fi

echo ""
echo "3. 🔍 Testing Docker Image Build..."
if docker images | grep -q ownserver-manager; then
    echo "✅ Docker Image: PASS (Already built)"
else
    echo "❌ Docker Image: FAIL (Not found)"
    exit 1
fi

echo ""
echo "4. 🔍 Testing Docker Container CLI..."
if docker run --rm ownserver-manager:latest node bin/ownserver-manager --version > /dev/null 2>&1; then
    echo "✅ Docker CLI: PASS"
else
    echo "❌ Docker CLI: FAIL"
    exit 1
fi

echo ""
echo "5. 🔍 Testing Java Environments..."
JAVA_TEST=$(docker run --rm ownserver-manager:latest bash -c "
    echo 'Java 8:' && /usr/lib/jvm/java-8-openjdk/bin/java -version 2>&1 | head -1 &&
    echo 'Java 11:' && /usr/lib/jvm/java-11-openjdk/bin/java -version 2>&1 | head -1 &&
    echo 'Java 17:' && /usr/lib/jvm/java-17-openjdk/bin/java -version 2>&1 | head -1 &&
    echo 'Java 21:' && java -version 2>&1 | head -1
")

if echo "$JAVA_TEST" | grep -q "openjdk version"; then
    echo "✅ Java Environments: PASS"
    echo "   $JAVA_TEST" | sed 's/^/   /'
else
    echo "❌ Java Environments: FAIL"
    exit 1
fi

echo ""
echo "6. 🔍 Testing Directory Structure..."
DIRS_TEST=$(docker run --rm ownserver-manager:latest bash -c "
    ls -la /app/ | grep -E '(logs|minecraft-servers|backups|java-runtimes)'
")

if [ -n "$DIRS_TEST" ]; then
    echo "✅ Directory Structure: PASS"
    echo "$DIRS_TEST" | sed 's/^/   /'
else
    echo "❌ Directory Structure: FAIL"
    exit 1
fi

echo ""
echo "7. 🔍 Testing File Permissions..."
PERMS_TEST=$(docker run --rm ownserver-manager:latest bash -c "
    test -x /app/bin/ownserver-manager && echo 'Binary: Executable' &&
    test -x /app/src/commands/cli.js && echo 'CLI: Executable' &&
    test -w /app/logs && echo 'Logs: Writable'
")

if echo "$PERMS_TEST" | grep -q "Executable"; then
    echo "✅ File Permissions: PASS"
    echo "$PERMS_TEST" | sed 's/^/   /'
else
    echo "❌ File Permissions: FAIL"
    exit 1
fi

echo ""
echo "🎉 All Integration Tests Passed!"
echo "================================"
echo ""
echo "📋 Summary:"
echo "   ✅ CLI functionality working"
echo "   ✅ Docker environment ready"
echo "   ✅ Java environments available"
echo "   ✅ Directory structure correct"
echo "   ✅ File permissions set"
echo ""
echo "🚀 Ready for deployment testing!"
