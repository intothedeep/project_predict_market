import type { MarketApi, GetSeriesListResponse } from 'kalshi-typescript';
import { log } from '@repo/common';

export interface GetSeriesBatchParams {
    category?: string;
    tags?: string;
    includeProductMetadata?: boolean;
    includeVolume?: boolean;
    minUpdatedTs?: number;
}

export async function getSeriesBatch(
    api: MarketApi,
    params: GetSeriesBatchParams = {}
): Promise<GetSeriesListResponse | null> {
    try {
        const res = await api.getSeriesList(
            params.category,
            params.tags,
            params.includeProductMetadata,
            params.includeVolume,
            params.minUpdatedTs
        );
        return res.data;
    } catch (error) {
        log('warn', 'kalshi.series', `getSeriesBatch::error: ${error}`);
        return null;
    }
}
