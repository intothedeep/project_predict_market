import type {
    MarketApi,
    GetMarketCandlesticksResponse,
    GetMarketCandlesticksPeriodIntervalEnum,
} from 'kalshi-typescript';
import { log } from '@repo/common';

export interface GetCandlestickParams {
    seriesTicker: string;
    ticker: string;
    startTs: number;
    endTs: number;
    periodInterval: GetMarketCandlesticksPeriodIntervalEnum;
    includeLatestBeforeStart?: boolean;
}

export async function getCandlestick(
    api: MarketApi,
    params: GetCandlestickParams
): Promise<GetMarketCandlesticksResponse | null> {
    try {
        const res = await api.getMarketCandlesticks(
            params.seriesTicker,
            params.ticker,
            params.startTs,
            params.endTs,
            params.periodInterval,
            params.includeLatestBeforeStart
        );
        return res.data;
    } catch (error) {
        log('warn', 'kalshi-rest', `getCandlestick failed for ${params.ticker}: ${error}`);
        return null;
    }
}
