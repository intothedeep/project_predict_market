import type { MarketApi, GetMarketOrderbooksResponse } from 'kalshi-typescript';
import { log } from '@repo/common';

export async function getOrderbookBatch(
    api: MarketApi,
    tickers: string[]
): Promise<GetMarketOrderbooksResponse | null> {
    try {
        const res = await api.getMarketOrderbooks(tickers);
        return res.data;
    } catch (error) {
        log('warn', 'kalshi-rest', `getOrderbookBatch failed: ${error}`);
        return null;
    }
}
