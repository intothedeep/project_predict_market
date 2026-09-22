# PLAN — BTC 데이터 파이프라인 (system 도메인)

> Completed items live in `_archive/` (cold storage — do not read unless
> investigating history). Split detail, if any, is linked from stubs below;
> a stub's state is the truth if it and the detail disagree.

설계 원본: [`00.architecture.mvp1.md`](./00.architecture.mvp1.md). 본 문서는 그 설계를
**단계·과제·수락 기준**으로만 옮긴다. 설계 내용은 재서술하지 않고 § 번호로 참조한다.
(LaTeX 학습서 `book_market_predict_trading/`은 별도 도메인이며 자체 PLAN/STATUS를 갖는다 — 본 문서 범위 밖.)

## Intent

Kalshi/Polymarket(예측시장)과 Binance/Coinbase(현물)의 BTC 데이터를 하나의 계약
(proto → codec → ClickHouse DDL) 위에서 수집·저장·표시하는 저장소.
**MVP1이 증명하는 것**: 실 파이프라인 코드 0줄로 `web → api → Redis/ClickHouse` 왕복이
끝까지 돌고 화면에 두 venue의 오더북이 그려진다는 것. 즉 스키마와 흐름이 맞다는 것.

## Locked decisions (소유자, 2026-09-22 — 재론 금지)

- 언어: **TypeScript 모노레포**, pnpm + turbo. **pnpm 전용 — npm/yarn 금지.** MVP1에 Python 0줄(필요해지면 3.13).
- 구 저장소 `project_betting_kalshi`에서 **선별 이식**: `packages/{schema,db,common,kalshi-core,env}` + producer 3종(kalshi-ws, binance, coinbase). 드롭: weather, `ml_server`, `k8s/`, arbitrage/Kelly/집행, Rust, Vagrant (§7).
- **MVP 래더 강제**: MVP1은 mock API + mock 데이터 전용, **Kafka 연결 0개**. MVP2 = 실 슬라이스 1개(Binance). MVP3 = 코어 이전.
- **MVP1 모니터링 = 구조화 로깅(JSON line)뿐.** Prometheus/Grafana 없음.
- Kafka는 원격(Oracle). Redis + ClickHouse는 **colima** 로컬 Docker. 로컬 CH는 루트 `.env`의 `CLICKHOUSE_PASSWORD` 필요 (§10).
- 구 producer는 **정지 상태** → BTC 필터는 producer 구독 설정에만 건다 (§3.3).
- 이름: `venue`(kalshi/polymarket/binance/coinbase), `ingest_path`(live_ws/live_rest), `feed`(mock/live, API 응답 전용). 예측시장은 `Pred`/`pred_`, 현물은 `crypto_*` (§3.1).
- 신규 토픽 `pred.*` 4개. 구 `kalshi.*` 토픽은 **읽기 전용 아카이브로 보존, 절대 삭제하지 않는다** (§6).
- 대시보드 푸시는 **SSE** (브라우저 WebSocket 아님).
- Q4-b(seq 버그)는 **진단만** — 수정은 별건(U13).
- **Q2 종결**: 오더북 재구성은 **예측시장(Kalshi + Polymarket) 전용**. Binance/Coinbase는 틱·체결만, 호가창 없음.
- 잔여 미결: Q4(U13 블로커), Q5(U14에 부속), Q6(U10에 부속, Vite가 기본값).

## Phase structure (§6)

| 단계 | 범위 | EXIT CRITERION (실행 가능한 시연) |
|---|---|---|
| **MVP1 — shape** | 스키마 + 흐름 + 테이블, 전부 mock | `docker compose up` → `ch-migrate` → seed → `MOCK_SOURCE=1` writer → api → web. 브라우저 1화면에서 **kalshi와 polymarket mock 오더북이 둘 다 갱신**되고, writer를 죽이면 freshness가 stale로 변한다. 저장소 전체에 Kafka 연결 0개(`002_kafka_engines.sql` 미적용, `KAFKA_BOOTSTRAP` 미설정 상태로 전 흐름 성립) |
| **MVP2 — one real slice** | Binance BTC 실 파이프라인 1줄기 | 실 binance producer 1개 기동 후 `SELECT DISTINCT symbol FROM crypto_ticks FINAL WHERE venue='binance'` 이 정확히 `MOCK_BTCUSDT`, `BTCUSDT` 2행(ETH/SOL/XRP 0행 = `auto.offset.reset=latest` 관찰). `git diff` 기준 `packages/schema/src/proto/` 와 `001_data_tables.sql` 변경 0줄. mock 행과 실 행은 `MOCK_` 심볼 접두어로만 구분되며 공존 |
| **MVP3 — core migrated** | Kalshi 오더북 경로 실전환 | writer가 `kafkaSource`로 돌아 Redis `ob:kalshi:*` 가 실 티커로 채워지고, `SELECT count() FROM pred_orderbook_ws FINAL` == `SELECT uniqExact(idempotency_key) ...`. 이전한 경로의 mock만 폐기, 나머지 mock은 fallback으로 유지 |

**게이트 규칙**: 앞 단계의 EXIT CRITERION이 닫히기 전에 다음 단계 과제를 열지 않는다.
U12/U13/U14는 **MVP3 선행 게이트**이며 MVP3 개시 전에 반드시 닫힌다.

---

## MVP1 tasks (의존 순서)

> 공통 전제 (U1 결과, 재발명 금지): `tsconfig.base.json` 은 **저장소 루트**에 있다 —
> 하위 패키지는 `extends: "../../tsconfig.base.json"`. `packages/config-typescript` 를
> 새로 만들지 않는다(§2의 5개 패키지 목록을 늘리는 것은 아키텍처 결정).
> `x_*` 는 **절대 `.gitignore` 에 넣지 않는다** — soft-delete 파일은 git에 보여야 한다
> (`rules/docs.md` §0, 2026-09-20 사건).

- [x] **U1 — 모노레포 골격.** pnpm workspace + turbo + tsconfig base + Makefile(`up`/`down`/`migrate`/`lag`) + 루트 정리. 선행: —
  - 수락: 빈 workspace에서 `pnpm build` 종료코드 0. `package.json`에 `packageManager: "pnpm@…"` 필드 존재.
  - 수락: 루트에 `x_pyproject.toml` 존재하고 `pyproject.toml` 부재. `_scripts/` 의 `useClaude/`, `useGoogleVertex.claude/`, `useLocalOllama.gemma/` 세 디렉터리가 `x_` 접두어로 이름만 바뀌어 존재(삭제 금지 — soft-delete).
  - 수락: `.gitignore` 에 `weather|ml_server|k8s|Cargo|\.venv` 매칭 줄 0개. `git check-ignore mocks/` 출력 없음.
- [ ] **U3 — `packages/schema` 이식 + trim + venue 차원 (§3.1, §7).** `kalshi.proto`→`pred.proto` 3종 `Pred*` + `venue = 101`, crypto `source`→`venue`(번호 2 유지), codec 토픽 키를 `pred.*`로. 선행: U1
  - 수락: `pnpm codegen` 종료코드 0. `grep -c venue` 기준 5개 메시지 전부 `venue` 필드 보유.
  - 수락: `proto-codec.ts` 의 `PROTO_ENCODERS` 맵에 `kalshi.` 로 시작하는 키 0개.
  - 수락: `weather.proto`, `src/table-configs/`, `src/generators/`, `src/generated/python/` 경로 부재.
  - 수락(고의 파손): `pred.proto` 에서 필드 번호 101을 한 메시지 안에 두 번 쓰고 `pnpm codegen` → 중복 번호로 실패하는 것을 관찰 후 원복(§3.2 "필드 번호 재사용 금지"가 실제로 감시되는지 확인).
- [ ] **U2 — `infra/docker-compose.dev.yml` (clickhouse + redis) + colima 런북 (§10).** 선행: U1
  - 수락: `colima start` 후 `docker compose -f infra/docker-compose.dev.yml up -d` → `docker compose ps` 가 2개 컨테이너 healthy.
  - 수락: `grep -ci kafka infra/docker-compose.dev.yml` 이 0 (주석도 없음).
  - 수락(고의 파손): `CLICKHOUSE_PASSWORD` 를 비우고 접속 → 인증 실패 관찰 후 원복.
- [ ] **U4 — `packages/db` 이식 + `001_data_tables.sql` + `_scripts/ch-migrate.sh` 신규 (§3.4).** 선행: U2, U3
  - 수락: `bash _scripts/ch-migrate.sh` 후 `SHOW TABLES` 가 §3.4의 6개 테이블 정확히 그대로, `*_kafka` 0개.
  - 수락: 같은 스크립트를 두 번 실행해도 에러 없음(멱등).
  - 수락: `insert-csv.ts`, `utils/raw-query.ts` 부재.
  - 주의: `002_kafka_engines.sql` 은 **작성하지 않는다** (MVP2 과제 M2).
- [ ] **U5 — `packages/{common,env,kalshi-core}` 이식 + trim + logger JSON화 (§7).** 선행: U3
  - 수락: `pnpm typecheck` 종료코드 0.
  - 수락: 로그 한 줄을 `jq .` 로 파이프 → 파싱 성공(ANSI 컬러 문자열 아님).
  - 수락: `idempotency.ts` 에 weather 키 함수 0개, Kalshi 전용 함수명(`kalshi*Key`) 0개 — 키는 `venue` 파라미터를 받는다.
  - 수락: `math/kelly*`, `env/src/llm.ts`, `series/climate.ts` 경로 부재.
- [ ] **U7 — `mocks/` 데이터셋 + `seed-clickhouse.sql` (§3.6).** venue 4종 전부 포함. 선행: U3, U4
  - 수락: seed 적용 후 6개 테이블의 `venue` 합집합이 정확히 `kalshi, polymarket, binance, coinbase` 4값.
  - 수락: 모든 mock 행의 ticker/symbol이 `MOCK_` 로, idempotency key가 `mock|` 로 시작.
  - 수락: 각 `.jsonl` 의 모든 줄이 U3 codec으로 디코딩 에러 없이 통과.
- [ ] **U6 — producer 3종 이식 + BTC 한정 trim + `init-registry` REST 재설계 (§3.3, §7.1).** **기동하지 않는다.** 선행: U4, U5
  - 수락: 3개 앱 모두 `pnpm build` + `pnpm typecheck` 종료코드 0.
  - 수락: coinbase `config.ts` `PRODUCTS === ['BTC-USD']`, binance 심볼 상수 === `['btcusdt']`.
  - 수락: `init-registry.ts` 에 ClickHouse import 0개, `kalshi.market.api` 문자열 0개.
  - 수락: 미이식 확인 — private 채널 핸들러 5종, `parse-orderbook.ws.ts` 경로 부재.
  - 수락(§4.0 어댑터 경계): `prod-kalshi-ws-ts` 안에 Kalshi `VenueOrderbookAdapter` 구현 파일이 존재하고, `orderbook-reconstructor.ts` 에 `msg.channel` / `orderbook_snapshot` / `orderbook_delta` 문자열이 0개(거래소 방언은 어댑터에만 존재). `BookEvent.seq` 타입이 `number | null`. Polymarket 어댑터는 0개(MVP3).
  - 수락: 이 과제 동안 producer 프로세스를 단 한 번도 띄우지 않는다(Kafka 연결 0개 불변식).
- [ ] **U8 — `apps/orderbook-writer` + `MessageSource` + `mockSource` + Redis Lua LWW 가드 (§4.2, §4.4, §4.5).** 선행: U5, U7
  - 수락: `MOCK_SOURCE=1` 로 기동 후 `redis-cli KEYS 'ob:*'` 에 `ob:kalshi:MOCK_*` 와 `ob:polymarket:MOCK_POLY_*` 가 모두 존재, `SCARD ob:index` >= 2, `TTL writer:heartbeat` <= 60.
  - 수락(고의 파손): 더 작은 `time_ms` 스냅샷을 재생 → `HGET ob:kalshi:MOCK_… time_ms` 값 불변(LWW 가드 동작 관찰) 후 정리.
  - 수락(고의 파손): `MOCK_SOURCE` 없이 기동 → 0이 아닌 종료코드 + error 로그로 죽고 `KEYS 'ob:*'` 가 비어 있다(§4.5 — mock은 기본값이 아니다).
  - 주의: `VenueOrderbookAdapter` 경계는 **producer 쪽(U6/§4.0·§4.1)** 소관이다. 라이터는 풀북 적용 전용 무상태이므로 어댑터를 두지 않는다 (§4.0·§4.1·§9 모두 일치, 2026-09-22 아키텍트 추인).
- [ ] **U9 — `apps/api` (Hono): `OrderbookSnapshot` 계약, `/api/orderbook/:venue/:ticker`, Redis 읽기, CH `FINAL` 읽기, SSE (§3.5).** 선행: U4, U8
  - 수락: `curl` 로 kalshi/polymarket 두 티커 모두 §3.5 JSON 형태 반환 — `feed: "mock"`, `stale_ms` 는 숫자, `price`/`qty` 는 문자열.
  - 수락: `curl -N` SSE 엔드포인트가 이벤트를 연속 출력.
  - 수락(고의 파손): 없는 venue로 요청 → 4xx. writer를 정지시킨 뒤 재조회 → `stale_ms` 가 증가하는 것을 관찰 후 재기동.
- [ ] **U10 — `apps/web` (Vite + React) 수집 대시보드 1화면.** venue 선택 + 오더북 + freshness + `feed` 배지. 선행: U9
  - 수락: 브라우저에서 **kalshi와 polymarket mock 오더북이 둘 다 갱신**된다(Kalshi 하드코딩 불가 증명).
  - 수락: 77자리 Polymarket CLOB token id 티커가 레이아웃을 깨지 않고 렌더된다.
  - 수락(고의 파손): writer 정지 → freshness 표시가 눈에 띄게 stale로 바뀐다. 재기동 시 복구.
  - **UI 참조 (소유자, 2026-09-22)**: `/Users/tio/Documents/project_lopez_auto/apps/colony_client_web/app/globals.css` (125줄) 를 **직접 읽고** 따를 것 — 요약본 금지. 핵심은 Tailwind v4 `oklch` 토큰, 직각 모서리(`--radius: 0`), UI 전체 모노스페이스, 어두운 헤어라인 보더, **채도는 장식이 아니라 신호에만**.
  - 수락(UI): 화면에서 채도 있는 색이 신호(bid/ask, fresh/stale, mock/live 배지)에만 나타나고 나머지 크롬은 무채색. ticker/price/qty가 모노스페이스로 열 정렬된다(77자리 CLOB token id 포함).
  - 구현 메모(블로커 아님): 참조 프로젝트는 Next.js라 `next/font` 경로를 쓸 수 없다 — 토큰 CSS는 거의 그대로 이식되지만 모노 폰트 로딩은 Vite 방식으로 따로 배선해야 한다.
  - 블로커 아님: **Q6**(Vite vs Next.js) — Vite가 기본값이며 소유자 지시가 있을 때만 변경.

**MVP1 종료 판정**: 위 10개가 전부 `[x]` 이고 Phase 표의 MVP1 EXIT CRITERION 시연이 1회 통과.

---

## MVP2 tasks (MVP1 EXIT 이후에만 개시)

- [ ] **M1 — producer 심볼 상수를 env로 (§3.3).** 수락: 코드에 하드코딩 심볼 배열 0개, `.env` 값 변경만으로 구독 심볼이 바뀌는 것을 기동 로그로 관찰.
- [ ] **M2 — `002_kafka_engines.sql` 작성 + crypto 2개(`crypto_ticks_kafka`, `crypto_trades_kafka`)만 적용.** 수락: `SHOW TABLES` 에 `*_kafka` 2개 + MV 2개, 예측시장 kafka 테이블 0개. 컨슈머 설정에 `auto.offset.reset=latest` 명시.
- [ ] **M3 — `prod-crypto-binance-ts` 실기동 (Oracle Kafka).** 수락: Phase 표 MVP2 EXIT CRITERION의 `SELECT DISTINCT symbol … WHERE venue='binance'` 관찰. 고의 파손: producer를 죽였다 살려 중복 유입 → `FINAL` 조회에서 중복 0.
- [ ] **M4 — `dr_cb: true` + 실패 건 error 로그 (§5.3-2).** 수락(고의 파손): `KAFKA_BOOTSTRAP` 을 잘못된 주소로 두고 기동 → 유실이 JSON error 로그로 남는 것을 관찰(현재는 무로그) 후 원복.
- [ ] **U11 — `_scripts/kafka-lag.sh` 신규.** 선행: M3(소비 컨슈머 그룹이 실제로 존재해야 출력할 lag이 있다). 수락: 실행 시 컨슈머 그룹명과 lag 수치가 출력된다.
- [ ] **U12 — 진단: 실 Kalshi `orderbook_delta` 원본 1건 캡처 (§8 Q4-b). 수정 금지.** 선행: U5
  - 수락: 캡처된 원본 JSON 파일 1건이 저장소에 존재하고, 어느 필드가 시퀀스를 담는지 결론이 `STATUS.md` 한 줄로 기록된다.
  - 수락: 캡처 전후 reconstructor 경로의 `git diff` 가 비어 있다(수정 금지 확인). 캡처 중 Kafka publish 0건.
  - 성격: 읽기 전용 1회 구독 → 1건 로그 → 종료. `KALSHI_API_KEY_ID`/`KALSHI_PRIVATE_KEY_PATH` 필요.
- [ ] **U13 — U12 결과에 따른 reconstructor 수정 (+ 필요시 세션 성분).** 선행: U12
  - **블로커: Q4 — Kalshi `seq` 가 재접속(구독) 단위로 리셋되는가?** U12 캡처 결과가 나오기 전에는 착수 금지. 리셋된다면 idempotency key에 세션 성분을 추가해야 한다(§4.4 인용문).
  - 수락: U12가 캡처한 실제 메시지를 reconstructor에 그대로 먹여 파싱된 seq가 원본 필드 값과 일치.
  - 수락(고의 파손): 같은 메시지의 seq를 +2 해서 먹이면 갭 감지 로그가 발생한다(현재는 발생하지 않는다 — 수정 전/후를 둘 다 관찰).

## MVP3 선행 게이트

- [ ] **U14 — `_scripts/create-pred-topics.sh` 작성 + Oracle 브로커에 `pred.*` 4개 생성 (§6).** 선행: U5. 작성과 실행을 나누지 않는다 — 실행이 곧 Kafka 연결이므로 MVP1/MVP2에서 닫을 수 없다.
  - 수락: `kafka-topics --list` 에 `pred.market.tick.ws`, `pred.trade.ws`, `pred.orderbook.ws`, `pred.orderbook_delta.ws` 4개 존재, 각각 `partitions=1 replication-factor=1`. 스크립트는 `--if-not-exists` 라 재실행해도 에러 없음.
  - 수락: 구 `kalshi.*` 토픽 29개가 그대로 남아 있음(삭제·개명 0건).
  - 부속(블로커 아님): **Q5** — 파티션/복제를 올릴 계획이 생기면 Kafka 메시지 키를 `idempotency_key` → `{venue}|{ticker}` 로 바꾸는 작업이 **선행**되어야 한다 (§4.4). 현 설계는 `1/1` 고정.

MVP3 본 과제(writer `kafkaSource` 교체, 나머지 kafka 엔진 4개, `prod-kalshi-ws-ts` 실기동,
Polymarket producer)는 U12·U13·U14가 닫힌 뒤에 이 문서에 추가한다 — 지금 열지 않는다.
