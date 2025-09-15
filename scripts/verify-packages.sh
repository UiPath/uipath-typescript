#!/bin/bash

# Package Verification Script
# This script verifies that packages are ready for publishing

set -e

echo "🔍 Starting package verification..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a directory exists
check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        return 1
    fi
}

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        return 1
    fi
}

# Function to run npm pack dry run
check_pack_contents() {
    local package_name=$1
    local package_dir=$2
    
    echo -e "\n${YELLOW}Checking $package_name package contents...${NC}"
    cd "$package_dir"
    
    # Run npm pack dry run and capture output
    npm pack --dry-run 2>&1 | grep -E "(dist/|bin/|README)" || {
        echo -e "${RED}✗${NC} Package contents verification failed"
        return 1
    }
    
    echo -e "${GREEN}✓${NC} Package contents verified"
    cd - > /dev/null
}

# Main verification
ERRORS=0

echo -e "\n📦 Verifying SDK Package..."
echo "=========================="

# Check SDK build output
check_directory "dist" || ((ERRORS++))
check_file "dist/index.js" || ((ERRORS++))
check_file "dist/index.d.ts" || ((ERRORS++))
check_file "package.json" || ((ERRORS++))
check_file "README.md" || ((ERRORS++))

# Check SDK package contents
check_pack_contents "SDK" "." || ((ERRORS++))

echo -e "\n📦 Verifying CLI Package..."
echo "=========================="

# Check CLI build output
check_directory "packages/cli/dist" || ((ERRORS++))
check_file "packages/cli/dist/index.js" || ((ERRORS++))
check_file "packages/cli/dist/index.d.ts" || ((ERRORS++))
check_directory "packages/cli/dist/commands" || ((ERRORS++))
check_file "packages/cli/dist/commands/pack.js" || ((ERRORS++))
check_file "packages/cli/dist/commands/publish.js" || ((ERRORS++))
check_file "packages/cli/bin/cli.js" || ((ERRORS++))
check_file "packages/cli/package.json" || ((ERRORS++))
check_file "packages/cli/README.md" || ((ERRORS++))

# Check CLI package contents
check_pack_contents "CLI" "packages/cli" || ((ERRORS++))

# Summary
echo -e "\n📊 Verification Summary"
echo "======================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN} All checks passed!${NC}"
    echo "Packages are ready for publishing."
    exit 0
else
    echo -e "${RED} $ERRORS checks failed!${NC}"
    echo "Please fix the issues before publishing."
    exit 1
fi