<script lang="ts">
    import { onMount } from 'svelte';
    import { enokiFlow } from '$lib/enoki';
    import { env } from '$env/dynamic/public';
    import { sha256 } from 'js-sha256';
    
    // Import chuẩn thư viện của Sui SDK v2.0
    import { Transaction } from '@mysten/sui/transactions';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

    // Sử dụng Rune ($state) của Svelte 5 để UI tự động cập nhật
    let isAuthenticated = $state(false);
    let userAddress = $state('');
    let fileHash = $state('');
    let isSaving = $state(false);
    let txDigest = $state('');

    onMount(async () => {
        try { 
            // Hứng callback từ Google
            await enokiFlow.handleAuthCallback(); 
        } catch (error) {
            console.log("Không có dữ liệu xác thực trên URL.");
        }
        
        // Khôi phục phiên đăng nhập zkLogin
        const session = await enokiFlow.getSession();
        if (session && session.jwt) {
            isAuthenticated = true;
            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            userAddress = keypair.toSuiAddress();
            
            // Làm sạch thanh địa chỉ URL
            window.history.replaceState(null, '', window.location.pathname);
        }
    });

    async function loginWithGoogle() {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const url = await enokiFlow.createAuthorizationURL({
            provider: 'google',
            clientId: env.PUBLIC_GOOGLE_CLIENT_ID,
            redirectUrl: `${protocol}//${host}`, 
            network: 'testnet'
        });
        window.location.href = url;
    }

    function handleFileUpload(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            fileHash = sha256(arrayBuffer); // Băm file ngay trên trình duyệt
            txDigest = ''; // Reset kết quả giao dịch cũ
        };
        reader.readAsArrayBuffer(file);
    }

    async function handleSaveToBlockchain() {
        isSaving = true;
        try {
            // Khởi tạo Client tương tác với mạng Testnet (Chuẩn v2.0)
            const suiClient = new SuiJsonRpcClient({ 
                url: getJsonRpcFullnodeUrl('testnet') 
            });

            // 1. Tạo gói giao dịch (Chưa ký, chưa có tiền gas)
            const tx = new Transaction();
            tx.moveCall({
                target: `${env.PUBLIC_PACKAGE_ID}::${env.PUBLIC_MODULE_NAME}::${env.PUBLIC_FUNCTION_NAME}`,
                arguments: [
                    tx.pure.string(fileHash), 
                    tx.object('0x6') // Object Clock để lấy thời gian on-chain
                ]
            });
            tx.setSender(userAddress);

            // Chuyển đổi giao dịch thành mảng bytes và mã hóa Base64
            const txbBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
            const txbBase64 = btoa(txbBytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));

            // 2. Gửi sang API Backend để xin Enoki tài trợ phí gas
            const sponsorRes = await fetch('/api/sponsor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txbBytes: txbBase64, sender: userAddress })
            });
            const sponsorData = await sponsorRes.json();
            
            if (sponsorData.error) throw new Error(sponsorData.error);

            // 3. Sử dụng zkLogin để ký giao dịch âm thầm
            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            
            // Giải mã chuỗi Base64 từ Backend về lại mảng byte nguyên thủy
            const txBytes = Uint8Array.from(atob(sponsorData.sponsoredTxBytes), c => c.charCodeAt(0));

            // Logic ký tương thích ngược giữa các phiên bản SDK
            const signResult = keypair.signTransaction 
                ? await keypair.signTransaction(txBytes) 
                : await keypair.signTransactionBlock(txBytes);

            // ==========================================
            // ĐÃ SỬA: BƯỚC 4
            // ==========================================
            // Gửi chữ ký của người dùng lên Backend để Enoki ra lệnh thực thi
            const executeRes = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    digest: sponsorData.digest, 
                    signature: signResult.signature 
                })
            });
            const executeData = await executeRes.json();
            
            if (executeData.error) throw new Error(executeData.error);

            // Lưu lại mã giao dịch để hiển thị link SuiScan
            txDigest = executeData.digest;
            // ==========================================

        } catch (error: any) {
            console.error("Lỗi khi lưu blockchain:", error);
            alert("Có lỗi xảy ra: " + error.message);
        } finally {
            isSaving = false;
        }
    }
</script>

<main style="padding: 2rem; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
    <h1>Hệ Thống Document Vault</h1>
    
    {#if !isAuthenticated}
        <p>Vui lòng đăng nhập để lưu trữ mã băm tài liệu. Không cần ví, không cần phí gas!</p>
        <button onclick={loginWithGoogle} style="padding: 10px 20px; cursor: pointer; font-size: 16px; background-color: #4285F4; color: white; border: none; border-radius: 4px;">
            Đăng nhập bằng Google
        </button>
    {:else}
        <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; border: 1px solid #c8e6c9;">
            <h3 style="margin-top: 0; color: #2e7d32;">✅ Đăng nhập thành công</h3>
            <p><strong>Ví zkLogin của bạn:</strong> <br>
                <code style="word-break: break-all; color: #d32f2f;">{userAddress}</code>
            </p>
            <button onclick={() => { enokiFlow.logout(); isAuthenticated = false; }} style="color: white; background-color: #d32f2f; cursor: pointer; margin-top: 10px; padding: 6px 12px; border: none; border-radius: 4px;">
                Đăng xuất
            </button>
        </div>

        <div style="margin-top: 2rem; padding: 1.5rem; border: 1px dashed #ccc; border-radius: 8px;">
            <h3>Tải tài liệu cần xác thực</h3>
            <input type="file" onchange={handleFileUpload} style="margin-bottom: 1rem;" disabled={isSaving} />
            
            {#if fileHash}
                <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                    <p style="margin-top: 0;"><strong>Mã băm SHA-256 (Mã này sẽ đẩy lên chuỗi):</strong></p>
                    <code style="word-break: break-all; color: #0056b3; font-size: 1.1em;">{fileHash}</code>
                    
                    <button 
                        onclick={handleSaveToBlockchain} 
                        disabled={isSaving}
                        style="display: block; margin-top: 1.5rem; padding: 12px 24px; background: {isSaving ? '#ccc' : '#007bff'}; color: white; cursor: {isSaving ? 'not-allowed' : 'pointer'}; border: none; border-radius: 6px; font-weight: bold; width: 100%;"
                    >
                        {isSaving ? 'Đang giao tiếp với mạng lưới Sui...' : 'Lưu lên Blockchain'}
                    </button>

                    {#if txDigest}
                        <div style="margin-top: 1rem; padding: 10px; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 4px;">
                            <p style="color: #2e7d32; margin: 0;">🎉 <strong>Lưu trữ thành công!</strong></p>
                            <p style="font-size: 0.9em; margin-bottom: 0;">Xem chứng nhận trên mạng lưới:</p>
                            <a href="https://suiscan.xyz/testnet/tx/{txDigest}" target="_blank" style="word-break: break-all; font-size: 0.85em;">
                                {txDigest}
                            </a>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</main>