import { Configuration } from 'kalshi-typescript';
import crypto from 'node:crypto';
import fs from 'node:fs';

export interface CreateKalshiConfigInput {
    apiKeyId: string;
    privateKeyPath?: string;
    privateKeyPem?: string;
    baseUrl?: string;
}

export function createKalshiConfig(input: CreateKalshiConfigInput): Configuration {
    if (!input.privateKeyPath && !input.privateKeyPem) {
        throw new Error('createKalshiConfig: provide privateKeyPath or privateKeyPem');
    }
    return new Configuration({
        apiKey: input.apiKeyId,
        privateKeyPath: input.privateKeyPath,
        privateKeyPem: input.privateKeyPem,
        basePath: input.baseUrl,
    });
}

export interface CreateKalshiSignerInput {
    apiKeyId: string;
    privateKeyPath?: string;
    privateKeyPem?: string;
}

export type KalshiSigner = (method: string, path: string) => Record<string, string>;

export function createKalshiSigner(input: CreateKalshiSignerInput): KalshiSigner {
    if (!input.apiKeyId) {
        throw new Error('createKalshiSigner: apiKeyId is required');
    }
    if (!input.privateKeyPath && !input.privateKeyPem) {
        throw new Error('createKalshiSigner: provide privateKeyPath or privateKeyPem');
    }

    const pem = input.privateKeyPem ?? fs.readFileSync(input.privateKeyPath!, 'utf8');
    const pk = crypto.createPrivateKey(pem);

    return (method, path) => {
        const ts = Date.now().toString();
        const sig = crypto.sign('sha256', Buffer.from(`${ts}${method}${path}`), {
            key: pk,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        });
        return {
            'KALSHI-ACCESS-KEY': input.apiKeyId,
            'KALSHI-ACCESS-SIGNATURE': sig.toString('base64'),
            'KALSHI-ACCESS-TIMESTAMP': ts,
        };
    };
}
