<script lang="ts">
    import { onMount } from 'svelte';
    import { enokiFlow } from '$lib/enoki';
    import { env } from '$env/dynamic/public';
    import { sha256 } from 'js-sha256';
    import { Transaction } from '@mysten/sui/transactions';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

    // Biến trạng thái đăng nhập
    let isAuthenticated = $state(false);
    let userAddress = $state('');
    
    // Biến cho phần LƯU TRỮ
    let fileHash = $state('');
    let isSaving = $state(false);
    let txDigest = $state('');

    // Biến cho phần XÁC THỰC (MỚI)
    let verifyFileHash = $state('');
    let isVerifying = $state(false);
    let verifyResult = $state<'success' | 'fail' | null>(null);
    let verifyTimestamp = $state('');

    onMount(async () => {
        try { await enokiFlow.handleAuthCallback(); } catch (error) { console.log("No auth callback."); }
        const session = await enokiFlow.getSession();
        if (session && session.jwt) {
            isAuthenticated = true;
            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            userAddress = keypair.toSuiAddress();
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

    // ==========================================
    // LOGIC PHẦN 1: LƯU TRỮ TÀI LIỆU
    // ==========================================
    function handleFileUpload(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            fileHash = sha256(arrayBuffer);
            txDigest = ''; 
        };
        reader.readAsArrayBuffer(file);
    }

    async function handleSaveToBlockchain() {
        isSaving = true;
        try {
            const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet') });
            const tx = new Transaction();
            tx.moveCall({
                target: `${env.PUBLIC_PACKAGE_ID}::${env.PUBLIC_MODULE_NAME}::${env.PUBLIC_FUNCTION_NAME}`,
                arguments: [ tx.pure.string(fileHash), tx.object('0x6') ]
            });
            tx.setSender(userAddress);

            const txbBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
            const txbBase64 = btoa(txbBytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));

            const sponsorRes = await fetch('/api/sponsor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txbBytes: txbBase64, sender: userAddress })
            });
            const sponsorData = await sponsorRes.json();
            if (sponsorData.error) throw new Error(sponsorData.error);

            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            const txBytes = Uint8Array.from(atob(sponsorData.sponsoredTxBytes), c => c.charCodeAt(0));
            const signResult = keypair.signTransaction ? await keypair.signTransaction(txBytes) : await keypair.signTransactionBlock(txBytes);

            const executeRes = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ digest: sponsorData.digest, signature: signResult.signature })
            });
            const executeData = await executeRes.json();
            if (executeData.error) throw new Error(executeData.error);

            txDigest = executeData.digest;
        } catch (error: any) {
            console.error("Lỗi:", error);
            alert("Có lỗi: " + error.message);
        } finally {
            isSaving = false;
        }
    }

    // ==========================================
    // LOGIC PHẦN 2: XÁC THỰC TÀI LIỆU (GIAI ĐOẠN 5)
    // ==========================================
    function handleVerifyUpload(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        verifyResult = null; // Reset kết quả cũ
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            verifyFileHash = sha256(arrayBuffer);
        };
        reader.readAsArrayBuffer(file);
    }

    async function verifyOnBlockchain() {
        isVerifying = true;
        verifyResult = null;
        try {
            const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet') });
            
            // Tìm tất cả các Object thuộc sở hữu của user (Vì hàm contract dùng transfer::transfer cho owner)
            const objects = await suiClient.getOwnedObjects({
                owner: userAddress,
                filter: { StructType: `${env.PUBLIC_PACKAGE_ID}::${env.PUBLIC_MODULE_NAME}::DocumentRecord` },
                options: { showContent: true }
            });

            // Lặp qua dữ liệu trên Blockchain để tìm mã băm khớp
            let isFound = false;
            for (const obj of objects.data) {
                // Ép kiểu an toàn để lấy data
                const content = obj.data?.content as any; 
                if (content?.fields?.hash_value === verifyFileHash) {
                    isFound = true;
                    // Lấy thời gian lưu trữ (chuyển từ timestamp Unix sang giờ Việt Nam)
                    const date = new Date(Number(content.fields.timestamp));
                    verifyTimestamp = date.toLocaleString('vi-VN');
                    break;
                }
            }

            verifyResult = isFound ? 'success' : 'fail';

        } catch (error) {
            console.error("Lỗi đọc blockchain:", error);
            alert("Lỗi khi kết nối mạng lưới Sui");
        } finally {
            isVerifying = false;
        }
    }
</script>

<main style="padding: 2rem; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
    <h1 style="text-align: center; color: #1a1a1a;">Hệ Thống Document Vault</h1>
    
    {#if !isAuthenticated}
        <div style="text-align: center; margin-top: 50px;">
            <p>Vui lòng đăng nhập để lưu trữ và xác thực tài liệu.</p>
            <button onclick={loginWithGoogle} style="padding: 12px 24px; cursor: pointer; font-size: 16px; background-color: #4285F4; color: white; border: none; border-radius: 6px; font-weight: bold;">
                Đăng nhập bằng Google
            </button>
        </div>
    {:else}
        <div style="background: #e8f5e9; padding: 1rem 1.5rem; border-radius: 8px; border: 1px solid #c8e6c9; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="margin: 0 0 5px 0; color: #2e7d32;">✅ Trạng thái: Đã kết nối zkLogin</h4>
                <code style="color: #d32f2f; font-size: 0.85em;">{userAddress}</code>
            </div>
            <button onclick={() => { enokiFlow.logout(); isAuthenticated = false; }} style="color: white; background-color: #d32f2f; cursor: pointer; padding: 6px 12px; border: none; border-radius: 4px;">
                Đăng xuất
            </button>
        </div>

        <div style="margin-top: 2rem; padding: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h2 style="margin-top: 0; color: #0056b3;">📤 1. Khởi tạo & Lưu trữ</h2>
            <p style="font-size: 0.9em; color: #666;">Tải tài liệu gốc lên để băm và lưu bằng chứng lên mạng lưới Sui.</p>
            
            <input type="file" onchange={handleFileUpload} style="margin-bottom: 1rem;" disabled={isSaving} />
            
            {#if fileHash}
                <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                    <p style="margin: 0 0 5px 0; font-size: 0.9em;">Mã băm SHA-256:</p>
                    <code style="word-break: break-all; color: #333;">{fileHash}</code>
                    
                    <button onclick={handleSaveToBlockchain} disabled={isSaving} style="display: block; margin-top: 1.5rem; padding: 10px; background: {isSaving ? '#ccc' : '#007bff'}; color: white; cursor: {isSaving ? 'not-allowed' : 'pointer'}; border: none; border-radius: 4px; width: 100%; font-weight: bold;">
                        {isSaving ? 'Đang thực thi giao dịch...' : 'Lưu bản quyền lên Blockchain'}
                    </button>

                    {#if txDigest}
                        <div style="margin-top: 1rem; padding: 10px; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 4px; font-size: 0.9em;">
                            🎉 <strong>Thành công!</strong> Mã giao dịch: <br>
                            <a href="https://suiscan.xyz/testnet/tx/{txDigest}" target="_blank">{txDigest}</a>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <div style="margin-top: 2rem; padding: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h2 style="margin-top: 0; color: #e65100;">🔍 2. Kiểm tra & Xác thực</h2>
            <p style="font-size: 0.9em; color: #666;">Tải một tài liệu bất kỳ lên để kiểm tra xem nó có khớp với bản gốc trên Blockchain không.</p>
            
            <input type="file" onchange={handleVerifyUpload} style="margin-bottom: 1rem;" disabled={isVerifying} />
            
            {#if verifyFileHash}
                <div style="margin-top: 1rem; padding: 1rem; background: #fff3e0; border-radius: 4px;">
                    <p style="margin: 0 0 5px 0; font-size: 0.9em;">Mã băm tệp đang kiểm tra:</p>
                    <code style="word-break: break-all; color: #333;">{verifyFileHash}</code>
                    
                    <button onclick={verifyOnBlockchain} disabled={isVerifying} style="display: block; margin-top: 1.5rem; padding: 10px; background: {isVerifying ? '#ccc' : '#f57c00'}; color: white; cursor: {isVerifying ? 'not-allowed' : 'pointer'}; border: none; border-radius: 4px; width: 100%; font-weight: bold;">
                        {isVerifying ? 'Đang truy vấn mạng lưới...' : 'Truy xuất Blockchain để đối chiếu'}
                    </button>

                    {#if verifyResult === 'success'}
                        <div style="margin-top: 1rem; padding: 15px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 4px; text-align: center;">
                            <h3 style="color: #2e7d32; margin: 0 0 10px 0;">✅ TÀI LIỆU HỢP LỆ</h3>
                            <p style="margin: 0; font-size: 0.95em;">Tính nguyên vẹn được đảm bảo 100%.</p>
                            <p style="margin: 5px 0 0 0; font-size: 0.85em; color: #666;">Thời gian lưu trữ bản gốc: {verifyTimestamp}</p>
                        </div>
                    {:else if verifyResult === 'fail'}
                        <div style="margin-top: 1rem; padding: 15px; background: #ffebee; border: 2px solid #f44336; border-radius: 4px; text-align: center;">
                            <h3 style="color: #c62828; margin: 0 0 10px 0;">❌ CẢNH BÁO GIẢ MẠO</h3>
                            <p style="margin: 0; font-size: 0.95em;">Tài liệu này đã bị chỉnh sửa hoặc chưa từng được lưu trữ trên Blockchain bởi bạn!</p>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</main>