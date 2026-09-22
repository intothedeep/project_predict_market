/**
 * insertCsv — routes a topic+message to a per-table CsvWriter.
 * Used when STORAGE_MODE=csv.
 */

import { CsvWriter } from '../writers/csv-writer';
import {
    KALSHI_MARKET_API_CONFIG,
    KALSHI_TRADE_API_CONFIG,
    KALSHI_TRADE_WS_CONFIG,
    KALSHI_TRADE_HISTORICAL_CONFIG,
    KALSHI_ORDERBOOK_API_CONFIG,
    KALSHI_SERIES_CONFIG,
    KALSHI_CANDLESTICK_HISTORICAL_CONFIG,
    WEATHER_OBSERVATION_CONFIG,
    WEATHER_ALERT_CONFIG,
    WEATHER_FORECAST_CONFIG,
    WEATHER_FORECAST_HOURLY_CONFIG,
    WEATHER_HIST_CONFIG,
    CRYPTO_TRADE_CONFIG,
    CRYPTO_TICK_CONFIG,
    CRYPTO_DEX_CONFIG,
} from '@repo/schema';

let kalshiMarketApi: CsvWriter | null = null;
let kalshiTradeApi: CsvWriter | null = null;
let kalshiTradeWs: CsvWriter | null = null;
let kalshiTradeApiHist: CsvWriter | null = null;
let kalshiOrderbookApi: CsvWriter | null = null;
let kalshiSeries: CsvWriter | null = null;
let kalshiCandlestick: CsvWriter | null = null;
let weatherObservation: CsvWriter | null = null;
let weatherAlert: CsvWriter | null = null;
let weatherForecast: CsvWriter | null = null;
let weatherForecastHourly: CsvWriter | null = null;
let weatherClimate: CsvWriter | null = null;
let cryptoTrades: CsvWriter | null = null;
let cryptoTick: CsvWriter | null = null;
let cryptoDex: CsvWriter | null = null;

export function insertCsv(topic: string, msg: Record<string, unknown>): void {
    switch (topic) {
        case 'kalshi.market.api':
            kalshiMarketApi ??= new CsvWriter(
                'kalshi_market_api',
                KALSHI_MARKET_API_CONFIG
            );
            kalshiMarketApi.write(msg);
            break;
        case 'kalshi.trade.api':
            kalshiTradeApi ??= new CsvWriter(
                'kalshi_trade_api',
                KALSHI_TRADE_API_CONFIG
            );
            kalshiTradeApi.write(msg);
            break;
        case 'kalshi.trade.ws':
            kalshiTradeWs ??= new CsvWriter(
                'kalshi_trade_ws',
                KALSHI_TRADE_WS_CONFIG
            );
            kalshiTradeWs.write(msg);
            break;
        case 'kalshi.trade.api_hist':
            kalshiTradeApiHist ??= new CsvWriter(
                'kalshi_trade_api_hist',
                KALSHI_TRADE_HISTORICAL_CONFIG
            );
            kalshiTradeApiHist.write(msg);
            break;
        case 'kalshi.orderbook.api':
            kalshiOrderbookApi ??= new CsvWriter(
                'kalshi_orderbook_api',
                KALSHI_ORDERBOOK_API_CONFIG
            );
            kalshiOrderbookApi.write(msg);
            break;
        case 'kalshi.series':
            kalshiSeries ??= new CsvWriter(
                'kalshi_series',
                KALSHI_SERIES_CONFIG
            );
            kalshiSeries.write(msg);
            break;
        case 'kalshi.candlestick.api':
            kalshiCandlestick ??= new CsvWriter(
                'kalshi_candlestick_api_hist',
                KALSHI_CANDLESTICK_HISTORICAL_CONFIG
            );
            kalshiCandlestick.write(msg);
            break;
        case 'weather.observation':
            weatherObservation ??= new CsvWriter(
                'weather_observation',
                WEATHER_OBSERVATION_CONFIG
            );
            weatherObservation.write(msg);
            break;
        case 'weather.alert':
            weatherAlert ??= new CsvWriter(
                'weather_alert',
                WEATHER_ALERT_CONFIG
            );
            weatherAlert.write(msg);
            break;
        case 'weather.forecast':
            weatherForecast ??= new CsvWriter(
                'weather_forecast',
                WEATHER_FORECAST_CONFIG
            );
            weatherForecast.write(msg);
            break;
        case 'weather.forecast.hourly':
            weatherForecastHourly ??= new CsvWriter(
                'weather_forecast_hourly',
                WEATHER_FORECAST_HOURLY_CONFIG
            );
            weatherForecastHourly.write(msg);
            break;
        case 'weather.climate':
            weatherClimate ??= new CsvWriter(
                'weather_hist',
                WEATHER_HIST_CONFIG,
                true
            );
            weatherClimate.write(msg);
            break;
        case 'crypto.trades':
            cryptoTrades ??= new CsvWriter(
                'crypto_trades',
                CRYPTO_TRADE_CONFIG
            );
            cryptoTrades.write(msg);
            break;
        case 'crypto.ticks':
            cryptoTick ??= new CsvWriter('crypto_ticks', CRYPTO_TICK_CONFIG);
            cryptoTick.write(msg);
            break;
        case 'crypto.dex':
            cryptoDex ??= new CsvWriter('crypto_dex_prices', CRYPTO_DEX_CONFIG);
            cryptoDex.write(msg);
            break;
    }
}
