export interface SeriesMeta {
    ticker: string;
    title: string;
    category?: string;
    frequency?: string;
    feeType?: string;
    feeMultiplier?: string;
    settlementSources?: { name: string; url: string }[];
    tags?: string[];
}
