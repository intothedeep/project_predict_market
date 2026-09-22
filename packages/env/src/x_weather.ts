import { loadDotenv } from './load-dotenv';
import { z } from 'zod';

loadDotenv();

export const weatherSchema = z.object({
    NWS_BASE_URL: z.string().url().optional(),
    OPEN_METEO_BASE_URL: z.string().url().optional(),
    OPEN_METEO_ARCHIVE_BASE_URL: z.string().url().optional(),
    OWM_BASE_URL: z.string().url().optional(),
    NOAA_CDO_BASE_URL: z.string().url().optional(),
    TOMORROW_BASE_URL: z.string().url().optional(),
    VISUALCROSSING_BASE_URL: z.string().url().optional(),
    METAR_BASE_URL: z.string().url().optional(),
    OWM_API_KEY: z.string().optional(),
    NOAA_CDO_TOKEN: z.string().optional(),
    TOMORROW_API_KEY: z.string().optional(),
    VISUALCROSSING_API_KEY: z.string().optional(),
    VISUALCROSSING_BACKFILL_START_DATE: z.string().optional(),
    VISUALCROSSING_BACKFILL_END_DATE: z.string().optional(),
    WEATHER_POLL_INTERVAL: z.coerce.number().default(60),
    OWM_POLL_INTERVAL: z.coerce.number().default(7200),
    OPEN_METEO_POLL_INTERVAL: z.coerce.number().default(900),
    // 21600s (6h) chosen 2026-05-14: current Kalshi pipeline uses forecast_hourly + observation only,
    // not the ECMWF/GFS daily-max outputs. ECMWF runs 2x/day, GFS 4x/day, so 6h polling catches
    // every run with average ~3h freshness lag. Bump to 3600s if daily-max becomes a primary signal.
    OM_DAILY_POLL_INTERVAL: z.coerce.number().default(21600),
    NOAA_CDO_POLL_INTERVAL: z.coerce.number().default(900),
    TOMORROW_POLL_INTERVAL: z.coerce.number().default(14400),
    VISUALCROSSING_POLL_INTERVAL: z.coerce.number().default(7200),
    NWS_POLL_INTERVAL: z.coerce.number().default(900),
    NWS_ALERT_INTERVAL: z.coerce.number().default(300),
    NWS_FORECAST_INTERVAL: z.coerce.number().default(3600),
    METAR_POLL_INTERVAL: z.coerce.number().default(900),
    HRRR_POLL_INTERVAL: z.coerce.number().default(3600),
    WEATHER_SOURCE: z.string().default('nws'),
});

export const WEATHER_ENV = weatherSchema.parse(process.env);

export const NWS_BASE_URL =
    WEATHER_ENV.NWS_BASE_URL ?? 'https://api.weather.gov';
export const OPEN_METEO_BASE_URL =
    WEATHER_ENV.OPEN_METEO_BASE_URL ?? 'https://api.open-meteo.com/v1';
export const OPEN_METEO_ARCHIVE_BASE_URL =
    WEATHER_ENV.OPEN_METEO_ARCHIVE_BASE_URL ??
    'https://archive-api.open-meteo.com/v1';
export const OWM_BASE_URL =
    WEATHER_ENV.OWM_BASE_URL ?? 'https://api.openweathermap.org/data/3.0';
export const NOAA_CDO_BASE_URL =
    WEATHER_ENV.NOAA_CDO_BASE_URL ?? 'https://www.ncei.noaa.gov/cdo-web/api/v2';
export const TOMORROW_BASE_URL =
    WEATHER_ENV.TOMORROW_BASE_URL ?? 'https://api.tomorrow.io/v4/weather';
export const VISUALCROSSING_BASE_URL =
    WEATHER_ENV.VISUALCROSSING_BASE_URL ??
    'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services';
export const METAR_BASE_URL =
    WEATHER_ENV.METAR_BASE_URL ?? 'https://aviationweather.gov/api/data/metar';

export const OWM_API_KEY = WEATHER_ENV.OWM_API_KEY;
export const NOAA_CDO_TOKEN = WEATHER_ENV.NOAA_CDO_TOKEN;
export const TOMORROW_API_KEY = WEATHER_ENV.TOMORROW_API_KEY;
export const VISUALCROSSING_API_KEY = WEATHER_ENV.VISUALCROSSING_API_KEY;
export const VISUALCROSSING_BACKFILL_START_DATE =
    WEATHER_ENV.VISUALCROSSING_BACKFILL_START_DATE;
export const VISUALCROSSING_BACKFILL_END_DATE =
    WEATHER_ENV.VISUALCROSSING_BACKFILL_END_DATE;

export const WEATHER_POLL_INTERVAL = WEATHER_ENV.WEATHER_POLL_INTERVAL;
export const OWM_POLL_INTERVAL = WEATHER_ENV.OWM_POLL_INTERVAL;
export const OPEN_METEO_POLL_INTERVAL = WEATHER_ENV.OPEN_METEO_POLL_INTERVAL;
export const OM_DAILY_POLL_INTERVAL = WEATHER_ENV.OM_DAILY_POLL_INTERVAL;
export const NOAA_CDO_POLL_INTERVAL = WEATHER_ENV.NOAA_CDO_POLL_INTERVAL;
export const TOMORROW_POLL_INTERVAL = WEATHER_ENV.TOMORROW_POLL_INTERVAL;
export const VISUALCROSSING_POLL_INTERVAL =
    WEATHER_ENV.VISUALCROSSING_POLL_INTERVAL;
export const NWS_POLL_INTERVAL = WEATHER_ENV.NWS_POLL_INTERVAL;
export const NWS_ALERT_INTERVAL = WEATHER_ENV.NWS_ALERT_INTERVAL;
export const NWS_FORECAST_INTERVAL = WEATHER_ENV.NWS_FORECAST_INTERVAL;
export const METAR_POLL_INTERVAL = WEATHER_ENV.METAR_POLL_INTERVAL;
export const HRRR_POLL_INTERVAL = WEATHER_ENV.HRRR_POLL_INTERVAL;
export const WEATHER_SOURCE = WEATHER_ENV.WEATHER_SOURCE;
