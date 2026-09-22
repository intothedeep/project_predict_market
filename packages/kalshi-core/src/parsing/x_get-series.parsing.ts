import type { SeriesMeta } from '../types';

export function parseSeries(raw: unknown): SeriesMeta | null {
    if (raw == null || typeof raw !== 'object') return null;
    const wrapper = raw as Record<string, unknown>;
    const s = (wrapper.series ?? wrapper) as Record<string, unknown>;
    if (typeof s.ticker !== 'string' || typeof s.title !== 'string') return null;
    return {
        ticker: s.ticker,
        title: s.title,
        category: typeof s.category === 'string' ? s.category : undefined,
        frequency: typeof s.frequency === 'string' ? s.frequency : undefined,
        feeType: typeof s.fee_type === 'string' ? s.fee_type : undefined,
        feeMultiplier: s.fee_multiplier != null ? String(s.fee_multiplier) : undefined,
        settlementSources: Array.isArray(s.settlement_sources)
            ? (s.settlement_sources as { name: string; url: string }[])
            : undefined,
        tags: Array.isArray(s.tags) ? (s.tags as string[]) : undefined,
    };
}
