import type { MarketApi, GetMarketOrderbookResponse } from 'kalshi-typescript';
import { log } from '@repo/common';

export async function getOrderbook(
    api: MarketApi,
    ticker: string,
    depth?: number
): Promise<GetMarketOrderbookResponse | null> {
    try {
        const res = await api.getMarketOrderbook(ticker, depth);
        return res.data;
    } catch (error) {
        log('warn', 'kalshi-rest', `getOrderbook failed for ${ticker}: ${error}`);
        return null;
    }
}
