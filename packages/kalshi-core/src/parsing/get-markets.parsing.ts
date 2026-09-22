import type { MarketMeta } from '../types';

interface RawMarketItem {
    ticker?: unknown;
    series_ticker?: unknown;
    title?: unknown;
    status?: unknown;
    created_time?: unknown;
    updated_time?: unknown;
    close_time?: unknown;
    expiration_time?: unknown;
    settlement_ts?: unknown;
    yes_bid_dollars?: unknown;
    yes_ask_dollars?: unknown;
    no_bid_dollars?: unknown;
    no_ask_dollars?: unknown;
    no_bid_size?: unknown;
    no_ask_size?: unknown;
    last_price_dollars?: unknown;
    last_trade_price?: unknown;
    last_trade_size?: unknown;
    last_trade_ts?: unknown;
    volume_fp?: unknown;
    open_interest_fp?: unknown;
    liquidity_dollars?: unknown;
    yes_bid_size_fp?: unknown;
    yes_ask_size_fp?: unknown;
    can_close_early?: unknown;
    event_ticker?: string;
    strike_type?: string;
    floor_strike?: number;
    cap_strike?: number;
    market_type?: string;
    open_time?: string;
    expected_expiration_time?: string;
    volume_24h_fp?: string;
    settlement_timer_seconds?: number;
    result?: string;
    settlement_value_dollars?: unknown;
    expiration_value?: string;
    tick_size?: unknown;
    response_price_units?: unknown;
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

function minutesToClose(market: Record<string, unknown>): number | undefined {
    const closeMs = toTimeMs(market.close_time ?? market.expiration_time);
    if (closeMs == null) return undefined;
    return Math.floor((closeMs - Date.now()) / 60_000);
}

function marketLiquidity(market: Record<string, unknown>): number {
    return Math.max(
        toNumber(market.yes_bid_size_fp) ?? 0,
        toNumber(market.yes_ask_size_fp) ?? 0
    );
}

function passesFilters(
    market: Record<string, unknown>,
    minVolume: number,
    minOpenInterest: number,
    minBestDepth: number,
    minMinutesToClose: number,
    maxMinutesToClose: number
): boolean {
    if (market.status && market.status !== 'open') return false;
    if ((toNumber(market.volume_fp) ?? 0) < minVolume) return false;
    if ((toNumber(market.open_interest_fp) ?? 0) < minOpenInterest)
        return false;
    if (marketLiquidity(market) < minBestDepth) return false;
    const minutes = minutesToClose(market);
    if (minMinutesToClose > 0 && minutes != null && minutes < minMinutesToClose)
        return false;
    if (maxMinutesToClose > 0 && minutes != null && minutes > maxMinutesToClose)
        return false;
    return true;
}

export function parseMarket(
    raw: unknown,
    fallbackSeries?: string
): MarketMeta | null {
    if (raw == null || typeof raw !== 'object') {
        return null;
    }

    const m = raw as RawMarketItem & Record<string, unknown>;

    if (typeof m.ticker !== 'string') {
        return null;
    }

    let series = '';
    if (fallbackSeries) {
        series = fallbackSeries;
    } else if (typeof m.series_ticker === 'string') {
        series = m.series_ticker;
    } else {
        series = m.event_ticker?.split('-')[0] ?? '';
    }

    return {
        series,
        ticker: m.ticker,
        title: typeof m.title === 'string' ? m.title : undefined,
        status: typeof m.status === 'string' ? m.status : undefined,
        createdTime: toTimeMs(m.created_time),
        updatedTime: toTimeMs(m.updated_time),
        updatedTimeMs: toTimeMs(m.updated_time),
        closeTime: toTimeMs(m.close_time ?? m.expiration_time),
        expirationTime: toTimeMs(m.expiration_time),
        settlementTs: toTimeMs(m.settlement_ts),
        yesBid: m.yes_bid_dollars != null ? String(m.yes_bid_dollars) : undefined,
        yesAsk: m.yes_ask_dollars != null ? String(m.yes_ask_dollars) : undefined,
        noBid: m.no_bid_dollars != null ? String(m.no_bid_dollars) : undefined,
        noAsk: m.no_ask_dollars != null ? String(m.no_ask_dollars) : undefined,
        noBidSize: m.no_bid_size != null ? String(m.no_bid_size) : undefined,
        noAskSize: m.no_ask_size != null ? String(m.no_ask_size) : undefined,
        lastPrice: m.last_price_dollars != null ? String(m.last_price_dollars) : undefined,
        lastTradePrice: m.last_trade_price != null ? String(m.last_trade_price) : undefined,
        lastTradeSize: m.last_trade_size != null ? String(m.last_trade_size) : undefined,
        lastTradeTs: toTimeMs(m.last_trade_ts),
        volume: m.volume_fp != null ? String(m.volume_fp) : undefined,
        openInterest: m.open_interest_fp != null ? String(m.open_interest_fp) : undefined,
        yesBidSize: m.yes_bid_size_fp != null ? String(m.yes_bid_size_fp) : undefined,
        yesAskSize: m.yes_ask_size_fp != null ? String(m.yes_ask_size_fp) : undefined,
        liquidity: m.liquidity_dollars != null ? String(m.liquidity_dollars) : undefined,
        eventTicker:
            typeof m.event_ticker === 'string' ? m.event_ticker : undefined,
        strikeType:
            typeof m.strike_type === 'string' ? m.strike_type : undefined,
        floorStrike: m.floor_strike != null ? String(m.floor_strike) : undefined,
        capStrike: m.cap_strike != null ? String(m.cap_strike) : undefined,
        marketType:
            typeof m.market_type === 'string' ? m.market_type : undefined,
        canCloseEarly: Boolean(m.can_close_early),
        openTime: toTimeMs(m.open_time),
        expectedExpirationTime: toTimeMs(m.expected_expiration_time),
        volume24h: m.volume_24h_fp != null ? String(m.volume_24h_fp) : undefined,
        settlementTimerSeconds:
            typeof m.settlement_timer_seconds === 'number'
                ? m.settlement_timer_seconds
                : undefined,
        result: typeof m.result === 'string' ? m.result : undefined,
        settlementValue: m.settlement_value_dollars != null ? String(m.settlement_value_dollars) : undefined,
        expirationValue: m.expiration_value,
        tickSize: m.tick_size != null ? String(m.tick_size) : undefined,
        responsePriceUnits:
            typeof m.response_price_units === 'string'
                ? m.response_price_units
                : undefined,
    };
}

export interface ParseMarketsOptions {
    minVolume?: number;
    minOpenInterest?: number;
    minBestDepth?: number;
    minMinutesToClose?: number;
    maxMinutesToClose?: number;
    maxMarkets?: number;
}

export function parseMarkets(
    rawList: unknown[],
    fallbackSeries: string,
    opts: ParseMarketsOptions = {}
): MarketMeta[] {
    const {
        minVolume = 0,
        minOpenInterest = 0,
        minBestDepth = 0,
        minMinutesToClose = 0,
        maxMinutesToClose = 0,
        maxMarkets = 0,
    } = opts;

    const markets: MarketMeta[] = [];
    for (const raw of rawList) {
        if (raw == null || typeof raw !== 'object') continue;
        const m = raw as Record<string, unknown>;
        if (
            !passesFilters(
                m,
                minVolume,
                minOpenInterest,
                minBestDepth,
                minMinutesToClose,
                maxMinutesToClose
            )
        )
            continue;
        const meta = parseMarket(m, fallbackSeries);
        if (meta) markets.push(meta);
    }

    const numOr0 = (s: string | undefined): number => {
        if (s == null) return 0;
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    };

    markets.sort((a, b) => {
        const aDepth = Math.max(numOr0(a.yesBidSize), numOr0(a.yesAskSize));
        const bDepth = Math.max(numOr0(b.yesBidSize), numOr0(b.yesAskSize));
        if (bDepth !== aDepth) return bDepth - aDepth;
        const aOI = numOr0(a.openInterest);
        const bOI = numOr0(b.openInterest);
        if (bOI !== aOI) return bOI - aOI;
        return numOr0(b.volume) - numOr0(a.volume);
    });

    return maxMarkets > 0 ? markets.slice(0, maxMarkets) : markets;
}
