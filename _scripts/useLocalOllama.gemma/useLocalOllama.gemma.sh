#!/usr/bin/env bash

# ==============================
# 1. Ollama 서버 실행
# ==============================
# Ollama는 localhost:11434에서 API 제공
# 이미 실행 중이면 이 단계는 무시됨
ollama serve > /dev/null 2>&1 &

# 서버 준비 대기
sleep 2

# ==============================
# 2. Gemma 모델 다운로드
# ==============================
# 기본 coding용: gemma4:e4b (balanced)
# 더 큰 모델: gemma4:31b (고성능, VRAM 많이 필요)
ollama pull gemma4:e4b

# 모델 확인
ollama list

# ==============================
# 3. Claude Code → Ollama 연결
# ==============================
# Claude Code가 Anthropic 대신 Ollama endpoint 사용
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_API_KEY=dummy
export ANTHROPIC_AUTH_TOKEN=ollama

# ==============================
# 4. 모델 슬롯 매핑
# ==============================
# Claude Code 내부 alias:
# haiku / sonnet / opus

# 빠른 작업용 (subagent 등)
export ANTHROPIC_DEFAULT_HAIKU_MODEL=gemma4:e4b

# 기본 coding (main agent)
export ANTHROPIC_DEFAULT_SONNET_MODEL=gemma4:e4b

# 무거운 reasoning (필요시 변경)
export ANTHROPIC_DEFAULT_OPUS_MODEL=gemma4:31b

# ==============================
# 5. (선택) subagent 모델 지정
# ==============================
# subagent는 가벼운 모델 사용
export CLAUDE_CODE_SUBAGENT_MODEL=haiku

# ==============================
# 6. Claude Code 실행
# ==============================
# sonnet slot → gemma4:e4b 사용됨
claude