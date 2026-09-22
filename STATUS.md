# STATUS — BTC 데이터 파이프라인 (system 도메인)

> Completed items live in `_archive/` (cold storage — do not read unless
> investigating history). This doc holds the active + planned log only.

2026-09-22 plan: 아키텍처 승인(00.architecture.mvp1.md) → PLAN.md 작성. 총 18과제 — MVP1 10 / MVP2 7 / MVP3 선행 게이트 1(U14), 착수 전 (PLAN.md)
2026-09-22 mvp1: U1(모노레포 골격) 착수 — developer 에이전트 진행 중. U10 UI 참조를 project_lopez_auto globals.css로 확정 (PLAN.md U1/U10)
2026-09-22 mvp1: U1 완료·검증 — pnpm@9.15.9 workspace + turbo + 루트 tsconfig.base.json + Makefile, pyproject/_scripts 3종 x_ soft-delete, .gitignore 재작성. 수락 3건 + 고의 파손(workspace 들여쓰기 → pnpm install exit 1) 확인. U3 착수 (PLAN.md U1)
2026-09-22 mvp1: U2·U3·U4·U5 완료·검증·커밋 (7a4b062, 771400f, f9ec69e, 6e38dce) — ReplacingMergeTree 6테이블 + kafka 엔진 0개, 중복 제거 실증(동일 idempotency_key 2건 → raw 2 / FINAL 1), venue만 다른 행은 안 접힘(2행), packages/{common,env,kalshi-core} 이식 + §4.4 키 개명, build 4/4 typecheck 6/6, turbo 순서 env → (common, schema) → kalshi-core (PLAN.md U2-U5)
2026-09-22 infra: 소유자 지시로 ClickHouse 볼륨 초기화(`down -v`) — U4 고의 파손 잔여 행 제거, 마이그레이션 재적용 후 0행 확인. U7 seed 전 상태 클린 (PLAN.md U4/U7)
2026-09-22 plan: 과제 4건 추가 — U3b(와이어 포맷 protobuf→JSON, 소유자 지시, U7보다 먼저), U5b(@repo/db workspace 패키지 신설, U6보다 먼저), U6에 KALSHI_SERIES_CATEGORY climate 불일치 선식별 수정건 부착, U15(console.log 잔여 정리, MVP1 말미). MVP1 과제 10 → 14 (PLAN.md)
2026-09-22 plan: MVP1 EXIT 게이트에 U15 편입 — EXIT 시연 1회 기동의 stdout 전 줄이 jq 통과해야 MVP1이 닫힌다(목표 7번 = 구조화 로깅). U15 순서는 그대로 마지막 (PLAN.md Phase 표)
2026-09-22 arch: 00.architecture.mvp1.md 개정(922→1126줄) — JSON 와이어 지시 반영 + 3건 확정(stream.ts 드롭 승인 / 키 형식을 venue 원문으로 통일 / KALSHI_SERIES_CATEGORY는 §1 우선, Kelly env 제거). 신규 리스크 기록: JSON이 protobuf보다 조용한 유실 면적이 넓다 — MVP2 전 U3b 종료 + 오프셋 델타 대 행수 델타 대사로 완화 (00.architecture.mvp1.md)
2026-09-22 plan: U5c 신설(키 형식 통일, sourceAbbr 제거, U7보다 먼저), U7의 `mock|` 키 접두어 기준 철회, U3b에 publishJson 재사용 금지(_ts/_key)와 useProtoFieldName 무증상 실패 경고 추가, M2의 auto.offset.reset=latest를 권고→필수. MVP1 과제 14 → 15 (PLAN.md)
