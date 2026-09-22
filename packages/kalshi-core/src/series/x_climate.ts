/**
 * Kalshi city-based weather series tickers and weather city canonical source-of-truth.
 *
 * Phase 3 Redesign (2026-05-14): WeatherLocation entity introduced.
 * - WEATHER_CITIES now stores 60 cities (11 US + 9 new US + 40 international) without lat/lon/metarStation/nwsStation.
 * - WEATHER_LOCATIONS stores ~180 location entries (airport, center, certain) with sources arrays.
 * - Lookup helpers derive endpoints per producer via getLocationsBySource().
 *
 * Series Naming generations (Kalshi has two — neither was retroactively migrated):
 *   Legacy : KXHIGH{CODE}  / KXLOW{CODE}    — older series (NY, LAX, MIA, CHI, DEN, AUS, PHIL)
 *   New    : KXHIGHT{CODE} / KXLOWT{CODE}   — newer additions (T inserted after HIGH/LOW)
 *
 * Snow / rain follow:
 *   Snow monthly : KX{CODE}SNOWM   (Denver uses KXDENSNOWMB)
 *   Rain monthly : KXRAIN{CODE}M
 *
 * City codes (mostly airport, with quirks):
 *   NY=NYC (legacy, no airport code)  CHI=Chicago      LAX=Los Angeles
 *   MIA=Miami                          SFO=San Francisco DC=Washington DC
 *   DEN=Denver                         AUS=Austin        SEA=Seattle
 *   PHX=Phoenix                        PHIL=Philadelphia ATL=Atlanta
 *   BOS=Boston                          DAL=Dallas        LV=Las Vegas
 *   MIN=Minneapolis                    HOU=Houston       NOLA=New Orleans
 *   SATX=San Antonio                   OKC=Oklahoma City
 *
 * Coverage notes:
 *   Phoenix / Atlanta / Las Vegas / Minneapolis / OKC / SATX / NOLA — no monthly snow or rain series.
 *   Washington DC — snow only (no monthly rain series).
 *   Miami — rain only (no snow; KXMIASNOWM is mistitled by Kalshi as Chicago, excluded).
 *   KXTEMP (national aggregate) — not city-based, excluded.
 *
 * Verified live against https://api.elections.kalshi.com/trade-api/v2/series/{ticker}.
 *
 * Weather Cities — canonical source-of-truth for all weather producer locations.
 * 60 cities across 6 regions: US (20), EU (8), Asia (15), CA (1), SA (2), OC (1), Africa (3) [bot bug: africa as asia].
 * Fields are populated per architect decision; see architecture.md §12.
 */

export const HIGH_TEMP_SERIES_ARR = [
    // legacy
    'KXHIGHNY',
    'KXHIGHCHI',
    'KXHIGHLAX',
    'KXHIGHMIA',
    'KXHIGHDEN',
    'KXHIGHAUS',
    'KXHIGHPHIL',
    // new
    'KXHIGHTSFO',
    'KXHIGHTDC',
    'KXHIGHTSEA',
    'KXHIGHTPHX',
    'KXHIGHTPHX',
    'KXHIGHTBOS',
    'KXHIGHTDAL',
    'KXHIGHTLV',
    'KXHIGHTMIN',
    'KXHIGHTHOU',
    'KXHIGHTNOLA',
    'KXHIGHTSATX',
    'KXHIGHTOKC',
] as const;

export const LOW_TEMP_SERIES_ARR = [
    // legacy
    'KXLOWNY',
    'KXLOWAUS',
    // new
    'KXLOWTCHI',
    'KXLOWTLAX',
    'KXLOWTMIA',
    'KXLOWTSFO',
    'KXLOWTDC',
    'KXLOWTDEN',
    'KXLOWTSEA',
    'KXLOWTPHX',
    'KXLOWTPHIL',
    'KXLOWTATL',
    'KXLOWTBOS',
    'KXLOWTDAL',
    'KXLOWTLV',
    'KXLOWTMIN',
    'KXLOWTHOU',
    'KXLOWTNOLA',
    'KXLOWTSATX',
    'KXLOWTOKC',
] as const;

const SNOW_MONTHLY = [
    'KXNYCSNOWM',
    'KXCHISNOWM',
    'KXLAXSNOWM',
    'KXSFOSNOWM',
    'KXDCSNOWM',
    'KXDENSNOWMB',
    'KXAUSSNOWM',
    'KXSEASNOWM',
    'KXPHILSNOWM',
    'KXBOSSNOWM',
];

const RAIN_MONTHLY = [
    'KXRAINNYCM',
    'KXRAINCHIM',
    'KXRAINLAXM',
    'KXRAINMIAM',
    'KXRAINSFOM',
    'KXRAINDENM',
    'KXRAINAUSM',
    'KXRAINSEAM',
    'KXRAINDALM',
    'KXRAINHOUM',
];

export const CLIMATE_TEMP_BUCKET_SERIES_ARR: readonly string[] = [
    ...HIGH_TEMP_SERIES_ARR,
    ...LOW_TEMP_SERIES_ARR,
];

export const CLIMATE_SERIES_ARR: readonly string[] = [
    ...HIGH_TEMP_SERIES_ARR,
    ...LOW_TEMP_SERIES_ARR,
    ...SNOW_MONTHLY,
    ...RAIN_MONTHLY,
];

// ─── Types ──────────────────────────────────────────────────────────────────

export type Region = 'us' | 'eu' | 'asia' | 'ca' | 'sa' | 'oc';
export type TempUnit = 'F' | 'C';
export type LocationType = 'airport' | 'center' | 'certain';
export type SourceName = 'metar' | 'nws' | 'open-meteo' | 'openweathermap' | 'tomorrow' | 'visualcrossing';

export interface WeatherLocation {
    cityId: string;
    locationType: LocationType;
    locationSymbol: string;
    lat: number;
    lon: number;
    sources: SourceName[];
    isPrimaryFor?: Partial<Record<SourceName, boolean>>;
    kalshiResolvers?: string[];
}

export interface WeatherCity {
    id: string;
    cityCode: string;
    name: string;
    displayLat?: number;
    displayLon?: number;
    unit: TempUnit;
    region: Region;
    timezone: string;
    aliases: string[];
    omAlias: string;
    owmAlias: string;
    tomorrowAlias: string;
    vcAlias: string;
    omToUse: string;
    owmToUse: string;
    tomorrowToUse: string;
    vcToUse: string;
    metarToUse: string;
    /** 1 (true) if Polymarket has weather markets for this city; mirrors bot_v2.py LOCATIONS coverage. */
    polymarket: boolean;
    /** 1 (true) if Kalshi has weather markets for this city; 20 US cities with kalshiResolvers data. */
    kalshi: boolean;
}

// ─── Weather Cities (60 cities, canonical source-of-truth) ──────────────────

export const WEATHER_CITIES: WeatherCity[] = [
    { id: 'new_york', cityCode: 'NYC', name: 'New York City', displayLat: 40.7772, displayLon: -73.8726, unit: 'F', region: 'us', timezone: 'America/New_York', aliases: ['nyc', 'new_york', 'new-york', 'new york', 'new york city', 'newyork'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'chicago', cityCode: 'CHI', name: 'Chicago', displayLat: 41.9742, displayLon: -87.9073, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['chicago', 'chi'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'los_angeles', cityCode: 'LAX', name: 'Los Angeles', displayLat: 33.9425, displayLon: -118.4081, unit: 'F', region: 'us', timezone: 'America/Los_Angeles', aliases: ['los_angeles', 'los-angeles', 'los angeles', 'la', 'lax'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'san_francisco', cityCode: 'SFO', name: 'San Francisco', displayLat: 37.6189, displayLon: -122.3750, unit: 'F', region: 'us', timezone: 'America/Los_Angeles', aliases: ['san_francisco', 'san-francisco', 'san francisco', 'sf', 'sfo'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'miami', cityCode: 'MIA', name: 'Miami', displayLat: 25.7959, displayLon: -80.2870, unit: 'F', region: 'us', timezone: 'America/New_York', aliases: ['miami', 'mia'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'dallas', cityCode: 'DFW', name: 'Dallas', displayLat: 32.8471, displayLon: -96.8518, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['dallas', 'dfw'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'seattle', cityCode: 'SEA', name: 'Seattle', displayLat: 47.4502, displayLon: -122.3088, unit: 'F', region: 'us', timezone: 'America/Los_Angeles', aliases: ['seattle', 'sea'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'atlanta', cityCode: 'ATL', name: 'Atlanta', displayLat: 33.6407, displayLon: -84.4277, unit: 'F', region: 'us', timezone: 'America/New_York', aliases: ['atlanta', 'atl'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'austin', cityCode: 'AUS', name: 'Austin', displayLat: 30.2672, displayLon: -97.7431, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['austin', 'aus'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'denver', cityCode: 'DEN', name: 'Denver', displayLat: 39.8561, displayLon: -104.6737, unit: 'F', region: 'us', timezone: 'America/Denver', aliases: ['denver', 'den'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'houston', cityCode: 'HOU', name: 'Houston', displayLat: 29.9844, displayLon: -95.3414, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['houston', 'hou'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: true},
    { id: 'washington_dc', cityCode: 'DCA', name: 'Washington DC', displayLat: 38.8521, displayLon: -77.0377, unit: 'F', region: 'us', timezone: 'America/New_York', aliases: ['washington_dc', 'washington', 'dc', 'dca'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'philadelphia', cityCode: 'PHL', name: 'Philadelphia', displayLat: 39.8729, displayLon: -75.2437, unit: 'F', region: 'us', timezone: 'America/New_York', aliases: ['philadelphia', 'philly', 'phl'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'phoenix', cityCode: 'PHX', name: 'Phoenix', displayLat: 33.4373, displayLon: -112.0078, unit: 'F', region: 'us', timezone: 'America/Phoenix', aliases: ['phoenix', 'phx'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'boston', cityCode: 'BOS', name: 'Boston', displayLat: 42.3631, displayLon: -71.0064, unit: 'F', region: 'us', timezone: 'America/New_York', aliases: ['boston', 'bos'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'las_vegas', cityCode: 'LAS', name: 'Las Vegas', displayLat: 36.0840, displayLon: -115.1537, unit: 'F', region: 'us', timezone: 'America/Los_Angeles', aliases: ['las_vegas', 'las-vegas', 'las vegas', 'lv', 'las'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'minneapolis', cityCode: 'MSP', name: 'Minneapolis', displayLat: 44.8848, displayLon: -93.2223, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['minneapolis', 'min', 'msp'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'new_orleans', cityCode: 'MSY', name: 'New Orleans', displayLat: 29.9934, displayLon: -90.2580, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['new_orleans', 'nola', 'msy'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'san_antonio', cityCode: 'SAT', name: 'San Antonio', displayLat: 29.5337, displayLon: -98.4698, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['san_antonio', 'san antonio', 'sat'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'oklahoma_city', cityCode: 'OKC', name: 'Oklahoma City', displayLat: 35.3931, displayLon: -97.6007, unit: 'F', region: 'us', timezone: 'America/Chicago', aliases: ['oklahoma_city', 'oklahoma city', 'okc'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: false, kalshi: true},
    { id: 'london', cityCode: 'LON', name: 'London', displayLat: 51.5048, displayLon: 0.0495, unit: 'C', region: 'eu', timezone: 'Europe/London', aliases: ['london', 'lon'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'paris', cityCode: 'PAR', name: 'Paris', displayLat: 48.962276, displayLon: 2.436539, unit: 'C', region: 'eu', timezone: 'Europe/Paris', aliases: ['paris', 'par'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'munich', cityCode: 'MUC', name: 'Munich', displayLat: 48.3537, displayLon: 11.7861, unit: 'C', region: 'eu', timezone: 'Europe/Berlin', aliases: ['munich', 'munchen', 'münchen', 'muc'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'ankara', cityCode: 'ANK', name: 'Ankara', displayLat: 40.1281, displayLon: 32.9951, unit: 'C', region: 'eu', timezone: 'Europe/Istanbul', aliases: ['ankara', 'ank'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'amsterdam', cityCode: 'AMS', name: 'Amsterdam', displayLat: 52.3676, displayLon: 4.9041, unit: 'C', region: 'eu', timezone: 'Europe/Amsterdam', aliases: ['amsterdam', 'ams'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'madrid', cityCode: 'MAD', name: 'Madrid', displayLat: 40.4168, displayLon: -3.7038, unit: 'C', region: 'eu', timezone: 'Europe/Madrid', aliases: ['madrid', 'mad'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'milan', cityCode: 'MIL', name: 'Milan', displayLat: 45.6306, displayLon: 8.7281, unit: 'C', region: 'eu', timezone: 'Europe/Rome', aliases: ['milan', 'milano', 'mil'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'warsaw', cityCode: 'WAR', name: 'Warsaw', displayLat: 52.2297, displayLon: 21.0122, unit: 'C', region: 'eu', timezone: 'Europe/Warsaw', aliases: ['warsaw', 'war'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'helsinki', cityCode: 'HEL', name: 'Helsinki', displayLat: 60.1699, displayLon: 24.9384, unit: 'C', region: 'eu', timezone: 'Europe/Helsinki', aliases: ['helsinki', 'hel'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'seoul', cityCode: 'SEL', name: 'Seoul', displayLat: 37.4691, displayLon: 126.4505, unit: 'C', region: 'asia', timezone: 'Asia/Seoul', aliases: ['seoul', 'sel'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'tokyo', cityCode: 'TYO', name: 'Tokyo', displayLat: 35.549678, displayLon: 139.786958, unit: 'C', region: 'asia', timezone: 'Asia/Tokyo', aliases: ['tokyo', 'tyo'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'shanghai', cityCode: 'SHA', name: 'Shanghai', displayLat: 31.1443, displayLon: 121.8083, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['shanghai', 'sha'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'beijing', cityCode: 'BEI', name: 'Beijing', displayLat: 39.9042, displayLon: 116.4074, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['beijing', 'bei'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'chengdu', cityCode: 'CHE', name: 'Chengdu', displayLat: 30.5728, displayLon: 104.0668, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['chengdu', 'che'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'chongqing', cityCode: 'CHO', name: 'Chongqing', displayLat: 29.5630, displayLon: 106.5516, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['chongqing', 'cho'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'guangzhou', cityCode: 'GUA', name: 'Guangzhou', displayLat: 23.1291, displayLon: 113.2644, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['guangzhou', 'gua'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'qingdao', cityCode: 'QIN', name: 'Qingdao', displayLat: 36.0671, displayLon: 120.3826, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['qingdao', 'qin'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'shenzhen', cityCode: 'SHE', name: 'Shenzhen', displayLat: 22.5431, displayLon: 114.0579, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['shenzhen', 'she'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'wuhan', cityCode: 'WUH', name: 'Wuhan', displayLat: 30.5928, displayLon: 114.3055, unit: 'C', region: 'asia', timezone: 'Asia/Shanghai', aliases: ['wuhan', 'wuh'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'singapore', cityCode: 'SIN', name: 'Singapore', displayLat: 1.3502, displayLon: 103.9940, unit: 'C', region: 'asia', timezone: 'Asia/Singapore', aliases: ['singapore', 'sg', 'sin'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'hong_kong', cityCode: 'HON', name: 'Hong Kong', displayLat: 22.3193, displayLon: 114.1694, unit: 'C', region: 'asia', timezone: 'Asia/Hong_Kong', aliases: ['hong-kong', 'hong_kong', 'hong kong', 'hon'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'taipei', cityCode: 'TAI', name: 'Taipei', displayLat: 25.0777, displayLon: 121.2333, unit: 'C', region: 'asia', timezone: 'Asia/Taipei', aliases: ['taipei', 'tai'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'lucknow', cityCode: 'LKO', name: 'Lucknow', displayLat: 26.7606, displayLon: 80.8893, unit: 'C', region: 'asia', timezone: 'Asia/Kolkata', aliases: ['lucknow', 'lko'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'karachi', cityCode: 'KAR', name: 'Karachi', displayLat: 24.8607, displayLon: 67.0011, unit: 'C', region: 'asia', timezone: 'Asia/Karachi', aliases: ['karachi', 'kar'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'jakarta', cityCode: 'JAK', name: 'Jakarta', displayLat: -6.2088, displayLon: 106.8456, unit: 'C', region: 'asia', timezone: 'Asia/Jakarta', aliases: ['jakarta', 'jak'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'kuala_lumpur', cityCode: 'KUA', name: 'Kuala Lumpur', displayLat: 3.1390, displayLon: 101.6869, unit: 'C', region: 'asia', timezone: 'Asia/Kuala_Lumpur', aliases: ['kuala-lumpur', 'kuala_lumpur', 'kuala lumpur', 'kua'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'manila', cityCode: 'MAN', name: 'Manila', displayLat: 14.5995, displayLon: 120.9842, unit: 'C', region: 'asia', timezone: 'Asia/Manila', aliases: ['manila', 'man'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'busan', cityCode: 'BUS', name: 'Busan', displayLat: 35.0796, displayLon: 129.0231, unit: 'C', region: 'asia', timezone: 'Asia/Seoul', aliases: ['busan', 'bus'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'istanbul', cityCode: 'IST', name: 'Istanbul', displayLat: 41.2749, displayLon: 28.7321, unit: 'C', region: 'asia', timezone: 'Europe/Istanbul', aliases: ['istanbul', 'ist'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'jeddah', cityCode: 'JED', name: 'Jeddah', displayLat: 21.5433, displayLon: 39.1727, unit: 'C', region: 'asia', timezone: 'Asia/Riyadh', aliases: ['jeddah', 'jed'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'tel_aviv', cityCode: 'TLV', name: 'Tel Aviv', displayLat: 32.0114, displayLon: 34.8867, unit: 'C', region: 'asia', timezone: 'Asia/Jerusalem', aliases: ['tel-aviv', 'tel_aviv', 'tel aviv', 'telaviv', 'tlv'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'moscow', cityCode: 'MOS', name: 'Moscow', displayLat: 55.7558, displayLon: 37.6173, unit: 'C', region: 'asia', timezone: 'Europe/Moscow', aliases: ['moscow', 'mos'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'toronto', cityCode: 'YTO', name: 'Toronto', displayLat: 43.6772, displayLon: -79.6306, unit: 'C', region: 'ca', timezone: 'America/Toronto', aliases: ['toronto', 'yyz', 'yto'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'sao_paulo', cityCode: 'SAO', name: 'Sao Paulo', displayLat: -23.4356, displayLon: -46.4731, unit: 'C', region: 'sa', timezone: 'America/Sao_Paulo', aliases: ['sao-paulo', 'sao_paulo', 'sao paulo', 'são paulo', 'sao'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'buenos_aires', cityCode: 'BUE', name: 'Buenos Aires', displayLat: -34.8222, displayLon: -58.5358, unit: 'C', region: 'sa', timezone: 'America/Argentina/Buenos_Aires', aliases: ['buenos-aires', 'buenos_aires', 'buenos aires', 'ba', 'bue'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'mexico_city', cityCode: 'MEX', name: 'Mexico City', displayLat: 19.4326, displayLon: -99.1332, unit: 'C', region: 'sa', timezone: 'America/Mexico_City', aliases: ['mexico-city', 'mexico_city', 'mexico city', 'mex'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'panama_city', cityCode: 'PAN', name: 'Panama City', displayLat: 8.9824, displayLon: -79.5199, unit: 'C', region: 'sa', timezone: 'America/Panama', aliases: ['panama-city', 'panama_city', 'panama city', 'pan'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'cape_town', cityCode: 'CAP', name: 'Cape Town', displayLat: -33.9249, displayLon: 18.4241, unit: 'C', region: 'asia', timezone: 'Africa/Johannesburg', aliases: ['cape-town', 'cape_town', 'cape town', 'cap'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'lagos', cityCode: 'LAG', name: 'Lagos', displayLat: 6.5774, displayLon: 3.3212, unit: 'C', region: 'asia', timezone: 'Africa/Lagos', aliases: ['lagos', 'lag'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
    { id: 'wellington', cityCode: 'WLG', name: 'Wellington', displayLat: -41.3272, displayLon: 174.8052, unit: 'C', region: 'oc', timezone: 'Pacific/Auckland', aliases: ['wellington', 'wlg'], omAlias: '', owmAlias: '', tomorrowAlias: '', vcAlias: '', omToUse: 'lat|lon', owmToUse: 'lat|lon', tomorrowToUse: 'lat|lon', vcToUse: 'lat|lon', metarToUse: 'metar_station', polymarket: true, kalshi: false},
];

// ─── Weather Locations (180+ location entries) ───────────────────────────────

export const WEATHER_LOCATIONS: WeatherLocation[] = [
    // new_york: 1 center + 1 airport
    { cityId: 'new_york', locationType: 'center', locationSymbol: 'NYC_CTR', lat: 40.7772, lon: -73.8726, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'new_york', locationType: 'airport', locationSymbol: 'KLGA', lat: 40.7772, lon: -73.8726, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHNY', 'KXLOWNY', 'KXNYCSNOWM', 'KXRAINNYCM'] },
    // chicago
    { cityId: 'chicago', locationType: 'center', locationSymbol: 'CHI_CTR', lat: 41.9742, lon: -87.9073, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'chicago', locationType: 'airport', locationSymbol: 'KORD', lat: 41.9742, lon: -87.9073, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHCHI', 'KXLOWTCHI', 'KXCHISNOWM', 'KXRAINCHIM'] },
    // los_angeles
    { cityId: 'los_angeles', locationType: 'center', locationSymbol: 'LAX_CTR', lat: 33.9425, lon: -118.4081, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'los_angeles', locationType: 'airport', locationSymbol: 'KLAX', lat: 33.9425, lon: -118.4081, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHLAX', 'KXLOWTLAX', 'KXLAXSNOWM', 'KXRAINLAXM'] },
    // san_francisco
    { cityId: 'san_francisco', locationType: 'center', locationSymbol: 'SFO_CTR', lat: 37.6189, lon: -122.3750, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'san_francisco', locationType: 'airport', locationSymbol: 'KSFO', lat: 37.6189, lon: -122.3750, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTSFO', 'KXLOWTSFO', 'KXSFOSNOWM', 'KXRAINSFOM'] },
    // miami
    { cityId: 'miami', locationType: 'center', locationSymbol: 'MIA_CTR', lat: 25.7959, lon: -80.2870, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'miami', locationType: 'airport', locationSymbol: 'KMIA', lat: 25.7959, lon: -80.2870, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHMIA', 'KXLOWTMIA', 'KXRAINMIAM'] },
    // dallas
    { cityId: 'dallas', locationType: 'center', locationSymbol: 'DFW_CTR', lat: 32.8471, lon: -96.8518, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'dallas', locationType: 'airport', locationSymbol: 'KDAL', lat: 32.8471, lon: -96.8518, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTDAL', 'KXLOWTDAL', 'KXRAINDALM'] },
    // seattle
    { cityId: 'seattle', locationType: 'center', locationSymbol: 'SEA_CTR', lat: 47.4502, lon: -122.3088, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'seattle', locationType: 'airport', locationSymbol: 'KSEA', lat: 47.4502, lon: -122.3088, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTSEA', 'KXLOWTSEA', 'KXSEASNOWM', 'KXRAINSEAM'] },
    // atlanta
    { cityId: 'atlanta', locationType: 'center', locationSymbol: 'ATL_CTR', lat: 33.6407, lon: -84.4277, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'atlanta', locationType: 'airport', locationSymbol: 'KATL', lat: 33.6407, lon: -84.4277, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTATL', 'KXLOWTATL'] },
    // austin
    { cityId: 'austin', locationType: 'center', locationSymbol: 'AUS_CTR', lat: 30.2672, lon: -97.7431, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'austin', locationType: 'airport', locationSymbol: 'KAUS', lat: 30.2672, lon: -97.7431, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHAUS', 'KXLOWAUS', 'KXAUSSNOWM', 'KXRAINAUSM'] },
    // denver: 2 airports + 1 center
    { cityId: 'denver', locationType: 'center', locationSymbol: 'DEN_CTR', lat: 39.8561, lon: -104.6737, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'denver', locationType: 'airport', locationSymbol: 'KDEN', lat: 39.8561, lon: -104.6737, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHDEN', 'KXLOWTDEN', 'KXDENSNOWMB', 'KXRAINDENM'] },
    { cityId: 'denver', locationType: 'airport', locationSymbol: 'KBKF', lat: 39.7183, lon: -104.5830, sources: ['metar'], isPrimaryFor: { metar: false } },
    // houston: 2 airports + 1 center
    { cityId: 'houston', locationType: 'center', locationSymbol: 'HOU_CTR', lat: 29.9844, lon: -95.3414, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'houston', locationType: 'airport', locationSymbol: 'KIAH', lat: 29.9844, lon: -95.3414, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTHOU', 'KXLOWTHOU', 'KXRAINHOUM'] },
    { cityId: 'houston', locationType: 'airport', locationSymbol: 'KHOU', lat: 29.6454, lon: -95.2789, sources: ['metar'], isPrimaryFor: { metar: false } },
    // washington_dc
    { cityId: 'washington_dc', locationType: 'center', locationSymbol: 'DCA_CTR', lat: 38.8521, lon: -77.0377, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'washington_dc', locationType: 'airport', locationSymbol: 'KDCA', lat: 38.8521, lon: -77.0377, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTDC', 'KXLOWTDC', 'KXDCSNOWM'] },
    // philadelphia
    { cityId: 'philadelphia', locationType: 'center', locationSymbol: 'PHL_CTR', lat: 39.8729, lon: -75.2437, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'philadelphia', locationType: 'airport', locationSymbol: 'KPHL', lat: 39.8729, lon: -75.2437, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHPHIL', 'KXLOWTPHIL', 'KXPHILSNOWM'] },
    // phoenix
    { cityId: 'phoenix', locationType: 'center', locationSymbol: 'PHX_CTR', lat: 33.4373, lon: -112.0078, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'phoenix', locationType: 'airport', locationSymbol: 'KPHX', lat: 33.4373, lon: -112.0078, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTPHX', 'KXLOWTPHX'] },
    // boston
    { cityId: 'boston', locationType: 'center', locationSymbol: 'BOS_CTR', lat: 42.3631, lon: -71.0064, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'boston', locationType: 'airport', locationSymbol: 'KBOS', lat: 42.3631, lon: -71.0064, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTBOS', 'KXLOWTBOS', 'KXBOSSNOWM'] },
    // las_vegas
    { cityId: 'las_vegas', locationType: 'center', locationSymbol: 'LAS_CTR', lat: 36.0840, lon: -115.1537, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'las_vegas', locationType: 'airport', locationSymbol: 'KLAS', lat: 36.0840, lon: -115.1537, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTLV', 'KXLOWTLV'] },
    // minneapolis
    { cityId: 'minneapolis', locationType: 'center', locationSymbol: 'MSP_CTR', lat: 44.8848, lon: -93.2223, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'minneapolis', locationType: 'airport', locationSymbol: 'KMSP', lat: 44.8848, lon: -93.2223, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTMIN', 'KXLOWTMIN'] },
    // new_orleans
    { cityId: 'new_orleans', locationType: 'center', locationSymbol: 'MSY_CTR', lat: 29.9934, lon: -90.2580, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'new_orleans', locationType: 'airport', locationSymbol: 'KMSY', lat: 29.9934, lon: -90.2580, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTNOLA', 'KXLOWTNOLA'] },
    // san_antonio
    { cityId: 'san_antonio', locationType: 'center', locationSymbol: 'SAT_CTR', lat: 29.5337, lon: -98.4698, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'san_antonio', locationType: 'airport', locationSymbol: 'KSAT', lat: 29.5337, lon: -98.4698, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTSATX', 'KXLOWTSATX'] },
    // oklahoma_city
    { cityId: 'oklahoma_city', locationType: 'center', locationSymbol: 'OKC_CTR', lat: 35.3931, lon: -97.6007, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'oklahoma_city', locationType: 'airport', locationSymbol: 'KOKC', lat: 35.3931, lon: -97.6007, sources: ['metar', 'nws'], isPrimaryFor: { metar: true, nws: true }, kalshiResolvers: ['KXHIGHTOKC', 'KXLOWTOKC'] },
    // london
    { cityId: 'london', locationType: 'center', locationSymbol: 'LON_CTR', lat: 51.5048, lon: 0.0495, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'london', locationType: 'airport', locationSymbol: 'EGLC', lat: 51.5048, lon: 0.0495, sources: ['metar'], isPrimaryFor: { metar: true } },
    // paris
    { cityId: 'paris', locationType: 'center', locationSymbol: 'PAR_CTR', lat: 48.962276, lon: 2.436539, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'paris', locationType: 'airport', locationSymbol: 'LFPB', lat: 48.962276, lon: 2.436539, sources: ['metar'], isPrimaryFor: { metar: true } },
    // munich
    { cityId: 'munich', locationType: 'center', locationSymbol: 'MUC_CTR', lat: 48.3537, lon: 11.7861, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'munich', locationType: 'airport', locationSymbol: 'EDDM', lat: 48.3537, lon: 11.7861, sources: ['metar'], isPrimaryFor: { metar: true } },
    // ankara
    { cityId: 'ankara', locationType: 'center', locationSymbol: 'ANK_CTR', lat: 40.1281, lon: 32.9951, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'ankara', locationType: 'airport', locationSymbol: 'LTAC', lat: 40.1281, lon: 32.9951, sources: ['metar'], isPrimaryFor: { metar: true } },
    // amsterdam
    { cityId: 'amsterdam', locationType: 'center', locationSymbol: 'AMS_CTR', lat: 52.3676, lon: 4.9041, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'amsterdam', locationType: 'airport', locationSymbol: 'EHAM', lat: 52.3676, lon: 4.9041, sources: ['metar'], isPrimaryFor: { metar: true } },
    // madrid
    { cityId: 'madrid', locationType: 'center', locationSymbol: 'MAD_CTR', lat: 40.4168, lon: -3.7038, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'madrid', locationType: 'airport', locationSymbol: 'LEMD', lat: 40.4168, lon: -3.7038, sources: ['metar'], isPrimaryFor: { metar: true } },
    // milan
    { cityId: 'milan', locationType: 'center', locationSymbol: 'MIL_CTR', lat: 45.6306, lon: 8.7281, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'milan', locationType: 'airport', locationSymbol: 'LIMC', lat: 45.6306, lon: 8.7281, sources: ['metar'], isPrimaryFor: { metar: true } },
    // warsaw
    { cityId: 'warsaw', locationType: 'center', locationSymbol: 'WAR_CTR', lat: 52.2297, lon: 21.0122, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'warsaw', locationType: 'airport', locationSymbol: 'EPWA', lat: 52.2297, lon: 21.0122, sources: ['metar'], isPrimaryFor: { metar: true } },
    // helsinki
    { cityId: 'helsinki', locationType: 'center', locationSymbol: 'HEL_CTR', lat: 60.1699, lon: 24.9384, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'helsinki', locationType: 'airport', locationSymbol: 'EFHK', lat: 60.1699, lon: 24.9384, sources: ['metar'], isPrimaryFor: { metar: true } },
    // seoul
    { cityId: 'seoul', locationType: 'center', locationSymbol: 'SEL_CTR', lat: 37.4691, lon: 126.4505, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'seoul', locationType: 'airport', locationSymbol: 'RKSI', lat: 37.4691, lon: 126.4505, sources: ['metar'], isPrimaryFor: { metar: true } },
    // tokyo
    { cityId: 'tokyo', locationType: 'center', locationSymbol: 'TYO_CTR', lat: 35.549678, lon: 139.786958, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'tokyo', locationType: 'airport', locationSymbol: 'RJTT', lat: 35.549678, lon: 139.786958, sources: ['metar'], isPrimaryFor: { metar: true } },
    // shanghai
    { cityId: 'shanghai', locationType: 'center', locationSymbol: 'SHA_CTR', lat: 31.1443, lon: 121.8083, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'shanghai', locationType: 'airport', locationSymbol: 'ZSPD', lat: 31.1443, lon: 121.8083, sources: ['metar'], isPrimaryFor: { metar: true } },
    // beijing
    { cityId: 'beijing', locationType: 'center', locationSymbol: 'BEI_CTR', lat: 39.9042, lon: 116.4074, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'beijing', locationType: 'airport', locationSymbol: 'ZBAA', lat: 39.9042, lon: 116.4074, sources: ['metar'], isPrimaryFor: { metar: true } },
    // chengdu
    { cityId: 'chengdu', locationType: 'center', locationSymbol: 'CHE_CTR', lat: 30.5728, lon: 104.0668, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'chengdu', locationType: 'airport', locationSymbol: 'ZUUU', lat: 30.5728, lon: 104.0668, sources: ['metar'], isPrimaryFor: { metar: true } },
    // chongqing
    { cityId: 'chongqing', locationType: 'center', locationSymbol: 'CHO_CTR', lat: 29.5630, lon: 106.5516, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'chongqing', locationType: 'airport', locationSymbol: 'ZUCK', lat: 29.5630, lon: 106.5516, sources: ['metar'], isPrimaryFor: { metar: true } },
    // guangzhou
    { cityId: 'guangzhou', locationType: 'center', locationSymbol: 'GUA_CTR', lat: 23.1291, lon: 113.2644, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'guangzhou', locationType: 'airport', locationSymbol: 'ZGGG', lat: 23.1291, lon: 113.2644, sources: ['metar'], isPrimaryFor: { metar: true } },
    // qingdao
    { cityId: 'qingdao', locationType: 'center', locationSymbol: 'QIN_CTR', lat: 36.0671, lon: 120.3826, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'qingdao', locationType: 'airport', locationSymbol: 'ZSQD', lat: 36.0671, lon: 120.3826, sources: ['metar'], isPrimaryFor: { metar: true } },
    // shenzhen
    { cityId: 'shenzhen', locationType: 'center', locationSymbol: 'SHE_CTR', lat: 22.5431, lon: 114.0579, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'shenzhen', locationType: 'airport', locationSymbol: 'ZGSZ', lat: 22.5431, lon: 114.0579, sources: ['metar'], isPrimaryFor: { metar: true } },
    // wuhan
    { cityId: 'wuhan', locationType: 'center', locationSymbol: 'WUH_CTR', lat: 30.5928, lon: 114.3055, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'wuhan', locationType: 'airport', locationSymbol: 'ZHHH', lat: 30.5928, lon: 114.3055, sources: ['metar'], isPrimaryFor: { metar: true } },
    // singapore
    { cityId: 'singapore', locationType: 'center', locationSymbol: 'SIN_CTR', lat: 1.3502, lon: 103.9940, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'singapore', locationType: 'airport', locationSymbol: 'WSSS', lat: 1.3502, lon: 103.9940, sources: ['metar'], isPrimaryFor: { metar: true } },
    // hong_kong
    { cityId: 'hong_kong', locationType: 'center', locationSymbol: 'HON_CTR', lat: 22.3193, lon: 114.1694, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'hong_kong', locationType: 'airport', locationSymbol: 'VHHH', lat: 22.3193, lon: 114.1694, sources: ['metar'], isPrimaryFor: { metar: true } },
    // taipei
    { cityId: 'taipei', locationType: 'center', locationSymbol: 'TAI_CTR', lat: 25.0777, lon: 121.2333, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'taipei', locationType: 'airport', locationSymbol: 'RCTP', lat: 25.0777, lon: 121.2333, sources: ['metar'], isPrimaryFor: { metar: true } },
    // lucknow
    { cityId: 'lucknow', locationType: 'center', locationSymbol: 'LKO_CTR', lat: 26.7606, lon: 80.8893, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'lucknow', locationType: 'airport', locationSymbol: 'VILK', lat: 26.7606, lon: 80.8893, sources: ['metar'], isPrimaryFor: { metar: true } },
    // karachi
    { cityId: 'karachi', locationType: 'center', locationSymbol: 'KAR_CTR', lat: 24.8607, lon: 67.0011, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'karachi', locationType: 'airport', locationSymbol: 'OPKC', lat: 24.8607, lon: 67.0011, sources: ['metar'], isPrimaryFor: { metar: true } },
    // jakarta
    { cityId: 'jakarta', locationType: 'center', locationSymbol: 'JAK_CTR', lat: -6.2088, lon: 106.8456, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'jakarta', locationType: 'airport', locationSymbol: 'WIII', lat: -6.2088, lon: 106.8456, sources: ['metar'], isPrimaryFor: { metar: true } },
    // kuala_lumpur
    { cityId: 'kuala_lumpur', locationType: 'center', locationSymbol: 'KUA_CTR', lat: 3.1390, lon: 101.6869, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'kuala_lumpur', locationType: 'airport', locationSymbol: 'WMKK', lat: 3.1390, lon: 101.6869, sources: ['metar'], isPrimaryFor: { metar: true } },
    // manila
    { cityId: 'manila', locationType: 'center', locationSymbol: 'MAN_CTR', lat: 14.5995, lon: 120.9842, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'manila', locationType: 'airport', locationSymbol: 'RPLL', lat: 14.5995, lon: 120.9842, sources: ['metar'], isPrimaryFor: { metar: true } },
    // busan
    { cityId: 'busan', locationType: 'center', locationSymbol: 'BUS_CTR', lat: 35.0796, lon: 129.0231, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'busan', locationType: 'airport', locationSymbol: 'RKPK', lat: 35.0796, lon: 129.0231, sources: ['metar'], isPrimaryFor: { metar: true } },
    // istanbul
    { cityId: 'istanbul', locationType: 'center', locationSymbol: 'IST_CTR', lat: 41.2749, lon: 28.7321, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'istanbul', locationType: 'airport', locationSymbol: 'LTFM', lat: 41.2749, lon: 28.7321, sources: ['metar'], isPrimaryFor: { metar: true } },
    // jeddah
    { cityId: 'jeddah', locationType: 'center', locationSymbol: 'JED_CTR', lat: 21.5433, lon: 39.1727, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'jeddah', locationType: 'airport', locationSymbol: 'OEJN', lat: 21.5433, lon: 39.1727, sources: ['metar'], isPrimaryFor: { metar: true } },
    // tel_aviv
    { cityId: 'tel_aviv', locationType: 'center', locationSymbol: 'TLV_CTR', lat: 32.0114, lon: 34.8867, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'tel_aviv', locationType: 'airport', locationSymbol: 'LLBG', lat: 32.0114, lon: 34.8867, sources: ['metar'], isPrimaryFor: { metar: true } },
    // moscow
    { cityId: 'moscow', locationType: 'center', locationSymbol: 'MOS_CTR', lat: 55.7558, lon: 37.6173, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'moscow', locationType: 'airport', locationSymbol: 'UUWW', lat: 55.7558, lon: 37.6173, sources: ['metar'], isPrimaryFor: { metar: true } },
    // toronto
    { cityId: 'toronto', locationType: 'center', locationSymbol: 'YTO_CTR', lat: 43.6772, lon: -79.6306, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'toronto', locationType: 'airport', locationSymbol: 'CYYZ', lat: 43.6772, lon: -79.6306, sources: ['metar'] },
    // sao_paulo
    { cityId: 'sao_paulo', locationType: 'center', locationSymbol: 'SAO_CTR', lat: -23.4356, lon: -46.4731, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'sao_paulo', locationType: 'airport', locationSymbol: 'SBGR', lat: -23.4356, lon: -46.4731, sources: ['metar'], isPrimaryFor: { metar: true } },
    // buenos_aires
    { cityId: 'buenos_aires', locationType: 'center', locationSymbol: 'BUE_CTR', lat: -34.8222, lon: -58.5358, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'buenos_aires', locationType: 'airport', locationSymbol: 'SAEZ', lat: -34.8222, lon: -58.5358, sources: ['metar'], isPrimaryFor: { metar: true } },
    // mexico_city
    { cityId: 'mexico_city', locationType: 'center', locationSymbol: 'MEX_CTR', lat: 19.4326, lon: -99.1332, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'mexico_city', locationType: 'airport', locationSymbol: 'MMMX', lat: 19.4326, lon: -99.1332, sources: ['metar'], isPrimaryFor: { metar: true } },
    // panama_city
    { cityId: 'panama_city', locationType: 'center', locationSymbol: 'PAN_CTR', lat: 8.9824, lon: -79.5199, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'panama_city', locationType: 'airport', locationSymbol: 'MPMG', lat: 8.9824, lon: -79.5199, sources: ['metar'], isPrimaryFor: { metar: true } },
    // cape_town
    { cityId: 'cape_town', locationType: 'center', locationSymbol: 'CAP_CTR', lat: -33.9249, lon: 18.4241, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'cape_town', locationType: 'airport', locationSymbol: 'FACT', lat: -33.9249, lon: 18.4241, sources: ['metar'], isPrimaryFor: { metar: true } },
    // lagos
    { cityId: 'lagos', locationType: 'center', locationSymbol: 'LAG_CTR', lat: 6.5774, lon: 3.3212, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'lagos', locationType: 'airport', locationSymbol: 'DNMM', lat: 6.5774, lon: 3.3212, sources: ['metar'], isPrimaryFor: { metar: true } },
    // wellington
    { cityId: 'wellington', locationType: 'center', locationSymbol: 'WLG_CTR', lat: -41.3272, lon: 174.8052, sources: ['open-meteo', 'openweathermap', 'tomorrow', 'visualcrossing'] },
    { cityId: 'wellington', locationType: 'airport', locationSymbol: 'NZWN', lat: -41.3272, lon: 174.8052, sources: ['metar'], isPrimaryFor: { metar: true } },
];

// ─── lookup helpers ──────────────────────────────────────────────────────────

const _BY_ID: Map<string, WeatherCity> = new Map(WEATHER_CITIES.map((c) => [c.id, c]));
const _BY_CITY_CODE: Map<string, WeatherCity> = new Map(WEATHER_CITIES.map((c) => [c.cityCode, c]));

const _LOCATIONS_BY_CITY: Map<string, WeatherLocation[]> = new Map();
const _LOCATIONS_BY_SOURCE: Map<SourceName, WeatherLocation[]> = new Map();
const _LOCATION_BY_SYMBOL: Map<string, WeatherLocation> = new Map();

for (const loc of WEATHER_LOCATIONS) {
    const key = _LOCATIONS_BY_CITY.get(loc.cityId) ?? _LOCATIONS_BY_CITY.set(loc.cityId, []).get(loc.cityId)!;
    key.push(loc);
    for (const src of loc.sources) {
        const srcKey = _LOCATIONS_BY_SOURCE.get(src) ?? _LOCATIONS_BY_SOURCE.set(src, []).get(src)!;
        srcKey.push(loc);
    }
    _LOCATION_BY_SYMBOL.set(loc.locationSymbol, loc);
}

const _ALIAS_INDEX: Map<string, string> = (() => {
    const m = new Map<string, string>();
    const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, '_');
    for (const c of WEATHER_CITIES) {
        m.set(norm(c.id), c.id);
        m.set(norm(c.name), c.id);
        m.set(norm(c.cityCode), c.id);
        for (const a of c.aliases) m.set(norm(a), c.id);
    }
    return m;
})();

export function getLocationsByCity(cityId: string): WeatherLocation[] {
    return _LOCATIONS_BY_CITY.get(cityId) ?? [];
}

export function getLocationsBySource(source: SourceName): WeatherLocation[] {
    return _LOCATIONS_BY_SOURCE.get(source) ?? [];
}

export function getPrimaryLocation(cityId: string, source: SourceName): WeatherLocation | undefined {
    const locs = getLocationsByCity(cityId);
    return locs.find((l) => l.sources.includes(source) && l.isPrimaryFor?.[source])
        ?? locs.find((l) => l.sources.includes(source));
}

export function getLocationBySymbol(symbol: string): WeatherLocation | undefined {
    return _LOCATION_BY_SYMBOL.get(symbol);
}

export function getCityByLocationSymbol(symbol: string): WeatherCity | undefined {
    const loc = _LOCATION_BY_SYMBOL.get(symbol);
    return loc ? _BY_ID.get(loc.cityId) : undefined;
}

/** Resolve any source-specific city name to canonical id. Returns null if unknown. */
export function normalizeCityId(input: string): string | null {
    if (!input) return null;
    const k = input.trim().toLowerCase().replace(/[\s-]+/g, '_');
    return _ALIAS_INDEX.get(k) ?? null;
}

export function getCity(id: string): WeatherCity | undefined {
    return _BY_ID.get(id);
}

export function getCityByCityCode(code: string): WeatherCity | undefined {
    return _BY_CITY_CODE.get(code.toUpperCase());
}

export function getTimezone(id: string): string | undefined {
    return _BY_ID.get(id)?.timezone;
}

export function citiesInRegion(region: Region): WeatherCity[] {
    return WEATHER_CITIES.filter((c) => c.region === region);
}


/** Get all cities covered by a specific market. */
export function citiesByMarket(market: 'polymarket' | 'kalshi'): WeatherCity[] {
    return WEATHER_CITIES.filter((c) => c[market]);
}