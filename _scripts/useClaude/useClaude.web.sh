#!/bin/bash
# Save as: claude_web.sh

# Launch Work Profile
open -na "Google Chrome" --args --user-data-dir="$HOME/Library/Application Support/Google/Chrome/Claude_Work" "https://claude.ai" &

# Launch School Profile
open -na "Google Chrome" --args --user-data-dir="$HOME/Library/Application Support/Google/Chrome/Claude_School" "https://claude.ai" &

echo "Opening Claude Work and Claude School in separate windows..."
