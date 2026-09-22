import crypto from 'node:crypto';
import fs from 'node:fs';
import {
    createReconnectingWS,
    kalshiOrderbookKey,
    kalshiTickKey,
    kalshiTradeKey,
    log,
} from '@repo/common';
import { routePublish } from '@repo/db';

const OTHER_DOMAIN: Record<'weather' | 'crypto', string> = {
    weather: 'CRYPTO',
    crypto: 'WEATHER',
};

// Disambiguates ticks landing in the same millisecond (see kalshiTickKey).
let tickSeq = 0;

type BookLevel = [number, number];

interface MarketResponse {
    markets?: KalshiMarket[];
    cursor?: string;
}

export interface KalshiStreamRuntimeConfig {
    wsUrl: string;
    apiBase: string;
    apiKeyId: string;
    pemPath: string;
    source: string;
    shardSize: number;
    refreshMs: number;
    minVolume: number;
    minOpenInterest: number;
    minBestDepth: number;
    minMinutesToClose: number;
    maxMinutesToClose: number;
    maxMarkets: number;
}

export interface KalshiStreamConfig {
    domain: 'weather' | 'crypto';
    streamName: string;
    logPrefix: string;
    seriesTickers: string[];
    runtime: KalshiStreamRuntimeConfig;
}

interface KalshiMarket {
    ticker?: string;
    title?: string;
    status?: string;
    series_ticker?: string;
    updated_time?: string;
    yes_bid_dollars?: number | string;
    yes_ask_dollars?: number | string;
    no_bid_dollars?: number | string;
    no_ask_dollars?: number | string;
    last_price_dollars?: number | string;
    volume_fp?: number | string;
    open_interest_fp?: number | string;
    yes_bid_size_fp?: number | string;
    yes_ask_size_fp?: number | string;
    close_time?: string;
    expiration_time?: string;
}

interface MarketMeta {
    series: string;
    ticker: string;
    title?: string;
    status?: string;
    updatedTime?: string;
    updatedTimeMs?: number;
    closeTime?: string;
    yesBid?: number;
    yesAsk?: number;
    noBid?: number;
    noAsk?: number;
    lastPrice?: number;
    volume?: number;
    openInterest?: number;
    yesBidSize?: number;
    yesAskSize?: number;
}

interface BookState {
    bids: Map<number, number>;
    asks: Map<number, number>;
    lastSeq?: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function toNumber(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}

function toTimeMs(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 1_000_000_000_000 ? value : value * 1_000;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function getSelectedSeries(
    domain: 'weather' | 'crypto',
    seriesTickers: string[],
    source: string
): string[] {
    const target = source.toUpperCase();
    if (target === 'ALL' || target === domain.toUpperCase()) {
        return seriesTickers;
    }
    if (target === OTHER_DOMAIN[domain]) {
        return [];
    }
    return seriesTickers.filter((series) => series.includes(target));
}

async function fetchJson(url: string): Promise<MarketResponse | null> {
    try {
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15_000),
        });
        if (res.status === 429) {
            log('warn', 'kalshi-rest', `rate limited: ${url}`);
            return null;
        }
        if (!res.ok) {
            log('warn', 'kalshi-rest', `HTTP ${res.status}: ${url}`);
            return null;
        }
        return (await res.json()) as MarketResponse;
    } catch (error) {
        log('warn', 'kalshi-rest', `fetch failed: ${error}`);
        return null;
    }
}

function minutesToClose(market: KalshiMarket): number | undefined {
    const closeMs = toTimeMs(market.close_time ?? market.expiration_time);
    if (closeMs == null) return undefined;
    return Math.floor((closeMs - Date.now()) / 60_000);
}

function marketLiquidity(market: KalshiMarket): number {
    const yesBidSize = toNumber(market.yes_bid_size_fp) ?? 0;
    const yesAskSize = toNumber(market.yes_ask_size_fp) ?? 0;
    return Math.max(yesBidSize, yesAskSize);
}

function toMarketMeta(
    market: KalshiMarket,
    fallbackSeries: string
): MarketMeta | null {
    if (!market.ticker) return null;
    return {
        series: market.series_ticker ?? fallbackSeries,
        ticker: market.ticker,
        title: market.title,
        status: market.status,
        updatedTime: market.updated_time,
        updatedTimeMs: toTimeMs(market.updated_time),
        closeTime: market.close_time ?? market.expiration_time,
        yesBid: toNumber(market.yes_bid_dollars),
        yesAsk: toNumber(market.yes_ask_dollars),
        noBid: toNumber(market.no_bid_dollars),
        noAsk: toNumber(market.no_ask_dollars),
        lastPrice: toNumber(market.last_price_dollars),
        volume: toNumber(market.volume_fp),
        openInterest: toNumber(market.open_interest_fp),
        yesBidSize: toNumber(market.yes_bid_size_fp),
        yesAskSize: toNumber(market.yes_ask_size_fp),
    };
}

function passesFilters(
    market: KalshiMarket,
    thresholds: {
        minVolume: number;
        minOpenInterest: number;
        minBestDepth: number;
        minMinutesToClose: number;
        maxMinutesToClose: number;
    }
): boolean {
    if (market.status && market.status !== 'open') {
        return false;
    }

    const volume = toNumber(market.volume_fp) ?? 0;
    const openInterest = toNumber(market.open_interest_fp) ?? 0;
    const bestDepth = marketLiquidity(market);
    const minutes = minutesToClose(market);

    if (volume < thresholds.minVolume) return false;
    if (openInterest < thresholds.minOpenInterest) return false;
    if (bestDepth < thresholds.minBestDepth) return false;
    if (
        thresholds.minMinutesToClose > 0 &&
        minutes != null &&
        minutes < thresholds.minMinutesToClose
    ) {
        return false;
    }
    if (
        thresholds.maxMinutesToClose > 0 &&
        minutes != null &&
        minutes > thresholds.maxMinutesToClose
    ) {
        return false;
    }

    return true;
}

async function fetchOpenMarkets(
    seriesTickers: string[],
    apiBase: string,
    thresholds: {
        minVolume: number;
        minOpenInterest: number;
        minBestDepth: number;
        minMinutesToClose: number;
        maxMinutesToClose: number;
    },
    maxMarkets: number
): Promise<MarketMeta[]> {
    const markets: MarketMeta[] = [];

    for (const seriesTicker of seriesTickers) {
        let cursor: string | undefined;

        while (true) {
            const params = new URLSearchParams({
                series_ticker: seriesTicker,
                status: 'open',
                limit: '200',
            });
            if (cursor) params.set('cursor', cursor);

            const data = await fetchJson(`${apiBase}/markets?${params}`);
            if (!data?.markets?.length) break;

            for (const market of data.markets) {
                if (!passesFilters(market, thresholds)) continue;
                const meta = toMarketMeta(market, seriesTicker);
                if (!meta) continue;
                markets.push(meta);
            }

            cursor = data.cursor;
            if (!cursor) break;
        }
    }

    markets.sort((a, b) => {
        const aDepth = Math.max(a.yesBidSize ?? 0, a.yesAskSize ?? 0);
        const bDepth = Math.max(b.yesBidSize ?? 0, b.yesAskSize ?? 0);
        if (bDepth !== aDepth) return bDepth - aDepth;
        if ((b.openInterest ?? 0) !== (a.openInterest ?? 0)) {
            return (b.openInterest ?? 0) - (a.openInterest ?? 0);
        }
        return (b.volume ?? 0) - (a.volume ?? 0);
    });

    if (maxMarkets > 0) {
        return markets.slice(0, maxMarkets);
    }

    return markets;
}

function toPriceLevels(levels: unknown): BookLevel[] {
    if (!Array.isArray(levels)) return [];
    return levels
        .map((level) =>
            Array.isArray(level)
                ? [toNumber(level[0]) ?? 0, toNumber(level[1]) ?? 0]
                : null
        )
        .filter((level): level is BookLevel => level != null);
}

function sortLevels(levels: BookLevel[], side: 'bids' | 'asks'): BookLevel[] {
    return [...levels].sort((a, b) =>
        side === 'bids' ? b[0] - a[0] : a[0] - b[0]
    );
}

function bookToLevels(
    map: Map<number, number>,
    side: 'bids' | 'asks'
): BookLevel[] {
    const levels = Array.from(map.entries())
        .filter(([, size]) => size > 0)
        .map(([price, size]) => [price, size] as BookLevel);
    return sortLevels(levels, side);
}

function applyLevels(target: Map<number, number>, levels: BookLevel[]) {
    for (const [price, size] of levels) {
        if (size <= 0) target.delete(price);
        else target.set(price, size);
    }
}

function publishOrderbook(ticker: string, state: BookState) {
    routePublish(
        'kalshi.orderbook',
        kalshiOrderbookKey('live_ws', ticker, state.lastSeq ?? 'snapshot'),
        {
            ticker,
            bids: bookToLevels(state.bids, 'bids').map(([price, size]) => ({
                price,
                size,
            })),
            asks: bookToLevels(state.asks, 'asks').map(([price, size]) => ({
                price,
                size,
            })),
            seq: state.lastSeq,
            type: 'snapshot',
        }
    );
}

function publishTrade(ticker: string, msg: Record<string, unknown>) {
    routePublish(
        'kalshi.trades',
        kalshiTradeKey(
            'live_ws',
            ticker,
            String(msg.trade_id ?? msg.created_time ?? Date.now())
        ),
        {
            ticker,
            tradeId: msg.trade_id,
            yesPrice: toNumber(msg.yes_price),
            noPrice: toNumber(msg.no_price),
            count: toNumber(msg.count),
            takerSide:
                typeof msg.taker_side === 'string' ? msg.taker_side : undefined,
            createdTime: msg.created_time,
            source: 'live_ws',
        }
    );
}

function handleOrderbookMessage(
    ticker: string,
    msg: Record<string, unknown>,
    state: BookState,
    reconnect: () => void,
    logPrefix: string
) {
    const type = typeof msg.type === 'string' ? msg.type : '';
    const seq = toNumber(msg.seq);

    if (type === 'orderbook_snapshot') {
        state.bids.clear();
        state.asks.clear();
        applyLevels(state.bids, toPriceLevels(msg.bids));
        applyLevels(state.asks, toPriceLevels(msg.asks));
        state.lastSeq = seq;
        publishOrderbook(ticker, state);
        return;
    }

    if (type !== 'orderbook_delta') return;

    if (seq != null && state.lastSeq != null && seq !== state.lastSeq + 1) {
        log(
            'warn',
            logPrefix,
            `seq gap for ${ticker}: expected ${state.lastSeq + 1}, got ${seq}`
        );
        reconnect();
        return;
    }

    applyLevels(state.bids, toPriceLevels(msg.bids));
    applyLevels(state.asks, toPriceLevels(msg.asks));
    state.lastSeq = seq ?? state.lastSeq;
    publishOrderbook(ticker, state);
}

export async function startKalshiStream(
    cfg: KalshiStreamConfig
): Promise<{ stop: () => void }> {
    const {
        wsUrl,
        apiBase,
        apiKeyId,
        pemPath,
        source,
        shardSize,
        refreshMs,
        minVolume,
        minOpenInterest,
        minBestDepth,
        minMinutesToClose,
        maxMinutesToClose,
        maxMarkets,
    } = cfg.runtime;

    if (!apiKeyId || !pemPath || !fs.existsSync(pemPath)) {
        throw new Error(
            'KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY_PATH are required'
        );
    }

    const pk = crypto.createPrivateKey(fs.readFileSync(pemPath, 'utf8'));
    const selectedSeries = getSelectedSeries(
        cfg.domain,
        cfg.seriesTickers,
        source
    );
    if (selectedSeries.length === 0) {
        log('warn', cfg.logPrefix, 'no selected series for current SOURCE');
        return { stop: () => undefined };
    }

    const createSignReq = (apiKey: string) => (method: string, path: string) => {
        const ts = Date.now().toString();
        const sig = crypto.sign('sha256', Buffer.from(`${ts}${method}${path}`), {
            key: pk,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        });

        return {
            'KALSHI-ACCESS-KEY': apiKey,
            'KALSHI-ACCESS-SIGNATURE': sig.toString('base64'),
            'KALSHI-ACCESS-TIMESTAMP': ts,
        };
    };

    const signReq = createSignReq(apiKeyId);

    let stopped = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let sockets: Array<{ stop: () => void }> = [];
    let activeTickers = new Set<string>();
    const books = new Map<string, BookState>();

    const stopSockets = () => {
        for (const ws of sockets) ws.stop();
        sockets = [];
    };

    const subscribe = (marketTickers: string[]) => {
        stopSockets();
        books.clear();

        const shardLists = chunk(marketTickers, shardSize);
        sockets = shardLists.map((tickers, index) =>
            createReconnectingWS({
                url: wsUrl,
                name: `${cfg.streamName}-${index + 1}`,
                headers: signReq('GET', '/trade-api/ws/v2'),
                onOpen: (ws) => {
                    ws.send(
                        JSON.stringify({
                            id: index + 1,
                            cmd: 'subscribe',
                            params: {
                                channels: [
                                    'ticker',
                                    'trade',
                                    'orderbook_delta',
                                ],
                                market_tickers: tickers,
                            },
                        })
                    );
                },
                onMessage: (raw, { reconnect }) => {
                    const msg = JSON.parse(raw) as Record<string, unknown>;
                    const ticker =
                        typeof msg.market_ticker === 'string'
                            ? msg.market_ticker
                            : typeof msg.ticker === 'string'
                              ? msg.ticker
                              : undefined;
                    if (!ticker || !activeTickers.has(ticker)) return;

                    const channel =
                        typeof msg.channel === 'string' ? msg.channel : '';

                    if (channel === 'ticker') {
                        routePublish(
                            'kalshi.ticks',
                            kalshiTickKey('live_ws', ticker, Date.now(), tickSeq++),
                            {
                                ticker,
                                yesBid: toNumber(msg.yes_bid),
                                yesAsk: toNumber(msg.yes_ask),
                                noBid: toNumber(msg.no_bid),
                                noAsk: toNumber(msg.no_ask),
                                lastPrice: toNumber(msg.last_price),
                                volume: toNumber(msg.volume),
                                openInterest: toNumber(msg.open_interest),
                                yesBidSize: toNumber(msg.yes_bid_size),
                                yesAskSize: toNumber(msg.yes_ask_size),
                                source: 'live_ws',
                            }
                        );
                        return;
                    }

                    if (channel === 'trade') {
                        publishTrade(ticker, msg);
                        return;
                    }

                    if (channel === 'orderbook_delta') {
                        const state =
                            books.get(ticker) ??
                            (() => {
                                const nextState: BookState = {
                                    bids: new Map<number, number>(),
                                    asks: new Map<number, number>(),
                                };
                                books.set(ticker, nextState);
                                return nextState;
                            })();

                        handleOrderbookMessage(
                            ticker,
                            msg,
                            state,
                            reconnect,
                            cfg.logPrefix
                        );
                    }
                },
            })
        );
    };

    const refresh = async () => {
        if (stopped) return;

        const markets = await fetchOpenMarkets(selectedSeries, apiBase, {
            minVolume,
            minOpenInterest,
            minBestDepth,
            minMinutesToClose,
            maxMinutesToClose,
        }, maxMarkets);
        const nextTickers = new Set(markets.map((market) => market.ticker));
        const changed =
            nextTickers.size !== activeTickers.size ||
            [...nextTickers].some((ticker) => !activeTickers.has(ticker));

        if (changed) {
            activeTickers = nextTickers;
            subscribe(markets.map((market) => market.ticker));
            log(
                'info',
                cfg.logPrefix,
                `subscribed ${markets.length} markets across ${Math.max(
                    1,
                    Math.ceil(markets.length / shardSize)
                )} shards`
            );
        }

        refreshTimer = setTimeout(() => {
            void refresh();
        }, refreshMs);
    };

    await refresh();

    return {
        stop: () => {
            stopped = true;
            if (refreshTimer) clearTimeout(refreshTimer);
            stopSockets();
        },
    };
}
