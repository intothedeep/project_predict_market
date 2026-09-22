## Manual: Managing Dual Claude Pro Accounts (Work & School)

## This guide explains how to set up and use two separate Claude Pro accounts on the same machine using independent browser profiles and isolated CLI configurations.

## 1. Web Browser Setup (Google Chrome)

To stay logged into both accounts simultaneously without them interfering, we use separate "User Data Directories."

## The Script: claude_web.sh

#!/bin/bash# Launch Work Profile
open -na "Google Chrome" --args --user-data-dir="$HOME/Library/Application Support/Google/Chrome/Claude_Work" "https://claude.ai" &

# Launch School Profile

open -na "Google Chrome" --args --user-data-dir="$HOME/Library/Application Support/Google/Chrome/Claude_School" "https://claude.ai" &

echo "Opening Claude Work and Claude School in separate windows..."

## How to Use:

1. Save the file: Create a file named claude_web.sh.
2. Make it executable: Run chmod +x claude_web.sh in your terminal.
3. Run it: Type ./claude_web.sh.
4. Log In:

- In the first window, log in with your Work email.
    - In the second window, log in with your School email.
      Chrome will remember these logins separately for future sessions.

---

## 2. Terminal Setup (Claude Code CLI)

To use two accounts in the terminal, we isolate the configuration folders using the CLAUDE_CONFIG_DIR environment variable.

## Option A: Claude Work (claude_work.sh)

#!/bin/bash
export CLAUDE_CONFIG_DIR="$HOME/.claude-work"
mkdir -p "$CLAUDE_CONFIG_DIR"
echo "--- Starting CLAUDE WORK ---"
claude

## Option B: Claude School (claude_school.sh)

#!/bin/bash
export CLAUDE_CONFIG_DIR="$HOME/.claude-school"
mkdir -p "$CLAUDE_CONFIG_DIR"
echo "--- Starting CLAUDE SCHOOL ---"
claude

## How to Use:

1. Make executable: Run chmod +x claude_work.sh claude_school.sh.
2. Initial Login:

- Run ./claude_work.sh. Once the Claude prompt appears, type /login and follow the instructions for your Work email.
    - Run ./claude_school.sh. Type /login and follow the instructions for your School email.

3. Switching: Simply run the specific script for the account you want to use. History and limits will be tracked separately.

---

## 3. Pro-Tips for Efficiency## Run from anywhere

To run these scripts by just typing claude_work or claude_web from any folder, move them to your local bin:

sudo mv claude_work.sh /usr/local/bin/claude_work
sudo mv claude_school.sh /usr/local/bin/claude_school
sudo mv claude_web.sh /usr/local/bin/claude_web

## Verification Warning

## Each Claude Pro account must be verified with a unique phone number. You cannot use the same phone number for both your Work and School accounts.

Would you like to add a section on how to sync these configurations across multiple computers?

## How to terminate?

방법 3가지

1. PID로 종료

이미 출력된 PID 사용

kill 16190

강제 종료:

kill -9 16190

⸻

2. job id로 종료

kill %1

    •	[1] → %1

⸻

3. 프로세스 검색 후 종료

특정 user-data-dir 기준:

ps aux | grep Claude_School

찾은 PID로:

kill <PID>

⸻

4. Chrome 전체 종료 (주의)

killall "Google Chrome"

또는 강제:

killall -9 "Google Chrome"

⸻

핵심
• 안전 종료: kill
• 즉시 종료: kill -9
• job 기반: kill %n
