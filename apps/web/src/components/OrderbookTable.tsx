import type { OrderbookLevel } from '../types';

interface OrderbookTableProps {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
}

/**
 * price/qty render exactly as the strings they are (§3.5) — never parsed
 * into numbers, never formatted. Monospace column alignment comes from the
 * whole-UI mono font (index.css), not from padding logic here.
 */
export function OrderbookTable({ bids, asks }: OrderbookTableProps) {
    const rows = Math.max(bids.length, asks.length);
    return (
        <table className="w-full text-xs">
            <thead>
                <tr className="text-muted-foreground">
                    <th className="text-left font-normal">bid qty</th>
                    <th className="text-left font-normal">bid price</th>
                    <th className="text-right font-normal">ask price</th>
                    <th className="text-right font-normal">ask qty</th>
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rows }, (_, i) => {
                    const bid = bids[i];
                    const ask = asks[i];
                    return (
                        <tr key={i} className="border-t border-border">
                            <td className="text-signal-bid">{bid?.qty ?? ''}</td>
                            <td className="text-signal-bid">{bid?.price ?? ''}</td>
                            <td className="text-signal-ask text-right">
                                {ask?.price ?? ''}
                            </td>
                            <td className="text-signal-ask text-right">
                                {ask?.qty ?? ''}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
