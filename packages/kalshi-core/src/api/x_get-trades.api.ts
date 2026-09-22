import type { MarketApi, GetTradesResponse } from 'kalshi-typescript';
import { log } from '@repo/common';

export interface GetTradesParams {
    ticker?: string;
    limit?: number;
    cursor?: string;
    minTs?: number; // milliseconds — converted to seconds before sending
    maxTs?: number; // milliseconds — converted to seconds before sending
}

export async function getTrades(
    api: MarketApi,
    params: GetTradesParams = {}
): Promise<GetTradesResponse | null> {
    // cursor encodes position within a result set — min/max ts must not be combined with it

    let minTsSec: number | undefined = undefined;
    let maxTsSec: number | undefined = undefined;

    if (!params.cursor) {
        if (!params.minTs) {
            minTsSec = params.minTs;
        }
        if (!params.maxTs) {
            maxTsSec = params.maxTs;
        }
    }

    try {
        const res = await api.getTrades(
            params.limit,
            params.cursor,
            params.ticker,
            minTsSec,
            maxTsSec
        );
        return res.data;
    } catch (error) {
        log('warn', 'kalshi.trade.api', `getTrades failed: ${error}`);
        return null;
    }
}
