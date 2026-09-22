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
2026-09-22 mvp1: U3b 완료·검증·커밋 (9f47a01, 선행 52f50c9) — codec을 toJson/fromJsonString + useProtoFieldName:true 로 전환, publishJson 미재사용하고 sendJsonWire/publishJsonWire 신설. alwaysEmitImplicit이 proto3 optional(presence) 필드를 덮지 않음을 실측 → schema.fields 순회로 누락 키를 null 로 채워 **전 필드 항상 방출**. CH 26.9.1.1629 실측: 따옴표 int64 → Int64 무손실, 13자리 ms → DateTime64(3) 정상, seq null → NULL, 키 누락 시 컬럼 기본값(지배 설정은 input_format_defaults_for_omitted_fields — 아키텍처 초판의 설정명이 아님). 고의 파손: camelCase 키는 INSERT exit 0인데 컬럼이 조용히 0 (PLAN.md U3b)
2026-09-22 mvp1: U5c 완료·검증·커밋 (564f410) — sourceAbbr 제거, 5개 키 함수가 §4.4와 문자 단위 일치. 갱신할 실사용 호출부 0곳(유일 참조는 이미 soft-delete된 x_stream.ts). cryptoTickerKey → cryptoTickKey 개명(§4.4가 SSOT, predTickKey와 짝, 방출 문자열은 이미 crypto|{venue}|tick|…) (PLAN.md U5c)
2026-09-22 mvp1: U5b 완료·검증·커밋 (7d0396a) — @repo/db 워크스페이스 패키지화, routePublish가 JSON 경로로 라우팅. 패키지 5개, turbo 그래프 env/schema(leaf) → common ← env → kalshi-core ← common, db ← common+schema. KAFKA_ENCODING=proto 되돌림 분기는 **의도적으로 미이식**(U3b 이후 바이너리 인코더가 없어 JSON 바이트를 proto로 오표기하게 됨). 라우터가 _ts 를 더는 주입하지 않음 → producer가 이벤트 시각을 실을 수 있는 훅 data._ts, U6 결정 대기 (PLAN.md U5b/U6)
