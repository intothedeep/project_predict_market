import type {
    MarketApi,
    GetMarketsResponse,
    GetMarketsStatusEnum,
} from 'kalshi-typescript';
import { log } from '@repo/common';

export interface GetMarketBatchParams {
    limit?: number;
    cursor?: string;
    eventTicker?: string;
    seriesTicker?: string;
    minUpdatedTs?: number;
    maxCloseTs?: number;
    minCloseTs?: number;
    minSettledTs?: number;
    maxSettledTs?: number;
    status?: GetMarketsStatusEnum;
    tickers?: string;
}

export async function getMarketBatch(
    api: MarketApi,
    params: GetMarketBatchParams = {}
): Promise<GetMarketsResponse | null> {
    try {
        const res = await api.getMarkets(
            params.limit ?? 200,
            params.cursor,
            params.eventTicker,
            params.seriesTicker,
            undefined,
            undefined,
            params.minUpdatedTs,
            params.maxCloseTs,
            params.minCloseTs,
            params.minSettledTs,
            params.maxSettledTs,
            params.status,
            params.tickers,
            undefined
        );
        return res.data;
    } catch (error) {
        log('warn', 'kalshi.market.api', `getMarketBatch failed: ${error}`);
        return null;
    }
}
