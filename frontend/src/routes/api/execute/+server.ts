// src/routes/api/execute/+server.ts
import { json, type RequestEvent } from '@sveltejs/kit';
import { EnokiClient } from '@mysten/enoki';
import { ENOKI_PRIVATE_KEY } from '$env/static/private';

export async function POST({ request }: RequestEvent) {
    try {
        // Nhận mã giao dịch và chữ ký của người dùng từ Frontend
        const { digest, signature } = await request.json();
        const enokiServer = new EnokiClient({ apiKey: ENOKI_PRIVATE_KEY });

        // Giao lại cho Enoki thực thi (Nó sẽ tự gắn chữ ký tài trợ của nó vào)
        const executeRes = await enokiServer.executeSponsoredTransaction({
            digest: digest,
            signature: signature
        });

        // Trả kết quả thành công về cho Web
        return json({ digest: executeRes.digest });
        
    } catch (error: unknown) {
        console.error("Lỗi thực thi Enoki:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return json({ error: errorMessage }, { status: 500 });
    }
}