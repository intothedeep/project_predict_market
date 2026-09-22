#!/bin/bash
# Description: Launch Claude CLI with School Account

# Set the unique directory for school config
export CLAUDE_CONFIG_DIR="$HOME/.claude-school"

# Create the folder if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

if [ "$1" = "danger" ]; then
    echo "--- DANGEROUS MODE ---"
    claude remote-control --permission-mode bypassPermissions  
else
    echo "--- SAFE MODE ---"
    claude
fi