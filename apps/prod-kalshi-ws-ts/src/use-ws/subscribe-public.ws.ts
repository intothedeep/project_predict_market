import type WebSocket from 'ws';

export function subscribePublic(
    ws: WebSocket,
    marketTickers: string[],
    id: number
): void {
    const msg = {
        id,
        cmd: 'subscribe',
        params: {
            channels: ['ticker', 'trade', 'orderbook_delta'],
            market_tickers: marketTickers,
        },
    };
    ws.send(JSON.stringify(msg));
}
