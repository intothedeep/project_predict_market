import { toNumber } from '@repo/common';
import type { CandlestickPayload } from '../types';

function strField(obj: unknown, key: string): string | undefined {
    if (obj == null || typeof obj !== 'object') return undefined;
    const v = (obj as Record<string, unknown>)[key];
    return v != null ? String(v) : undefined;
}

export function parseCandlestick(
    raw: unknown,
    ticker: string,
    series: string,
    periodInterval: number
): CandlestickPayload | null {
    if (raw == null || typeof raw !== 'object') return null;
    const bar = raw as Record<string, unknown>;

    const endPeriodTs = toNumber(bar.end_period_ts);
    if (endPeriodTs == null) return null;

    // API returns seconds; downstream expects ms.
    const parsedEndPeriodTs =
        endPeriodTs > 1_000_000_000_000 ? endPeriodTs : endPeriodTs * 1_000;

    return {
        endPeriodTs: parsedEndPeriodTs,
        ticker,
        series,
        periodInterval,
        priceOpen: strField(bar.price, 'open_dollars'),
        priceClose: strField(bar.price, 'close_dollars'),
        priceHigh: strField(bar.price, 'high_dollars'),
        priceLow: strField(bar.price, 'low_dollars'),
        priceMean: strField(bar.price, 'mean_dollars'),
        pricePrevious: strField(bar.price, 'previous_dollars'),
        volume: bar.volume_fp != null ? String(bar.volume_fp) : undefined,
        openInterest: bar.open_interest_fp != null ? String(bar.open_interest_fp) : undefined,
        yesBidClose: strField(bar.yes_bid, 'close_dollars'),
        yesBidOpen: strField(bar.yes_bid, 'open_dollars'),
        yesBidHigh: strField(bar.yes_bid, 'high_dollars'),
        yesBidLow: strField(bar.yes_bid, 'low_dollars'),
        yesBidMean: strField(bar.yes_bid, 'mean_dollars'),
        yesAskClose: strField(bar.yes_ask, 'close_dollars'),
        yesAskOpen: strField(bar.yes_ask, 'open_dollars'),
        yesAskHigh: strField(bar.yes_ask, 'high_dollars'),
        yesAskLow: strField(bar.yes_ask, 'low_dollars'),
        yesAskMean: strField(bar.yes_ask, 'mean_dollars'),
    };
}
