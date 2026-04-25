<script lang="ts">
    import { env } from '$env/dynamic/public';
    import { sha256 } from 'js-sha256';
    import { Transaction } from '@mysten/sui/transactions';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
    import { enokiFlow } from '$lib/enoki';

    // Biến nhận từ component cha (Layout / Page)
    let { isAuthenticated, userAddress, locale } = $props();

    // =========================================================================
    // TRẠNG THÁI DỮ LIỆU CỦA FORM (FORM STATE)
    // =========================================================================
    let fileHash = $state('');      // Lưu mã băm tài liệu
    let fileName = $state('');      // Lưu tên hiển thị của tài liệu
    let description = $state('');   // Lưu mô tả tài liệu
    let isSaving = $state(false);   // Cờ theo dõi trạng thái gửi giao dịch
    let txDigest = $state('');      // Lưu mã băm của giao dịch (Transaction Digest) sau khi thành công

    let notification = $state<{ type: 'error' | 'success', message: string } | null>(null);

    function showNotification(type: 'error' | 'success', message: string) {
        notification = { type, message };
        setTimeout(() => { if (notification?.message === message) notification = null; }, 6000);
    }

    // =========================================================================
    // CÁC HÀM XỬ LÝ (EVENT HANDLERS)
    // =========================================================================

    /**
     * Hàm đăng nhập bằng Google zkLogin thông qua hệ thống Enoki.
     * Xác thực danh tính của người dùng mà không cần tạo hay quản lý Private Key truyền thống.
     */
    async function loginWithGoogle() {
        const url = await enokiFlow.createAuthorizationURL({
            provider: 'google',
            clientId: env.PUBLIC_GOOGLE_CLIENT_ID,
            redirectUrl: `${window.location.protocol}//${window.location.host}`, 
            network: 'testnet'
        });
        window.location.href = url;
    }

    /**
     * Hàm xử lý tải tệp và tạo mã băm SHA-256 ngay trên Client.
     * Tài liệu người dùng không bao giờ được gửi lên Server, đảm bảo tính bảo mật.
     */
    function handleFileUpload(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        fileHash = '';
        txDigest = '';
        fileName = file.name;
        description = '';
        notification = null; 

        const reader = new FileReader();
        reader.onload = (e) => { 
            fileHash = sha256(e.target?.result as ArrayBuffer); 
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Hàm quan trọng: Giao tiếp với Smart Contract thông qua Gas Sponsoring (Enoki Sponsor API).
     * Tạo một giao dịch Move (Transaction) để gọi hàm `store_hash` trong Smart Contract.
     */
    async function handleSaveToBlockchain() {
        if (!env.PUBLIC_REGISTRY_ID) {
            showNotification('error', "Thiếu PUBLIC_REGISTRY_ID trong file .env!");
            return;
        }

        isSaving = true;
        try {
            const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet') });
            
            // 1. KHỞI TẠO KHỐI GIAO DỊCH (Transaction Block)
            const tx = new Transaction();
            
            // Gọi hàm store_hash của Smart Contract
            tx.moveCall({
                target: `${env.PUBLIC_PACKAGE_ID}::vault::store_hash`,
                arguments: [ 
                    tx.object(env.PUBLIC_REGISTRY_ID), // Object Sổ đăng ký chung
                    tx.pure.string(fileHash),          // Tham số mã băm
                    tx.pure.string(fileName),          // Tham số tên tệp
                    tx.pure.string(description),       // Tham số mô tả
                    tx.object('0x6')                   // Đồng hồ hệ thống (System Clock)
                ]
            });

            tx.setSender(userAddress); // Đặt địa chỉ người gửi bằng địa chỉ zkLogin
            
            // 2. BIÊN DỊCH GIAO DỊCH VÀ CHUẨN BỊ TÀI TRỢ GAS (SPONSORING)
            // Lấy bytes của giao dịch để gửi cho backend Enoki Sponsor
            const txbBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
            const txbBase64 = btoa(txbBytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));

            // Gửi yêu cầu tài trợ phí Gas (Sponsor) cho mạng lưới thông qua Backend API
            const sponsorRes = await fetch('/api/sponsor', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txbBytes: txbBase64, sender: userAddress }) 
            });
            
            const sponsorData = await sponsorRes.json();
            
            if (sponsorData.error) {
                // LOGIC QUAN TRỌNG: Nếu Enoki báo lỗi 400 (simulation failed) 
                // thì 99% là do Smart Contract chặn trùng mã băm.
                if (sponsorData.error.includes('status: 400') || sponsorData.error.includes('MoveAbort')) {
                    throw new Error('DUPLICATE');
                }
                throw new Error(`Sponsor Error: ${sponsorData.error}`);
            }

            // 3. KÝ GIAO DỊCH BẰNG ZK-LOGIN KEYPAIR (SIGNING)
            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            const txBytes = Uint8Array.from(atob(sponsorData.sponsoredTxBytes), c => c.charCodeAt(0));
            
            // Ký số giao dịch bằng Ephemeral Keypair được tạo từ Enoki
            const signResult = keypair.signTransaction 
                ? await keypair.signTransaction(txBytes) 
                : await (keypair as any).signTransactionBlock(txBytes);

            // 4. THỰC THI GIAO DỊCH TRÊN BLOCKCHAIN (EXECUTION)
            const executeRes = await fetch('/api/execute', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ digest: sponsorData.digest, signature: signResult.signature }) 
            });
            const executeData = await executeRes.json();
            
            if (executeData.error) throw new Error(executeData.error);

            txDigest = executeData.digest;
            showNotification('success', locale === 'vi' ? "Xác thực tài liệu thành công!" : "Document Notarized!");
        } catch (e: any) { 
            console.error("FULL ERROR LOG:", e);
            if (e.message === 'DUPLICATE') {
                // ĐỔI NỘI DUNG THÔNG BÁO TẠI ĐÂY
                showNotification('error', locale === 'vi' 
                    ? "Cảnh báo: Dấu băm của tài liệu này đã được ghi nhận trên Blockchain trước đó!" 
                    : "Alert: This document's hash has already been recorded on the Blockchain!");
            } else {
                showNotification('error', `Lỗi / Error: ${e.message.slice(0, 60)}`);
            }
        } finally { 
            isSaving = false; 
        }
    }
</script>

<div id="auth" class="vt-owner-section">
    {#if notification}
        <div class="vt-popup {notification.type}" onclick={() => notification = null} role="button" tabindex="0">
            <div class="popup-icon">
                {#if notification.type === 'success'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {:else}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                {/if}
            </div>
            <span class="popup-message">{notification.message}</span>
            <div class="popup-close">×</div>
        </div>
    {/if}

    {#if !isAuthenticated}
        <div class="vt-locked-prompt">
            <div class="lock-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <span>
                {locale === 'vi' ? 'Hệ thống yêu cầu xác thực. Vui lòng' : 'System requires authentication. Please'} 
                <button class="inline-auth-btn" onclick={loginWithGoogle}>
                    {locale === 'vi' ? 'Đăng nhập' : 'Sign In'}
                </button>.
            </span>
        </div>
    {:else}
        <section class="vt-publisher-dashboard">
            <div class="dashboard-header">
                <div class="header-title">
                    <svg class="icon-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <h3>{locale === 'vi' ? 'Cổng Phát hành Tài liệu' : 'Publisher Node Console'}</h3>
                </div>
                <div class="pulse-status"><span class="dot"></span> {locale === 'vi' ? 'ĐANG HOẠT ĐỘNG' : 'NODE ACTIVE'}</div>
            </div>
            
            <div class="upload-container">
                <input type="file" onchange={handleFileUpload} disabled={isSaving} id="owner-file" class="hidden-input" />
                <label for="owner-file" class="vt-file-picker">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>{locale === 'vi' ? 'Chọn tài liệu cần đóng dấu' : 'Select Source Document'}</span>
                </label>
            </div>

            {#if fileHash}
                <div class="form-reveal">
                    <div class="vt-input-group">
                        <label for="asset-name">{locale === 'vi' ? 'TÊN HIỂN THỊ' : 'ASSET NAME'}</label>
                        <input type="text" id="asset-name" bind:value={fileName} class="vt-text-input" />
                    </div>
                    <div class="vt-input-group">
                        <label for="asset-desc">{locale === 'vi' ? 'MÔ TẢ' : 'DESCRIPTION'}</label>
                        <textarea id="asset-desc" bind:value={description} class="vt-text-input textarea"></textarea>
                    </div>
                    <div class="hash-preview">
                        <span class="label">SHA-256 Hash:</span>
                        <code class="hash-code">{fileHash}</code>
                    </div>
                    <button class="btn-mint" onclick={handleSaveToBlockchain} disabled={isSaving || !fileName}>
                        <span class="btn-content">
                            {#if isSaving}
                                <div class="spinner"></div> {locale === 'vi' ? 'Đang thực thi...' : 'Processing...'}
                            {:else}
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 6px;"><path d="M20 6L9 17l-5-5"/></svg>
                                {locale === 'vi' ? 'Công chứng lên Blockchain' : 'Sign & Mint on Sui'}
                            {/if}
                        </span>
                    </button>
                    {#if txDigest}
                        <div class="tx-success-box">
                            <div class="success-icon">✨</div>
                            <div class="success-info">
                                <strong>{locale === 'vi' ? 'Thành công!' : 'Success!'}</strong>
                                <a href="https://suiscan.xyz/testnet/tx/{txDigest}" target="_blank">View on SuiScan ↗</a>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </section>
    {/if}
</div>

<style>
    .vt-owner-section { max-width: 700px; margin: 0 auto; font-family: 'Inter', system-ui, sans-serif; position: relative; }
    
    /* CSS CHO LINK ĐĂNG NHẬP TRONG THÔNG BÁO */
    .inline-auth-btn {
        background: none; border: none; padding: 0; margin: 0;
        color: var(--vt-accent-blue); font-weight: 700; text-decoration: underline;
        cursor: pointer; font-family: inherit; transition: opacity 0.2s;
    }
    .inline-auth-btn:hover { opacity: 0.7; }

    .vt-popup { position: fixed; top: 2rem; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-radius: 12px; min-width: 350px; backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6); cursor: pointer; animation: slideDown 0.4s ease; }
    .vt-popup.success { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.3); color: #4ade80; }
    .vt-popup.error { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.3); color: #f87171; }
    .popup-message { font-size: 0.9rem; font-weight: 500; flex: 1; line-height: 1.4; }
    @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .vt-publisher-dashboard { background: rgba(16, 20, 38, 0.8); border: 1px solid rgba(255,255,255,0.05); padding: 2.5rem; border-radius: 24px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); backdrop-filter: blur(20px); }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1.5rem; }
    .header-title { display: flex; align-items: center; gap: 12px; }
    .header-title h3 { margin: 0; color: #fff; font-size: 1.35rem; font-weight: 400; line-height: 1; letter-spacing: 0.5px; }
    .icon-pulse { width: 28px; height: 28px; color: var(--vt-accent-blue); }
    .pulse-status { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; font-weight: 700; color: var(--vt-success); text-transform: uppercase; }
    .dot { width: 8px; height: 8px; background: var(--vt-success); border-radius: 50%; animation: blink 2s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .hidden-input { display: none !important; }
    .vt-file-picker { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; padding: 4rem 2rem; border: 2px dashed rgba(255, 255, 255, 0.1); border-radius: 16px; cursor: pointer; color: var(--vt-text-muted); transition: all 0.3s; background: rgba(255, 255, 255, 0.02); }
    .vt-file-picker:hover { border-color: var(--vt-accent-blue); color: #fff; background: rgba(138, 180, 248, 0.05); }
    .vt-file-picker svg { width: 44px; height: 44px; opacity: 0.6; }
    .vt-input-group { margin-top: 1.5rem; text-align: left; }
    .vt-input-group label { display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--vt-text-muted); margin-bottom: 0.75rem; font-weight: 800; }
    .vt-text-input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.4); border: 1px solid var(--vt-border); color: #fff; padding: 1.15rem; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 0.95rem; }
    .textarea { min-height: 100px; resize: vertical; }
    .btn-mint { width: 100%; margin-top: 2.5rem; padding: 1.25rem; border: none; border-radius: 12px; background: var(--vt-accent-blue); color: #000; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(138, 180, 248, 0.2); }
    .btn-mint:hover:not(:disabled) { transform: translateY(-2px); background: #fff; }
    .btn-mint:disabled { opacity: 0.4; cursor: not-allowed; }
    .hash-preview { margin-top: 1.5rem; background: rgba(0,0,0,0.3); padding: 1.25rem; border-radius: 10px; border-left: 4px solid var(--vt-accent-blue); }
    .hash-code { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--vt-accent-blue); word-break: break-all; }
    .tx-success-box { margin-top: 2rem; background: rgba(72, 187, 120, 0.1); padding: 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border: 1px solid rgba(72, 187, 120, 0.2);}
    .tx-success-box a { color: var(--vt-accent-blue); font-weight: 600; text-decoration: none; }
    .spinner { width: 18px; height: 18px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .vt-locked-prompt { display: flex; align-items: center; justify-content: center; gap: 1.25rem; padding: 3rem 2rem; background: rgba(16, 20, 38, 0.4); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 20px; color: var(--vt-text-muted); }
</style>