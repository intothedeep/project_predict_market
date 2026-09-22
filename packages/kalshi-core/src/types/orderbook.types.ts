export type TOrderbookLevelTuple = [string, string];

export interface TOrderbookSnapshot {
    ticker: string;
    bids: TOrderbookLevelTuple[];
    asks: TOrderbookLevelTuple[];
}

export interface WsOrderbookDelta {
    type: 'orderbook_snapshot' | 'orderbook_delta';
    ticker: string;
    seq?: number;
    bids?: TOrderbookLevelTuple[];
    asks?: TOrderbookLevelTuple[];
}
