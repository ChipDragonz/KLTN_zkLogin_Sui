// src/routes/api/sponsor/+server.ts
import { json, type RequestEvent } from '@sveltejs/kit';
import { EnokiClient } from '@mysten/enoki';
import { ENOKI_PRIVATE_KEY } from '$env/static/private';

export async function POST({ request }: RequestEvent) {
    try {
        const { txbBytes, sender } = await request.json();
        const enokiServer = new EnokiClient({ apiKey: ENOKI_PRIVATE_KEY });

        const sponsoredTx = await enokiServer.createSponsoredTransaction({
            network: 'testnet',
            transactionKindBytes: txbBytes,
            sender: sender,
        });

        // Chỉ trả về bytes và digest như cũ
        return json({
            sponsoredTxBytes: sponsoredTx.bytes,
            digest: sponsoredTx.digest
        });
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return json({ error: errorMessage }, { status: 500 });
    }
}