# project_market_predict

**BTC 데이터 파이프라인. MVP1([목업(mock)](#term-mock) 전용)은 2026-09-24에 EXIT PASS. MVP2는 아직 닫혀 있다.**

기준 날짜: 2026-09-25 (`STATUS.md` 마지막 줄)

## 1. 왜 만드나

- Kalshi와 Polymarket(예측시장)과 Binance와 Coinbase(현물)의 BTC 데이터를 모은다.
- 하나의 [계약(schema)](#term-schema) 위에서 수집, 저장, 표시한다.
- 계약 흐름은 proto, codec, ClickHouse DDL 순이다.
- MVP1이 증명하는 것: 실 파이프라인 코드 0줄로 `web → api → Redis/ClickHouse` 왕복이 돈다.
- 화면에 두 [거래소(venue)](#term-venue)의 [오더북(order book)](#term-orderbook)이 그려진다. 곧 [계약(schema)](#term-schema)과 흐름이 맞다.

주의: `PLAN.md`에는 mission block이 아직 없다. 위 내용은 `PLAN.md` Intent 절에서 옮겼다.

## 2. 구조

```text
 [MVP2~3]                                        [MVP1: mock 으로 대체]
 producer 3종 (실 WS) ──► Kafka(원격 Oracle)     mocks/*.jsonl ──┐
 kalshi / binance / coinbase      │                              │
                                  ▼  (MVP3)                      ▼
                          orderbook-writer  ◄── MOCK_SOURCE=1 (mockSource)
                                  │
                ┌─────────────────┴──────────────────┐
                ▼                                    ▼
          Redis (현재 상태)                  ClickHouse (이력)
          ob:{venue}:{ticker}                6 테이블, ReplacingMergeTree
                │                                    │
                └──────────────► api :3001 (Hono) ◄──┘  (CH 읽기는 미배선)
                                    │ SSE
                                    ▼
                              web :5173 (Vite + React)
```

| 부분 | MVP1 | 이후 |
| --- | --- | --- |
| [목업(mock)](#term-mock) 재생 → orderbook-writer → Redis | 실행 | MVP3에서 kafkaSource로 교체 |
| api → web ([서버 전송 이벤트(Server-Sent Events, SSE)](#term-sse)) | 실행 | 유지 |
| ClickHouse | seed와 마이그레이션만 | MVP2에서 Kafka 엔진 추가 |
| Kafka 연결 | 0개 | MVP2부터 |
| [생산자(producer)](#term-producer) 3종 | 빌드만, 기동 안 함 | Binance(MVP2), Kalshi(MVP3) |

## 3. 앱과 패키지

| 이름 | 역할 | 주요 패키지 | 실행 단계 |
| --- | --- | --- | --- |
| `apps/orderbook-writer` | 스냅샷을 Redis 현재 상태로 적재 | redis, zod | MVP1 ([목업(mock)](#term-mock)) |
| `apps/api` | [오더북(order book)](#term-orderbook) REST와 [서버 전송 이벤트(Server-Sent Events, SSE)](#term-sse) | hono, redis, zod | MVP1 |
| `apps/web` | 수집 대시보드 1화면 | react, vite | MVP1 |
| `apps/prod-crypto-binance-ts` | Binance BTC 틱, 체결 | ws | MVP2 |
| `apps/prod-kalshi-ws-ts` | Kalshi WS 수집 | kalshi-typescript, ws | MVP3 |
| `apps/prod-crypto-coinbase-ts` | Coinbase 틱, 체결 | ws | 미정 |
| `packages/schema` | [계약(schema)](#term-schema) 전 층: proto, codec, view | @bufbuild/protobuf | 전 단계 |
| `packages/db` | ClickHouse 마이그레이션, 라우팅 | common, schema | 전 단계 |
| `packages/common` | logger, 멱등 키, shutdown, kafka | @clickhouse/client, kafka-javascript | 전 단계 |
| `packages/kalshi-core` | Kalshi 클라이언트, 파싱 | kalshi-typescript | MVP3 |
| `packages/env` | 환경변수 검증 | zod, dotenv | 전 단계 |

[모노레포(monorepo)](#term-monorepo)는 pnpm workspace와 turbo를 쓴다. npm과 yarn은 쓰지 않는다. 언어는 TypeScript다.

## 4. MVP 경로

```text
  MVP1 shape  ──►  MVP2 one real slice  ──►  MVP3 core migrated
  mock 전용         Binance 실 1줄기           Kalshi 오더북 실전환
  [완료 PASS]       [닫힘, 미착수]              [선행 게이트 U12~U14 대기]
```

규칙: 앞 단계 [종료 기준(exit criteria)](#term-exit)이 닫히기 전에 다음 단계 과제를 열지 않는다.

| 단계 | 목표 | 종단 간 주기 (end-to-end cycle) | [종료 기준(exit criteria)](#term-exit) | 상태 |
| --- | --- | --- | --- | --- |
| MVP1 | [계약(schema)](#term-schema), 흐름, 테이블을 [목업(mock)](#term-mock)으로 증명 | `docker compose up`, `ch-migrate`, seed, `MOCK_SOURCE=1` writer, api, web | 브라우저 1화면에서 kalshi와 polymarket [목업(mock)](#term-mock) [오더북(order book)](#term-orderbook)이 둘 다 갱신. writer를 죽이면 [stale(freshness)](#term-stale) 표시. Kafka 연결 0개. 1회 기동 stdout 전 줄이 `jq .` 통과 | 완료 (2026-09-24 PASS) |
| MVP2 | Binance BTC 실 파이프라인 1줄기 | 실 binance [생산자(producer)](#term-producer) 기동, Kafka, ClickHouse | `crypto_ticks FINAL`의 binance symbol이 `MOCK_BTCUSDT`, `BTCUSDT` 2행. `proto/`와 `001_data_tables.sql` 변경 0줄. [목업(mock)](#term-mock) 행과 실 행이 `MOCK_` 접두어로 공존 | 미착수 (과제 M1~M4, U11 `[ ]`) |
| MVP3 | Kalshi [오더북(order book)](#term-orderbook) 경로 실전환 | writer가 `kafkaSource`로 실 티커 적재 | `pred_orderbook_ws` 행 수 == `uniqExact(idempotency_key)`. 이전한 경로의 [목업(mock)](#term-mock)만 폐기 | 미착수 (선행 U12~U14 `[ ]`) |

MVP3 본 과제(writer 교체, 나머지 kafka 엔진 4개, `prod-kalshi-ws-ts` 실기동, Polymarket [생산자(producer)](#term-producer))는 미정이다. 선행 게이트가 닫힌 뒤 `PLAN.md`에 추가한다.

## 5. 현재 상태

기준 날짜: 2026-09-25

- 현재 단계: MVP1 종료 후 정리까지 끝남. MVP2는 소유자 지시로 아직 닫혀 있다.
- 장시간 실행: 3시간 18분, writer 로그 54,107줄. rejected와 error 줄 0. `make health` 4개 단언 통과.

| 구분 | 과제 ID |
| --- | --- |
| 완료 (MVP1 본 과제 20개) | U1~U10, U3b, U5b, U5c, U7, U7b, U15~U19 |
| 완료 (후속 정리 9개) | U20~U27, U7c, U24 |
| 열림: MVP2 | M1, M2, M3, M4, U11 |
| 열림: MVP3 선행 게이트 | U12, U13, U14 |

- 다음: 소유자가 MVP2를 열면 M1부터 시작한다.
- 블로커 Q4: Kalshi `seq`가 재접속마다 리셋되는가. U12 캡처 전에는 U13 착수 금지.
- U12는 `KALSHI_API_KEY_ID`와 `KALSHI_PRIVATE_KEY_PATH`가 필요하다.
- M3, U14는 원격 Kafka(Oracle)에 접속해야 한다.
- 소유자 판단 대기: `main.bbl`이 이미 추적 중이다. untrack 여부는 소유자가 정한다.
- 책 `book_market_predict_trading/`은 별도 도메인이다. 04장(U12 대기)과 06장은 의도적 스켈레톤이다.

문서 간 불일치: 없음. 단, `STATUS.md` 첫 줄의 "총 18과제"는 이후 20개로 늘어난 과제 수를 반영하지 않은 옛 기록이다. `PLAN.md`의 20개가 현재값이다.

## 6. 빠른 시작 (로컬 데모, [목업(mock)](#term-mock) 데이터)

전체 안내: [tips/mvp1-local-check.tips.html](./tips/mvp1-local-check.tips.html)

1. 0단계, 최초 1회: Docker 런타임과 `.env`와 의존성을 준비한다.

   ```bash
   colima start --cpu 4 --memory 6
   cp infra/env.example .env    # CLICKHOUSE_PASSWORD 를 채운다 (필수)
   pnpm install
   ```

2. `make up`: ClickHouse와 Redis 컨테이너를 띄운다.
3. `make migrate`: 테이블을 만든다.
4. `make start`: [목업(mock)](#term-mock) writer와 api를 띄운다. 로그는 `./logs/*.jsonl`로 간다.
5. `pnpm --filter @repo/web dev`: 새 터미널에서 실행한다. `http://localhost:5173`을 연다.
6. `make health`: 단언 4개를 확인한다. 모두 통과하면 exit 0이다.
7. `make stop`: writer와 api를 끈다.
8. `make down`: 컨테이너를 내린다.

**경고: `make down -v`를 쓰지 않는다.** 볼륨이 지워져 ClickHouse 데이터가 사라진다. 초기화는 소유자가 정한다.

jq가 있어야 한다 (`make migrate`, `make health`).

## 7. 저장소 구조

```text
apps/       api, orderbook-writer, web, prod-* producer 3종
packages/   schema, db, common, kalshi-core, env
mocks/      mock 데이터 전용 (*.mock.jsonl 6개, seed-clickhouse.sql)
infra/      docker-compose.dev.yml (clickhouse + redis), clickhouse/custom.xml
_scripts/   ch-migrate.sh, health-check.sh, kafka-lag.sh
logs/       고정 로그 목적지 (gitignore)
tips/       로컬 확인 안내 페이지
book_market_predict_trading/   LaTeX 학습서 (별도 도메인)
PLAN.md  STATUS.md  00.architecture.mvp1.md
```

## 8. 문서 링크

| 문서 | 내용 |
| --- | --- |
| [PLAN.md](./PLAN.md) | 단계, 과제, 수락 기준 |
| [STATUS.md](./STATUS.md) | 진행 로그 |
| [00.architecture.mvp1.md](./00.architecture.mvp1.md) | 설계 원본 |
| [tips/](./tips/README.md) | 로컬 확인 안내 |

## 용어 부록

- <a id="term-schema"></a>**계약(스키마, schema)**: 데이터 모양의 약속. 이 저장소는 proto, codec, ClickHouse DDL이 한 계약을 이룬다.
- <a id="term-orderbook"></a>**오더북(order book)**: 사자 주문(bids)과 팔자 주문(asks)을 가격순으로 쌓은 호가창.
- <a id="term-exit"></a>**종료 기준(exit criteria)**: 단계가 끝났다고 말하려면 실행해서 보여야 하는 시연.
- <a id="term-mock"></a>**목업(mock)**: 실제 연결 없이 흐름을 확인하려고 만든 가짜 데이터.
- <a id="term-venue"></a>**거래소(venue)**: 데이터를 내는 곳. kalshi, polymarket, binance, coinbase 네 가지다.
- <a id="term-producer"></a>**생산자(producer)**: 거래소 WebSocket을 읽어 Kafka로 보내는 앱.
- <a id="term-sse"></a>**서버 전송 이벤트(Server-Sent Events, SSE)**: 서버가 브라우저로 갱신을 계속 보내는 단방향 연결.
- <a id="term-stale"></a>**신선도(freshness)와 stale**: 데이터가 얼마나 최근인가. 임계를 넘으면 stale로 표시한다.
- <a id="term-monorepo"></a>**모노레포(monorepo)**: 앱과 패키지를 한 저장소에 두는 구조.
