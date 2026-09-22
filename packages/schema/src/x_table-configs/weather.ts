/**
 * Weather Table Configs (Protobuf SSOT)
 */

import type { TableConfig } from '../utils';

// ─── weather_observation ──────────────────────────────────────────────────────

export const WEATHER_OBSERVATION_CONFIG: TableConfig = {
    name: 'weather_observation',
    fieldTypes: {
        time:           'TIMESTAMPTZ NOT NULL',
        source:         'TEXT NOT NULL',
        location:       'TEXT NOT NULL',
        lat:            'DOUBLE PRECISION',
        lon:            'DOUBLE PRECISION',
        temperature:    'DOUBLE PRECISION',
        humidity:       'DOUBLE PRECISION',
        wind_speed:     'DOUBLE PRECISION',
        wind_direction: 'DOUBLE PRECISION',
        pressure:       'DOUBLE PRECISION',
        cloud_cover:    'DOUBLE PRECISION',
        precipitation:  'DOUBLE PRECISION',
        conditions:     'TEXT',
        raw_station_id:   'TEXT',
        raw_station_name: 'TEXT',
        raw_message:      'TEXT',
        quality_flag:     'TEXT',
        station_network:  'TEXT',
        temperature_unit: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    compression: { segmentBy: 'location, source', orderBy: 'time DESC', after: '7 days' },
    indexes: [
        { name: 'idx_weather_observation_location', columns: ['source', 'location', 'time DESC'] },
    ],
};

// ─── weather_alert ────────────────────────────────────────────────────────────

export const WEATHER_ALERT_CONFIG: TableConfig = {
    name: 'weather_alert',
    fieldTypes: {
        time:           'TIMESTAMPTZ NOT NULL',
        source:         'TEXT NOT NULL',
        location:       'TEXT NOT NULL',
        alert_type:     'TEXT',
        alert_severity: 'TEXT',
        conditions:     'TEXT',
        raw_event:       'TEXT',
        raw_headline:    'TEXT',
        raw_sender_name: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    compression: { segmentBy: 'location, source', orderBy: 'time DESC', after: '7 days' },
    indexes: [
        { name: 'idx_weather_alert_location', columns: ['source', 'location', 'time DESC'] },
    ],
};

// ─── weather_forecast ────────────────────────────────────────────────────────

export const WEATHER_FORECAST_CONFIG: TableConfig = {
    name: 'weather_forecast',
    fieldTypes: {
        time:                      'TIMESTAMPTZ NOT NULL',
        source:                    'TEXT NOT NULL',
        location:                  'TEXT NOT NULL',
        lat:                       'DOUBLE PRECISION',
        lon:                       'DOUBLE PRECISION',
        temperature:               'DOUBLE PRECISION',
        humidity:                  'DOUBLE PRECISION',
        wind_speed:                'DOUBLE PRECISION',
        wind_direction:            'DOUBLE PRECISION',
        pressure:                  'DOUBLE PRECISION',
        cloud_cover:               'DOUBLE PRECISION',
        precipitation:             'DOUBLE PRECISION',
        precipitation_probability: 'DOUBLE PRECISION',
        conditions:                'TEXT',
        raw_valid_time:            'TEXT',
        raw_temperature_unit:      'TEXT',
        temperature_unit:          'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    compression: { segmentBy: 'location, source', orderBy: 'time DESC', after: '7 days' },
    indexes: [
        { name: 'idx_weather_forecast_location', columns: ['source', 'location', 'time DESC'] },
    ],
};

// ─── weather_forecast_hourly ──────────────────────────────────────────────────

export const WEATHER_FORECAST_HOURLY_CONFIG: TableConfig = {
    name: 'weather_forecast_hourly',
    fieldTypes: {
        forecast_for_time:        'TIMESTAMPTZ NOT NULL',
        forecast_observed_at:     'TEXT NOT NULL',
        slot:                     'TEXT NOT NULL',
        forecast_generated_at:    'TIMESTAMPTZ',
        source:                   'TEXT NOT NULL',
        location:                 'TEXT NOT NULL',
        lat:                      'DOUBLE PRECISION',
        lon:                      'DOUBLE PRECISION',
        temperature:              'DOUBLE PRECISION',
        humidity:                 'DOUBLE PRECISION',
        wind_speed:               'DOUBLE PRECISION',
        wind_direction:           'DOUBLE PRECISION',
        precipitation_probability:'DOUBLE PRECISION',
        conditions:               'TEXT',
        raw_valid_time:           'TEXT',
        raw_end_time:             'TEXT',
        raw_wind_speed:           'TEXT',
        raw_wind_direction:       'TEXT',
        raw_temperature_unit:     'TEXT',
        raw_forecast_generator:   'TEXT',
        raw_valid_times:          'TEXT',
        temperature_unit:         'TEXT',
    },
    hypertable: { timeColumn: 'forecast_for_time', chunkInterval: '1 day' },
    compression: {
        segmentBy: 'location, source',
        orderBy: 'forecast_observed_at DESC, slot DESC, forecast_for_time DESC',
        after: '7 days',
    },
    indexes: [
        {
            name: 'idx_weather_forecast_hourly_location',
            columns: ['source', 'location', 'forecast_for_time DESC'],
        },
    ],
};

// ─── weather_forecast_daily ───────────────────────────────────────────────────

export const WEATHER_FORECAST_DAILY_CONFIG: TableConfig = {
    name: 'weather_forecast_daily',
    fieldTypes: {
        forecast_for_date:        'TEXT NOT NULL',
        forecast_observed_at:     'TEXT NOT NULL',
        slot:                     'TEXT NOT NULL',
        forecast_generated_at:    'TIMESTAMPTZ',
        source:                   'TEXT NOT NULL',
        location:                 'TEXT NOT NULL',
        lat:                      'DOUBLE PRECISION',
        lon:                      'DOUBLE PRECISION',
        temperature_max:          'DOUBLE PRECISION',
        temperature_min:          'DOUBLE PRECISION',
        conditions:               'TEXT',
        raw_model:                'TEXT',
        raw_valid_times:          'TEXT',
        temperature_unit:         'TEXT',
    },
    // No hypertable: forecast_for_date is TEXT (raw ISO 8601 passthrough from
    // proto), which TimescaleDB cannot use as a time column. ClickHouse path
    // uses no PARTITION BY (small table, single partition is fine).
    compression: {
        segmentBy: 'location, source',
        orderBy: 'forecast_observed_at DESC, slot DESC, forecast_for_date DESC',
        after: '30 days',
    },
    indexes: [
        {
            name: 'idx_weather_forecast_daily_location',
            columns: ['source', 'location', 'forecast_for_date DESC'],
        },
    ],
};

// ─── weather_hist ─────────────────────────────────────────────────────────────

export const WEATHER_HIST_CONFIG: TableConfig = {
    name: 'weather_hist',
    fieldTypes: {
        time:           'TIMESTAMPTZ NOT NULL',
        source:         'TEXT NOT NULL',
        location:       'TEXT NOT NULL',
        station:        'TEXT',
        temp_max:       'DOUBLE PRECISION',
        temp_min:       'DOUBLE PRECISION',
        temp_avg:       'DOUBLE PRECISION',
        precipitation:    'DOUBLE PRECISION',
        snowfall:         'DOUBLE PRECISION',
        avg_wind_speed:   'DOUBLE PRECISION',
        temperature_unit: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '30 days' },
    compression: { segmentBy: 'location, source', orderBy: 'time DESC', after: '90 days' },
};

/** @deprecated Use WEATHER_OBSERVATION_CONFIG */
export const WEATHER_LIVE_CONFIG = WEATHER_OBSERVATION_CONFIG;
