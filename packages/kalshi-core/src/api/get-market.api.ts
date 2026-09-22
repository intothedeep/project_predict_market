import type { MarketApi, GetMarketResponse } from 'kalshi-typescript';
import { log } from '@repo/common';

export async function getMarket(
    api: MarketApi,
    ticker: string
): Promise<GetMarketResponse | null> {
    try {
        const res = await api.getMarket(ticker);
        return res.data;
    } catch (error) {
        log('warn', 'kalshi-rest', `getMarket failed for ${ticker}: ${error}`);
        return null;
    }
}
