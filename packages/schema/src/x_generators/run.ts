/**
 * Code Generator Runner
 * =====================
 * Runs all generators and writes output files.
 * Usage: pnpm --filter @repo/schema codegen
 *
 * All generators now read ALL_TABLE_CONFIGS (TableConfig[]) — Phase 3 complete.
 * SQL generator also emits compression DDL for tables with TableConfig.compression.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_TABLE_CONFIGS } from '../index';
import { generateSql } from './sql.js';
import { generateGraphQL } from './graphql.js';
import { generateCsv } from './csv.js';
import { generatePython } from './python.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Output directories
const GENERATED_DIR = resolve(__dirname, '../../generated');
const ML_SERVER_DIR = resolve(__dirname, '../../../../apps/ml_server/src');

function writeFile(path: string, content: string): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, 'utf-8');
    console.log(`  ✅ ${path}`);
}

async function main() {
    console.log('🔄 @repo/schema codegen starting...\n');

    // 1. SQL DDL (CREATE TABLE + hypertable + compression + indexes)
    const sql = generateSql(ALL_TABLE_CONFIGS);
    writeFile(resolve(GENERATED_DIR, '001_tables.sql'), sql);

    // 2. GraphQL typeDefs
    const graphql = generateGraphQL(ALL_TABLE_CONFIGS);
    writeFile(resolve(GENERATED_DIR, 'typeDefs.ts'), graphql);

    // 3. CSV headers
    const csv = generateCsv(ALL_TABLE_CONFIGS);
    writeFile(resolve(GENERATED_DIR, 'csv.ts'), csv);

    // 4. Python Pydantic models (for ML server — reads from DB via Pydantic BaseModel)
    //    betterproto (for Kafka proto binary consumers) is activated separately in buf.gen.yaml
    const python = generatePython(ALL_TABLE_CONFIGS);
    writeFile(resolve(GENERATED_DIR, 'schemas.py'), python);

    try {
        writeFile(resolve(ML_SERVER_DIR, 'schemas.py'), python);
    } catch {
        console.log(
            '  ⚠️  apps/ml_server/src/ not found, skipping Python output there'
        );
    }

    console.log('\n✅ codegen complete!');
}

main().catch((e) => {
    console.error('❌ codegen failed:', e);
    process.exit(1);
});
