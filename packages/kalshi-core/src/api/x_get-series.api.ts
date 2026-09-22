import type { MarketApi, GetSeriesResponse } from 'kalshi-typescript';
import { log } from '@repo/common';

export async function getSeries(
    api: MarketApi,
    ticker: string,
    includeVolume?: boolean
): Promise<GetSeriesResponse | null> {
    try {
        const res = await api.getSeries(ticker, includeVolume);
        return res.data;
    } catch (error) {
        log('warn', 'kalshi-rest', `getSeries failed for ${ticker}: ${error}`);
        return null;
    }
}
