export interface TradeMeta {
    tradeId?: string;
    ticker?: string;
    yesPrice?: string;
    noPrice?: string;
    count?: string;
    takerSide?: string;
    createdTime?: string;
}

export interface WsTrade {
    ticker: string;
    tradeId?: string | number;
    yesPrice?: string;
    noPrice?: string;
    count?: string;
    takerSide?: string;
    createdTime?: unknown;
}
