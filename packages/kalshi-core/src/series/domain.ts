import { CRYPTO_SERIES_ARR, CRYPTO_15M_SERIES_ARR } from './crypto';

// MVP1 (§1 명시적 제외): weather/climate 전부 미이식 — CRYPTO 카테고리만 남는다.
export const KALSHI_CATEGORIES = {
    CRYPTO: 'crypto',
    HOT: 'hot',
    ALL: 'all',
} as const;

export type TKalshiCategory =
    (typeof KALSHI_CATEGORIES)[keyof typeof KALSHI_CATEGORIES];

export function getSeriesByCategory(
    category: TKalshiCategory = KALSHI_CATEGORIES.ALL
): readonly string[] {
    if (category === KALSHI_CATEGORIES.HOT) {
        return CRYPTO_15M_SERIES_ARR;
    }
    return CRYPTO_SERIES_ARR;
}
