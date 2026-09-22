export interface CandlestickPayload {
    endPeriodTs: number;
    ticker: string;
    series: string;
    periodInterval: number;
    priceOpen?: string;
    priceClose?: string;
    priceHigh?: string;
    priceLow?: string;
    priceMean?: string;
    pricePrevious?: string;
    yesBidClose?: string;
    yesAskClose?: string;
    volume?: string;
    openInterest?: string;
    yesBidOpen?: string;
    yesBidHigh?: string;
    yesBidLow?: string;
    yesAskOpen?: string;
    yesAskHigh?: string;
    yesAskLow?: string;
    yesBidMean?: string;
    yesAskMean?: string;
}
