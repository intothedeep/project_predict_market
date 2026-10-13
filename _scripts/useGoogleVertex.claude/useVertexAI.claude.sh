#!/usr/bin/env bash
set -euo pipefail

########################################
# CONFIG (HARDCODED)
########################################
PROJECT_ID="fluid-fiber-489023-f5"

########################################
# 1. GCP 설정
########################################
# gcloud config set project "${PROJECT_ID}"

# ADC 인증 (Vertex 필수)
# gcloud auth application-default login

########################################
# 2. Vertex AI API 활성화
########################################
# gcloud services enable aiplatform.googleapis.com

########################################
# 3. Claude Code + Vertex 설정
########################################

export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=global
export ANTHROPIC_VERTEX_PROJECT_ID="${PROJECT_ID}"

# optional
export DISABLE_PROMPT_CACHING=1

########################################
# 4. Region override (중요)
########################################

export VERTEX_REGION_CLAUDE_HAIKU_4_5=us-east5
export VERTEX_REGION_CLAUDE_4_6_SONNET=us-east5
export VERTEX_REGION_CLAUDE_OPUS_4_6=us-east5

########################################
# 5. 모델 pinning
########################################

export ANTHROPIC_DEFAULT_OPUS_MODEL="claude-opus-4-6"
export ANTHROPIC_DEFAULT_SONNET_MODEL="claude-sonnet-4-6"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="claude-haiku-4-5@20251001"

########################################
# 6. 실행
########################################

claude
