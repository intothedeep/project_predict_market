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
- 잔여 미결: Q4(U13 블로커 — 합성 카운터도 producer 재시작 시 리셋되므로 세션 성분은 **MVP3 필수 선행**으로 격상, 새 질문을 열지 않고 Q4에 병합), Q5(U14에 부속), Q6(U10에 부속, Vite가 기본값).

## Phase structure (§6)

| 단계 | 범위 | EXIT CRITERION (실행 가능한 시연) |
|---|---|---|
| **MVP1 — shape** | 스키마 + 흐름 + 테이블, 전부 mock | `docker compose up` → `ch-migrate` → seed → `MOCK_SOURCE=1` writer → api → web. 브라우저 1화면에서 **kalshi와 polymarket mock 오더북이 둘 다 갱신**되고, writer를 죽이면 freshness가 stale로 변한다. 저장소 전체에 Kafka 연결 0개(`002_kafka_engines.sql` 미적용, `KAFKA_BOOTSTRAP` 미설정 상태로 전 흐름 성립). **이 1회 기동의 stdout 전 줄이 `jq .` 를 통과해야 한다 — U15가 닫히기 전에는 MVP1이 닫히지 않는다**(구조화 로깅이 MVP1의 목표 7번 산출물이므로 정리 과제가 아니다) |
| **MVP2 — one real slice** | Binance BTC 실 파이프라인 1줄기 | 실 binance producer 1개 기동 후 `SELECT DISTINCT symbol FROM crypto_ticks FINAL WHERE venue='binance'` 이 정확히 `MOCK_BTCUSDT`, `BTCUSDT` 2행(ETH/SOL/XRP 0행 = `auto.offset.reset=latest` 관찰). `git diff` 기준 `packages/schema/src/proto/` 와 `001_data_tables.sql` 변경 0줄. mock 행과 실 행은 `MOCK_` 심볼 접두어로만 구분되며 공존 |
| **MVP3 — core migrated** | Kalshi 오더북 경로 실전환 | writer가 `kafkaSource`로 돌아 Redis `ob:kalshi:*` 가 실 티커로 채워지고, `SELECT count() FROM pred_orderbook_ws FINAL` == `SELECT uniqExact(idempotency_key) ...`. 이전한 경로의 mock만 폐기, 나머지 mock은 fallback으로 유지 |

**게이트 규칙**: 앞 단계의 EXIT CRITERION이 닫히기 전에 다음 단계 과제를 열지 않는다.
U12/U13/U14는 **MVP3 선행 게이트**이며 MVP3 개시 전에 반드시 닫힌다.

---

## MVP1 tasks (의존 순서)

> 공통 전제 (U1 결과, 재발명 금지): `tsconfig.base.json` 은 **저장소 루트**에 있다 —
> 하위 패키지는 `extends: "../../tsconfig.base.json"`. `packages/config-typescript` 를
> 새로 만들지 않는다(§2의 5개 패키지 목록을 늘리는 것은 아키텍처 결정).
> **과제 번호는 product-manager가 단독 발행한다.** 아키텍트는 설계를 쓰고 `PLAN.md` 를 읽지
> 않으므로 무엇이 이미 쓰였는지 알 수 없다 — 새 단위는 **번호 없이 서술**로 넘기고 번호는
> 여기서 붙인다(충돌 3회: U15→U7b, U19→U20 등).
> `x_*` 는 **절대 `.gitignore` 에 넣지 않는다** — soft-delete 파일은 git에 보여야 한다
> (`rules/docs.md` §0, 2026-09-20 사건).

- [x] **U1 — 모노레포 골격.** pnpm workspace + turbo + tsconfig base + Makefile(`up`/`down`/`migrate`/`lag`) + 루트 정리. 선행: —
  - 수락: 빈 workspace에서 `pnpm build` 종료코드 0. `package.json`에 `packageManager: "pnpm@…"` 필드 존재.
  - 수락: 루트에 `x_pyproject.toml` 존재하고 `pyproject.toml` 부재. `_scripts/` 의 `useClaude/`, `useGoogleVertex.claude/`, `useLocalOllama.gemma/` 세 디렉터리가 `x_` 접두어로 이름만 바뀌어 존재(삭제 금지 — soft-delete).
  - 수락: `.gitignore` 에 `weather|ml_server|k8s|Cargo|\.venv` 매칭 줄 0개. `git check-ignore mocks/` 출력 없음.
- [x] **U3 — `packages/schema` 이식 + trim + venue 차원 (§3.1, §7).** `kalshi.proto`→`pred.proto` 3종 `Pred*` + `venue = 101`, crypto `source`→`venue`(번호 2 유지), codec 토픽 키를 `pred.*`로. 선행: U1
  - 수락: `pnpm codegen` 종료코드 0. `grep -c venue` 기준 5개 메시지 전부 `venue` 필드 보유.
  - 수락: `proto-codec.ts` 의 `PROTO_ENCODERS` 맵에 `kalshi.` 로 시작하는 키 0개.
  - 수락: `weather.proto`, `src/table-configs/`, `src/generators/`, `src/generated/python/` 경로 부재.
  - 수락(고의 파손): `pred.proto` 에서 필드 번호 101을 한 메시지 안에 두 번 쓰고 `pnpm codegen` → 중복 번호로 실패하는 것을 관찰 후 원복(§3.2 "필드 번호 재사용 금지"가 실제로 감시되는지 확인).
- [x] **U2 — `infra/docker-compose.dev.yml` (clickhouse + redis) + colima 런북 (§10).** 선행: U1
  - 수락: `colima start` 후 `docker compose -f infra/docker-compose.dev.yml up -d` → `docker compose ps` 가 2개 컨테이너 healthy.
  - 수락: `grep -ci kafka infra/docker-compose.dev.yml` 이 0 (주석도 없음).
  - 수락(고의 파손): `CLICKHOUSE_PASSWORD` 를 비우고 접속 → 인증 실패 관찰 후 원복.
- [x] **U4 — `packages/db` 이식 + `001_data_tables.sql` + `_scripts/ch-migrate.sh` 신규 (§3.4).** 선행: U2, U3
  - 수락: `bash _scripts/ch-migrate.sh` 후 `SHOW TABLES` 가 §3.4의 6개 테이블 정확히 그대로, `*_kafka` 0개.
  - 수락: 같은 스크립트를 두 번 실행해도 에러 없음(멱등).
  - 수락: `insert-csv.ts`, `utils/raw-query.ts` 부재.
  - 주의: `002_kafka_engines.sql` 은 **작성하지 않는다** (MVP2 과제 M2).
- [x] **U5 — `packages/{common,env,kalshi-core}` 이식 + trim + logger JSON화 (§7).** 선행: U3
  - 수락: `pnpm typecheck` 종료코드 0.
  - 수락: 로그 한 줄을 `jq .` 로 파이프 → 파싱 성공(ANSI 컬러 문자열 아님).
  - 수락: `idempotency.ts` 에 weather 키 함수 0개, Kalshi 전용 함수명(`kalshi*Key`) 0개 — 키는 `venue` 파라미터를 받는다.
  - 수락: `math/kelly*`, `env/src/llm.ts`, `series/climate.ts` 경로 부재.
- [x] **U3b — 와이어 포맷 protobuf → JSON (소유자, 2026-09-22).** Kafka 페이로드는 MVP1 내내 JSON이며 파이프라인이 검증될 때까지 유지한다 — 이유는 콘솔 컨슈머로 토픽을 읽을 수 있는 디버깅 가능성. **U3를 되돌리지 않는다**: `.proto` 는 메시지 형태의 SSOT로 그대로 남고, codec 경계의 인코딩만 `@bufbuild/protobuf` 의 `toJson`/`fromJson` 으로 바뀐다. 선행: U4, U5 / **U7보다 먼저**
  - 수락: codec이 내보낸 JSON의 키가 **snake_case** 로 ClickHouse 컬럼명과 1:1 일치(protobuf-JSON 기본 lowerCamelCase 아님) — 한 메시지를 인코딩해 키 목록과 `DESCRIBE` 컬럼 목록이 같음을 확인.
  - 수락: 마이그레이션에서 `Protobuf` + `format_schema` 가 0회 등장하고 `JSONEachRow` 로 대체. 그 결과 U2에서 컨테이너 재시작 루프를 일으켰던 `format_schemas` 마운트가 compose에서 **소멸**한다.
  - 수락(실측 필수): int64가 **따옴표 친 JSON 문자열**로 직렬화되므로, 그 형태를 `JSONEachRow` 로 넣어 `Int64`/`DateTime64` 컬럼에 값이 정상 적재되는지, `seq: null` 이 `Nullable(Int64)` 에 `NULL` 로 들어가는지 실제 INSERT + SELECT로 확인(추측 금지).
  - 수락(고의 파손): 키 하나를 lowerCamelCase로 바꿔 INSERT → 해당 컬럼이 기본값으로 떨어지거나 거부되는 것을 관찰 후 원복.
  - **비목표(함정)**: `packages/common/src/kafka.ts` 의 기존 `publishJson()` 과 `routePublish` 의 `KAFKA_ENCODING=json` 분기를 **재사용하지 않는다**(§3.7 규칙 4). `publishJson()` 은 페이로드에 `_ts`/`_key` 를 주입해 스키마 밖 키 2개를 와이어에 올리고, proto 필드명 규칙도 적용하지 않는다. JSON 경로는 **새 인코딩 단계**다. (여기의 `_ts` 는 레거시 `publishJson()` 이 실제로 주입하는 **발행** 시각이며 이름 그대로 둔다 — producer가 싣는 이벤트 시각 `event_time_ms` 와 다른 값이다.) 수락: 와이어 페이로드의 키 집합이 proto 필드 집합과 **정확히 일치**(`_ts`/`_key` 0건).
  - 주의: `useProtoFieldName` 을 빠뜨려도 **ClickHouse는 에러를 내지 않는다** — 컬럼 기본값을 조용히 취해 데이터가 빈 채로 들어간다. 위 고의 파손 검증이 평소보다 중요한 이유.
  - 귀결: mock `.jsonl` 은 이제 와이어 페이로드와 **바이트 단위로 동일**해진다(§3.6의 "필드 단위 동일"보다 강함) → U7 수락 기준의 근거가 된다.
- [x] **U5c — idempotency 키 형식 통일 (§4.4 정확 형식 표가 SSOT).** 예측시장·현물 키 모두 **venue를 축약 없이 그대로** 싣고 `sourceAbbr()` 을 제거한다. 근거: 축약이 지키려던 구 `crypto.*` 백로그와의 연속성은 **애초에 존재하지 않는다** — 그 바이트에는 `venue` 필드가 없어 어떤 키 형식이든 그대로는 소비 불가이고, 흡수하려면 키를 다시 쓰는 backfill이 반드시 필요하다. U5는 커밋(`6e38dce`) 완료·종결 상태이므로 되돌리지 않고 후속 과제로 처리한다. 선행: U5 / **U7보다 먼저**(U7의 mock 키가 최종 형식이어야 한다)
  - 수락: `idempotency.ts` 에 `sourceAbbr` 문자열 0건. 5개 키 함수 출력이 §4.4 표와 문자 단위로 일치(각 함수 1회 호출 결과를 표와 대조).
  - 수락: `cryptoTradeKey`/`cryptoTickKey`(§4.4 SSOT 이름 — 구 `cryptoTickerKey` 에서 개명, `predTickKey` 와 짝) 출력에 `binance`/`coinbase` 가 축약 없이 그대로 나타난다.
  - 수락(고의 파손): 한 키 함수의 구분자나 성분 순서를 바꿔 seed를 넣어 보고 §4.4 표와 어긋나는 것을 관찰 후 원복.
  - **건드리지 말 것**: `orderbookKey` 에는 family 접두어가 **없다** — 미결 Q2에 따라 두 family를 모두 서빙할 수 있어 아키텍트가 의도적으로 남긴 비대칭이다. 후속 과제가 "일관성"을 이유로 고치지 않는다.
- [x] **U7 — `mocks/` 데이터셋 + `seed-clickhouse.sql` (§3.6).** venue 4종 전부 포함. 선행: U3, U4
  - 수락: seed 적용 후 6개 테이블의 `venue` 합집합이 정확히 `kalshi, polymarket, binance, coinbase` 4값.
  - 수락: 모든 mock 행의 ticker/symbol이 `MOCK_` 로 시작하고, idempotency key는 **U5c의 최종 형식**을 따른다(키에 `MOCK_` 가 티커 성분으로 이미 들어가므로 별도 `mock|` 접두어는 쓰지 않는다 — 아키텍트 정정, §3.6). API 응답의 `feed = "mock"` 은 그대로.
  - 수락: 각 `.jsonl` 의 모든 줄이 U3 codec으로 디코딩 에러 없이 통과.
- [x] **U5b — `packages/db` 를 workspace 패키지로 만든다.** U4는 `migrations/` 와 `ch-migrate.sh` 만 만들었고 `package.json` 도 `routePublish` 도 없다. §2/§7 상 producer 3종이 `@repo/db` 에서 `routePublish` 를 import 하므로 **이것 없이는 U6가 완료될 수 없다.** 선행: U5 / **U6보다 먼저**
  - 수락: `pnpm ls --depth -1` 에 `@repo/db` 가 workspace 패키지로 나타나고, `pnpm build`/`typecheck` 가 이 패키지를 포함해 종료코드 0.
  - 수락: `routePublish` 가 export되고 kafka 경로만 남았다 — csv 분기, `insert-csv.ts`, `utils/raw-query.ts` 0건 (§7).
  - 수락(고의 파손): 임시 파일에서 `import { routePublish } from '@repo/db'` 를 하고 잘못된 인자로 호출 → 타입 에러 발생 관찰 후 파일 제거(해석이 아니라 실제 해석 경로가 살아 있음을 확인).
- [x] **U6 — producer 3종 이식 + BTC 한정 trim + `init-registry` REST 재설계 (§3.3, §7.1).** **기동하지 않는다.** 선행: U4, U5, U5b
  - **선식별 수정건**: `packages/env/src/kalshi.ts` 의 `KALSHI_SERIES_CATEGORY: z.enum(['climate','crypto','all'])` 가 trim된 `TKalshiCategory`(`'crypto'|'hot'|'all'`)와 불일치 → `getSeriesByCategory(KALSHI_SERIES_CATEGORY)` 가 타입 에러. `climate` 를 제거해 맞춘다(§1의 weather 전면 제외가 §7의 "carry as-is"보다 우선 — 아키텍트 확정 대기 중이나 이 방향으로 진행). 수락: `climate` 문자열 0건 + `typecheck` 0.
  - **확정(§3.7 규칙 5)**: producer는 **거래소 이벤트 시각**을 `event_time_ms` 로 공급해야 한다(구 이름 `_ts` 에서 개명 — 이 값은 `time_ms` 로 와이어에 실제로 나가므로 밑줄 접두어가 틀렸고, 이름이 "어느 시각인지"를 말하지 않았다). 발행 시각 대입 금지.
  - **미해결 예외(아키텍트 판정 대기 — 스스로 해결하지 말 것)**: Kalshi tick/orderbook 경로가 현재 `event_time_ms` 에 `Date.now()` 를 넣고 있고(코드에서 이벤트 시각 필드를 찾지 못함), Kalshi trade 경로는 `created_time` 을 쓰는데 이는 REST 필드명이라 WS 경로에서 미검증이다. Binance/Coinbase는 실 이벤트 시각을 싣는다. **MVP3가 이전할 바로 그 경로의 규칙 5 위반**이며 §5.4상 귀결은 재시작 시 에러 없는 영구 중복이다. U12 게이트로 묶은 예외로 기록할지, 더 나은 수단이 있는지 판정 대기.
  - **판정 대기 2건**: (a) registry 교체가 §7.1이 적은 범위를 넘어 동작을 바꿨다 — TTL 축출 상실 + status 화이트리스트가 더 좁아짐. (b) 인증 헤더가 **공개** WS 풀에 추가되었다(구 코드에는 없었음).
  - 수락: 3개 앱 모두 `pnpm build` + `pnpm typecheck` 종료코드 0.
  - 수락: coinbase `config.ts` `PRODUCTS === ['BTC-USD']`, binance 심볼 상수 === `['btcusdt']`.
  - 수락: `init-registry.ts` 에 ClickHouse import 0개, `kalshi.market.api` 문자열 0개.
  - 수락: 미이식 확인 — private 채널 핸들러 5종, `parse-orderbook.ws.ts` 경로 부재.
  - 수락(§4.0 어댑터 경계): `prod-kalshi-ws-ts` 안에 Kalshi `VenueOrderbookAdapter` 구현 파일이 존재하고, `orderbook-reconstructor.ts` 에 `msg.channel` / `orderbook_snapshot` / `orderbook_delta` 문자열이 0개(거래소 방언은 어댑터에만 존재). `BookEvent.seq` 타입이 `number | null`. Polymarket 어댑터는 0개(MVP3). 재구성기는 venue가 seq를 주지 않을 때 `(venue, ticker)` 별 단조 카운터를 **합성**해 `PredOrderbook.seq` 를 항상 채운다.
  - 수락: 이 과제 동안 producer 프로세스를 단 한 번도 띄우지 않는다(Kafka 연결 0개 불변식).
- [x] **U7b — 키 헬퍼 fail-fast (§4.4 재작성분이 SSOT).** 아키텍트가 "U15"로 명명했으나 본 문서의 U15(로깅 정리)와 충돌하므로 **U7b로 부여한다** — 본 문서 어디에서도 이 작업을 U15로 부르지 않는다. 선행: U5c, U7 / **U8보다 먼저**(라이터가 이 키를 소비한다)
  - 결함: 헬퍼가 빈 성분을 필터링해 인자가 빠지면 실패 대신 키가 **짧아진다**. `orderbookKey('polymarket', ticker, null)` → `ob|polymarket|{ticker}` 가 되어 그 티커의 전 스냅샷이 한 키로 뭉치고, `idempotency_key` 가 정렬 키 마지막 성분이라 ReplacingMergeTree가 **세션 전체를 1행으로 접는다** — 중복 제거가 아니라 데이터 유실이다. 더 나쁜 사례: `predTradeKey`/`cryptoTradeKey` 의 `nativeId` 는 proto상 `optional string trade_id` 라, 거래소가 체결 id를 안 주면 **그 티커의 모든 체결**이 1행으로 접힌다 — MVP3의 Kalshi 경로에서 실제로 발생 가능. `prod-crypto-binance-ts` 는 호출부에서 이미 복합 fallback으로 방어하고 있었고(위험이 한 곳에서만 패치된 상태), 아키텍트가 그 fallback을 계약으로 승격했다.
  - 수락: 헬퍼가 고정 arity로 전 성분을 요구하고 누락 시 **throw**(`rules/core.md` fail-fast). 5개 키 함수 출력이 재작성된 §4.4와 문자 단위 일치.
  - 수락: 체결 키에 복합 fallback이 계약으로 구현되어 있다(`trade_id` 부재 시의 대체 성분).
  - 수락(고의 파손 — 이 과제의 핵심): **함수마다 각각** 성분 하나를 빼고 호출해 throw 하는 것을 관찰한다(1회 대표 검증 불가, 5회).
  - 수락: mock 재생성 후 6개 `.jsonl` 이 **바이트 단위로 불변**(mock이 계약의 참조 구현이므로). **복원됨 — U17②가 철회되었다**(아키텍트 자기 판정 취소): ②는 mock 파일의 절대 `time_ms` 가 `stale_ms` 를 좌우한다는 전제 위에 있었는데 U17①의 런타임 재앵커링이 그 전제를 거짓으로 만들었다. 그래서 ②는 대가만 치렀다 — 재생성이 7개 파일을 흔들고, `predTickKey`/`cryptoTickKey` 가 `timeMs` 를 실으므로 `idempotency_key` 까지 움직여 **재seed한 행이 접히지 않았다(mock 세트가 §5의 중복 제거 보증을 스스로 위반)**. 확정 형태는 계층 분리: **파일 = 고정 상수 앵커**(재현 가능·키 안정), **재생 = 현재 시각으로 재앵커**(freshness 성립). 기준은 약화가 아니라 복원이며 U7c가 실물을 되돌린다.
- [x] **U8 — `apps/orderbook-writer` + `MessageSource` + `mockSource` + Redis Lua LWW 가드 (§4.2, §4.4, §4.5).** 선행: U5, U7, U7b
  - 범위: 와이어의 `PredOrderbook.seq` 는 **항상 채워진다** — venue가 시퀀스를 주지 않으면 재구성기가 `(venue, ticker)` 별 단조 카운터를 합성한다(합성 책임은 U6/U8). `BookEvent.seq: number | null` 계약은 그대로(어댑터는 venue의 사실을 보고한다). `time_ms` 로 대체하지 않는다 — 그것은 venue 이벤트 시각이라 같은 타임스탬프의 두 스냅샷이 여전히 충돌한다.
  - 수락: `MOCK_SOURCE=1` 로 기동 후 `redis-cli KEYS 'ob:*'` 에 `ob:kalshi:MOCK_*` 와 `ob:polymarket:MOCK_POLY_*` 가 모두 존재, `SCARD ob:index` >= 2, `TTL writer:heartbeat` <= 60.
  - 수락(고의 파손): 더 작은 `time_ms` 스냅샷을 재생 → `HGET ob:kalshi:MOCK_… time_ms` 값 불변(LWW 가드 동작 관찰) 후 정리.
  - 수락(고의 파손): `MOCK_SOURCE` 없이 기동 → 0이 아닌 종료코드 + error 로그로 죽고 `KEYS 'ob:*'` 가 비어 있다(§4.5 — mock은 기본값이 아니다).
  - 주의: `VenueOrderbookAdapter` 경계는 **producer 쪽(U6/§4.0·§4.1)** 소관이다. 라이터는 풀북 적용 전용 무상태이므로 어댑터를 두지 않는다 (§4.0·§4.1·§9 모두 일치, 2026-09-22 아키텍트 추인).
- [x] **U9 — `apps/api` (Hono): `OrderbookSnapshot` 계약, `/api/orderbook/:venue/:ticker`, Redis 읽기, CH `FINAL` 읽기, SSE (§3.5).** 선행: U4, U8
  - 수락: `curl` 로 kalshi/polymarket 두 티커 모두 §3.5 JSON 형태 반환 — `feed: "mock"`, `stale_ms` 는 숫자, `price`/`qty` 는 문자열.
  - 수락: `curl -N` SSE 엔드포인트가 이벤트를 연속 출력.
  - 수락(고의 파손): 없는 venue로 요청 → 4xx. writer를 정지시킨 뒤 재조회 → `stale_ms` 가 증가하는 것을 관찰 후 재기동.
  - **판정 대기(U9 제목 문구)**: 제목의 "CH `FINAL` 읽기"는 §5.6("대시보드의 현재 오더북은 `FINAL` 경로를 타지 않는다")과 어긋나고, CH 기반 라우트·응답 형태가 어디에도 정의돼 있지 않으며 U9 수락 기준도 그것을 검증하지 않는다. 라우트를 정의하든지 문구가 스테일이든지 — 아키텍트 판정 대기(U9 자체는 Redis 경로로 종결).
- [x] **U16 — U6 잔여 3건 해소 (아키텍트 판정 반영, `fef8ef3`).** Kalshi venue 전체를 수신 시각으로 이관하되 `RECEIPT_TIME_UNTIL_U12()` 라는 명시적 이름 뒤에 두고 호출부에 규칙 5와 U12를 인용 — 예외가 실수처럼 보이지 않고 드러나게. Binance/Coinbase 무수정(규칙 5 준수 유지). 앱 로컬 registry를 TTL 축출·화이트리스트와 함께 복원하고 `kalshi-core/src/registry/` 는 `x_` 로 내림. 공개 WS 풀에서 인증 헤더 제거(서명 코드는 유지, 되돌림 가설을 제거 지점에 기록 — U12용). `BookEvent.seq` 를 `venueSeq`(갭 감지 전용)와 `emitSeq`(키 동일성 전용)로 분리, `venueSeq` 가 null이면 `(venue, ticker)` 당 1회 경고. 선행: U6
  - **판정 대기**: 복원된 registry의 화이트리스트를 `['active','initialized','inactive']` → `['open']` 로 바꿨다. 구 리터럴은 드롭된 ClickHouse 뷰의 어휘이지 Kalshi REST의 어휘가 아니라, 그대로 쓰면 `getActiveTickers()` 가 영원히 `[]` 를 반환한다. 확인 대기.
- [x] **U17 — mock 재생 루프 ↔ LWW 상쇄 해소 (U10 블로커 해제).** ① 재생기가 패스마다 `time_ms` 와 `seq` 를 함께 전진시킨다(낡은 타임스탬프를 그대로 도는 대신) — EXIT의 "두 venue 갱신"을 푼 것이 이것이다. ② mock 타임스탬프를 생성 시각에 앵커링. ③ U9의 500ms 무조건 SSE 재방송을 제거하고 변경 감지 복원(데이터는 얼었는데 스트림만 살아 보이던 상태 제거). 선행: U8, U9
- [x] **U10 — `apps/web` (Vite + React) 수집 대시보드 1화면.** venue 선택 + 오더북 + freshness + `feed` 배지. 선행: U9
  - **블로커 → 해소(U17①③, U19)**: mock 재생 루프와 U8의 LWW 가드가 상쇄된다. `.jsonl` 을 처음부터 다시 재생하면 2회차 이후 쓰기가 전부 stale로 거부되어 **Redis가 더는 변하지 않는다** — MVP1 EXIT는 두 venue 오더북이 화면에서 *갱신*될 것을 요구하는데 1회차 이후 아무것도 갱신되지 않는다. U9의 SSE가 500ms마다 현재 상태를 재방송해 **데이터는 얼어 있는데 스트림만 살아 보이는** 상태를 만든다.
  - **블로커 → 해소(U17②, U18의 서버 측 임계)**: `stale_ms` 가 약 366일로 나왔다 — 계산은 맞고 mock 타임스탬프가 2025-09-22다. U10이 freshness를 렌더해야 하므로 착수 전 결정 필요.
  - 수락: 브라우저에서 **kalshi와 polymarket mock 오더북이 둘 다 갱신**된다(Kalshi 하드코딩 불가 증명).
  - 수락: 77자리 Polymarket CLOB token id 티커가 레이아웃을 깨지 않고 렌더된다.
  - 수락(고의 파손): writer 정지 → freshness 표시가 눈에 띄게 stale로 바뀐다. 재기동 시 복구.
  - **UI 참조 (소유자, 2026-09-22)**: `/Users/tio/Documents/project_lopez_auto/apps/colony_client_web/app/globals.css` (125줄) 를 **직접 읽고** 따를 것 — 요약본 금지. 핵심은 Tailwind v4 `oklch` 토큰, 직각 모서리(`--radius: 0`), UI 전체 모노스페이스, 어두운 헤어라인 보더, **채도는 장식이 아니라 신호에만**.
  - 수락(UI): 화면에서 채도 있는 색이 신호(bid/ask, fresh/stale, mock/live 배지)에만 나타나고 나머지 크롬은 무채색. ticker/price/qty가 모노스페이스로 열 정렬된다(77자리 CLOB token id 포함).
  - 구현 메모(블로커 아님): 참조 프로젝트는 Next.js라 `next/font` 경로를 쓸 수 없다 — 토큰 CSS는 거의 그대로 이식되지만 모노 폰트 로딩은 Vite 방식으로 따로 배선해야 한다.
  - 블로커 아님: **Q6**(Vite vs Next.js) — Vite가 기본값이며 소유자 지시가 있을 때만 변경.

- [x] **U18 — 뷰 모델 단일화 + stale 임계 서버 이관 (`a3e2137`, 판정 `ff1d103`).** `OrderbookSnapshot` 을 `packages/schema/src/view/` 로 통합하고 **단방향 import 규칙**(와이어 계층은 `view/` 를 절대 import하지 않는다)을 세움. `kalshi-core` 의 동명 타입을 `KalshiWsOrderbook` 으로 개명. stale 임계를 클라이언트 하드코딩 상수에서 **서버 계산 공식** `max(3 × 관측 간격, 5000)` 으로 이관. 선행: U9, U10
- [x] **U19 — 재생 타이밍 드리프트 수정 (`ea65823`).** `setTimeout` 재무장 방식이 누적 드리프트를 만들어 **정상 동작 중인 writer가 스스로 stale 임계로 밀려가던** 문제 — EXIT를 막고 있었다. 절대 타임라인 스케줄링으로 교체. U17과 별개 단위. 선행: U17
- [x] **U15 — 로깅 정리 (MVP1 마지막).** `packages/env/src/kalshi.ts`, `packages/common/src/kafka.ts` 에 캐리오버된 raw `console.log` 가 남아 있어 목표 7번(구조화 로깅)이 end-to-end로 성립하지 않는다. producer 3종(U6 이식분)도 함께 훑는다. 선행: U6, U10
  - 수락: `apps/` + `packages/` 전역에서 `console.log|console.error` 검색 0건(logger 경유만).
  - 수락: 전 흐름 1회 기동 중 stdout의 모든 줄이 `jq .` 를 통과한다(파싱 실패 줄 0개).
  - **게이트 범위 확정 (`5647d7c`)**: **범위 = stdout이 텔레메트리로 소비되는 프로세스.** writer·api는 포함, Vite는 빌드 도구라 제외, `ch-migrate.sh`·seed·토픽 생성은 사람이 보는 콘솔 피드백인 1회성 셋업이라 제외. 자사/외부 여부는 판정에 들어가지 않는다. **제외는 유예이지 사면이 아니다** — 그 단계가 deploy/CI에서 **무인 실행되는 순간 범위에 들어온다**(출력이 피드백이 아니라 로그가 되는 시점).

**MVP1 종료 판정**: 위 20개가 전부 `[x]` 이고 Phase 표의 MVP1 EXIT CRITERION 시연이 1회 통과.
→ **2026-09-24 PASS** — 독립 reviewer가 시연을 직접 재현, 게이트 범위 확정(`5647d7c`)으로 마지막 미결까지 종결.

### MVP1 후속 정리 (MVP2 개시 전)

- [ ] **U20 — `packages/common` 배럴 분리.** `src/index.ts` 가 `kafka.ts` 를 재수출해 **모든** MVP1 프로세스가 import 시점에 librdkafka 바이너리를 매핑하고 `KAFKA_BOOTSTRAP` 을 로깅한다 — Kafka를 만질 일이 없는 `apps/api` 와 `apps/orderbook-writer` 까지. 기준: "Kafka 연결 0개"의 가장 강한 형태는 "connect를 부른 적 없다"가 아니라 **"연결 코드가 애초에 그 프로세스에 로드되지 않는다"** — **논증해야 성립하는 속성은 구조상 참인 속성보다 약하다.**
  - 수락: api/writer 프로세스에서 librdkafka가 로드되지 않음을 관찰(모듈 목록 또는 `lsof`/`vmmap` 수준 확인), 기동 로그에 `KAFKA_BOOTSTRAP` 0건, producer 3종은 정상 빌드.
- [ ] **U21 — `KAFKA_BOOTSTRAP ?? 'localhost:9092'` 기본값 제거.** 빈 `idempotency_key`, `ACTIVE_STATUSES` 불일치, 구 `toMs` 의 `Date.now()` fallback과 **같은 계열의 조용한 그럴듯한 대체**다. 선행: U20
  - 수락(양쪽 모두): import는 여전히 성공하고, `connect()` 가 throw 한다. **import 시점 throw는 수정이 아니라 회귀다.**
- [ ] **U22 — 튜플→객체 변환을 codec으로 이동.** `PROTO_DECODERS` 가 `[price, qty]` 튜플을 내는데 proto와 §3.5는 `{price, qty}` 다. 지금은 writer가 정확히 한 곳에서 되돌리고 있어, MVP3가 두 번째 소비자를 붙이는 순간 재발 지점이 된다.
  - 수락: writer에서 변환 코드 0건, codec 출력이 §3.5 형태 그대로, 기존 흐름 1회 기동이 동일 결과.
- [ ] **U23 — `x_*` 가 build/typecheck에서 실제로 제외되는지 검증.** soft-delete된 파일 2개가 이미 깨진 import를 들고 있다. 제외가 실제가 아니면 soft-delete 코드가 조용히 돌아와 빌드를 깬다. **확인할 것, 가정하지 말 것. 그리고 그 파일들 자체를 고치지 말 것.**
  - 수락: `pnpm build`/`typecheck` 가 `x_*` 를 읽지 않음을 관찰(고의 파손: `x_` 파일에 구문 오류를 넣어도 빌드가 통과하면 제외가 실제, 통과하지 못하면 제외 설정을 고친다) 후 원복.
- [ ] **U7c — mock을 고정 앵커로 재생성.** 선행: **U22 이후**(코덱 변경 전에 재생성하면 즉시 무효가 된다). 파일은 고정 상수 앵커, 재생은 런타임 재앵커 — U7b의 바이트 안정 기준을 **복원**한다.
  - 수락: 두 번 재생성해도 6개 `.jsonl` 이 바이트 동일. 재seed 후 동일 이벤트가 `FINAL` 에서 접힌다(§5 보증 회복).
  - 주의: 재seed는 **행 삭제가 아니라 로컬 dev ClickHouse 볼륨 재생성**으로 한다(hard-DELETE 금지).
- [ ] **U24 — `ch-migrate.sh` 가 JSON 1줄을 찍게 한다. 게이트 블로커 아님(권고).** 무인 실행되는 날 범위에 들어오므로, 예외를 기억하는 것보다 `printf` 한 줄이 싸다.
  - 수락: 실행 출력의 모든 줄이 `jq .` 통과.

---

## MVP2 tasks (MVP1 EXIT 이후에만 개시)

- [ ] **M1 — producer 심볼 상수를 env로 (§3.3).** 수락: 코드에 하드코딩 심볼 배열 0개, `.env` 값 변경만으로 구독 심볼이 바뀌는 것을 기동 로그로 관찰.
- [ ] **M2 — `002_kafka_engines.sql` 작성 + crypto 2개(`crypto_ticks_kafka`, `crypto_trades_kafka`)만 적용.** 수락: `SHOW TABLES` 에 `*_kafka` 2개 + MV 2개, 예측시장 kafka 테이블 0개. 컨슈머 설정에 `auto.offset.reset=latest` **필수**(권고 아님 — U5c의 키 결정이 이 값에 의존한다, §8 Q1-b). 수락: 설정값이 `latest` 임을 기동 로그/설정 파일에서 확인.
- [ ] **M3 — `prod-crypto-binance-ts` 실기동 (Oracle Kafka).** 수락: Phase 표 MVP2 EXIT CRITERION의 `SELECT DISTINCT symbol … WHERE venue='binance'` 관찰. 고의 파손: producer를 죽였다 살려 중복 유입 → `FINAL` 조회에서 중복 0.
- [ ] **M4 — `dr_cb: true` + 실패 건 error 로그 (§5.3-2).** 수락(고의 파손): `KAFKA_BOOTSTRAP` 을 잘못된 주소로 두고 기동 → 유실이 JSON error 로그로 남는 것을 관찰(현재는 무로그) 후 원복.
- [ ] **U11 — `_scripts/kafka-lag.sh` 신규.** 선행: M3(소비 컨슈머 그룹이 실제로 존재해야 출력할 lag이 있다). 수락: 실행 시 컨슈머 그룹명과 lag 수치가 출력된다.
- [ ] **U12 — 진단: 실 Kalshi `orderbook_delta` 원본 1건 캡처 (§8 Q4-b). 수정 금지.** 선행: U5
  - 수락: 캡처된 원본 JSON 파일 1건이 저장소에 존재하고, 어느 필드가 시퀀스를 담는지 결론이 `STATUS.md` 한 줄로 기록된다.
  - 수락: 캡처 전후 reconstructor 경로의 `git diff` 가 비어 있다(수정 금지 확인). 캡처 중 Kafka publish 0건.
  - **범위 확대 검토(판정 대기)**: 현재 `orderbook_delta` 만 명시하나 **ticker 채널도 캡처**가 필요하다 — U6가 남긴 규칙 5 예외(Kalshi tick/orderbook이 `Date.now()` 사용, trade는 미검증 `created_time`)가 이 캡처로만 해소된다.
  - 성격: 읽기 전용 1회 구독 → 1건 로그 → 종료. `KALSHI_API_KEY_ID`/`KALSHI_PRIVATE_KEY_PATH` 필요.
- [ ] **U13 — U12 결과에 따른 reconstructor 수정 (+ 필요시 세션 성분).** 선행: U12
  - **블로커: Q4 — Kalshi `seq` 가 재접속(구독) 단위로 리셋되는가?** U12 캡처 결과가 나오기 전에는 착수 금지. 리셋된다면 idempotency key에 세션 성분을 추가해야 한다(§4.4 인용문). **갱신**: U8의 합성 카운터도 producer 재시작 시 리셋되므로 재시작 간 충돌은 어느 경로에서도 남는다 — 세션 성분은 선택이 아니라 **MVP3 필수 선행**이며 U12/U13이 그 게이트다.
  - 수락: U12가 캡처한 실제 메시지를 reconstructor에 그대로 먹여 파싱된 seq가 원본 필드 값과 일치.
  - 수락(고의 파손): 같은 메시지의 seq를 +2 해서 먹이면 갭 감지 로그가 발생한다(현재는 발생하지 않는다 — 수정 전/후를 둘 다 관찰).

## MVP3 선행 게이트

- [ ] **U14 — `_scripts/create-pred-topics.sh` 작성 + Oracle 브로커에 `pred.*` 4개 생성 (§6).** 선행: U5. 작성과 실행을 나누지 않는다 — 실행이 곧 Kafka 연결이므로 MVP1/MVP2에서 닫을 수 없다.
  - 수락: `kafka-topics --list` 에 `pred.market.tick.ws`, `pred.trade.ws`, `pred.orderbook.ws`, `pred.orderbook_delta.ws` 4개 존재, 각각 `partitions=1 replication-factor=1`. 스크립트는 `--if-not-exists` 라 재실행해도 에러 없음.
  - 수락: 구 `kalshi.*` 토픽 29개가 그대로 남아 있음(삭제·개명 0건).
  - 부속(블로커 아님): **Q5** — 파티션/복제를 올릴 계획이 생기면 Kafka 메시지 키를 `idempotency_key` → `{venue}|{ticker}` 로 바꾸는 작업이 **선행**되어야 한다 (§4.4). 현 설계는 `1/1` 고정.

MVP3 본 과제(writer `kafkaSource` 교체, 나머지 kafka 엔진 4개, `prod-kalshi-ws-ts` 실기동,
Polymarket producer)는 U12·U13·U14가 닫힌 뒤에 이 문서에 추가한다 — 지금 열지 않는다.
