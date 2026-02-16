#!/bin/bash
# CHE CLI Setup Script
# Usage: curl -fsSL https://che-mcp.web.app/setup.sh | bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
GH_CMD="gh"
GH_HOST="github.com"
GH_WORK_USER="${GH_WORK_USER:-jedwardsche}"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    CHE CLI Setup                             ║"
echo "║           Installing @che-systems/cli                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Require GitHub CLI
if ! command -v "$GH_CMD" &> /dev/null; then
    echo -e "${RED}${GH_CMD} command not found.${NC}"
    echo -e "${YELLOW}Install GitHub CLI first, then re-run this script.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ ${GH_CMD} found${NC}"

# Switch to work account (non-interactive)
if ! "$GH_CMD" auth switch --hostname "$GH_HOST" --user "$GH_WORK_USER" &> /dev/null; then
    echo -e "${RED}Work GitHub account '${GH_WORK_USER}' is not available in ${GH_CMD}.${NC}"
    echo -e "${YELLOW}Authenticate it first, then re-run this script:${NC}"
    echo -e "${BLUE}  ${GH_CMD} auth login --hostname ${GH_HOST} --scopes read:packages${NC}"
    echo -e "${BLUE}  ${GH_CMD} auth switch --hostname ${GH_HOST} --user ${GH_WORK_USER}${NC}"
    exit 1
fi

# Verify work account auth is valid
if ! "$GH_CMD" auth status --hostname "$GH_HOST" &> /dev/null; then
    echo -e "${RED}${GH_CMD} auth for ${GH_WORK_USER} on ${GH_HOST} is invalid.${NC}"
    echo -e "${YELLOW}Re-authenticate and ensure read:packages scope is granted.${NC}"
    echo -e "${YELLOW}Required scope: read:packages${NC}"
    exit 1
fi

echo -e "${GREEN}✓ ${GH_CMD} authenticated as ${GH_WORK_USER}${NC}"

# Get the auth token
TOKEN=$("$GH_CMD" auth token --hostname "$GH_HOST" 2>/dev/null || true)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to get GitHub token. Please try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token retrieved${NC}"

# Create or update .npmrc in home directory
NPMRC_PATH="$HOME/.npmrc"
NPMRC_ENTRY_REGISTRY="@che-systems:registry=https://npm.pkg.github.com"
NPMRC_ENTRY_TOKEN="//npm.pkg.github.com/:_authToken=${TOKEN}"

# Backup existing .npmrc if it exists
if [ -f "$NPMRC_PATH" ]; then
    cp "$NPMRC_PATH" "$NPMRC_PATH.backup"
    echo -e "${YELLOW}Backed up existing .npmrc to .npmrc.backup${NC}"
fi

# Remove old CHE entries if they exist
if [ -f "$NPMRC_PATH" ]; then
    grep -v "@che-systems:registry" "$NPMRC_PATH" | grep -v "npm.pkg.github.com/:_authToken" > "$NPMRC_PATH.tmp" || true
    mv "$NPMRC_PATH.tmp" "$NPMRC_PATH"
fi

# Add new entries
echo "$NPMRC_ENTRY_REGISTRY" >> "$NPMRC_PATH"
echo "$NPMRC_ENTRY_TOKEN" >> "$NPMRC_PATH"

echo -e "${GREEN}✓ .npmrc configured${NC}"

# Verify installation works
echo ""
echo -e "${BLUE}Verifying access to @che-systems packages (account: ${GH_WORK_USER})...${NC}"

if NPM_CONFIG_USERCONFIG="$NPMRC_PATH" NODE_AUTH_TOKEN="$TOKEN" npm view @che-systems/cli version &> /dev/null; then
    VERSION=$(NPM_CONFIG_USERCONFIG="$NPMRC_PATH" NODE_AUTH_TOKEN="$TOKEN" npm view @che-systems/cli version 2>/dev/null)
    echo -e "${GREEN}✓ Access verified! Latest version: ${VERSION}${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify package access. You may need to be added to the CHE-Systems organization.${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Setup Complete!                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "You can now use the CHE CLI:"
echo ""
echo -e "  ${BLUE}npx @che-systems/cli@latest init${NC}        # Initialize a new project"
echo -e "  ${BLUE}npx @che-systems/cli@latest add button${NC}  # Add components"
echo -e "  ${BLUE}npx @che-systems/cli@latest mcp init${NC}    # Setup MCP server"
echo ""
echo ""