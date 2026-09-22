#!/bin/bash
# Description: Launch Claude CLI with Work Account

# Set the unique directory for work config
export CLAUDE_CONFIG_DIR="$HOME/.claude-work"

# Create the folder if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

echo "--- Starting CLAUDE WORK ---"

if [ "$1" = "danger" ]; then
    echo "--- DANGEROUS MODE ---"
    claude remote-control --permission-mode bypassPermissions  
else
    echo "--- SAFE MODE ---"
    claude
fi