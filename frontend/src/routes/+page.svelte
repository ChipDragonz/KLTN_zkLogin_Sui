<script lang="ts">
    import { onMount } from 'svelte';
    import { enokiFlow } from '$lib/enoki';
    import { env } from '$env/dynamic/public';
    import { sha256 } from 'js-sha256';
    import { Transaction } from '@mysten/sui/transactions';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

    // --- BIẾN TRẠNG THÁI ---
    let isAuthenticated = $state(false);
    let userAddress = $state('');
    
    // --- LƯU TRỮ ---
    let fileHash = $state('');
    let fileName = $state('');
    let description = $state('');
    let isSaving = $state(false);
    let txDigest = $state('');

    // --- XÁC THỰC ---
    let verifyFileHash = $state('');
    let isVerifying = $state(false);
    let verifyResult = $state<'success' | 'fail' | null>(null);
    let verifyTimestamp = $state('');
    let verifyFileName = $state(''); 
    let verifyDesc = $state('');     

    // --- LOGIC ---
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
        const url = await enokiFlow.createAuthorizationURL({
            provider: 'google',
            clientId: env.PUBLIC_GOOGLE_CLIENT_ID,
            redirectUrl: `${window.location.protocol}//${window.location.host}`, 
            network: 'testnet'
        });
        window.location.href = url;
    }

    function handleFileUpload(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        fileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            fileHash = sha256(e.target?.result as ArrayBuffer);
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
                arguments: [ tx.pure.string(fileHash), tx.pure.string(fileName), tx.pure.string(description), tx.object('0x6') ]
            });
            tx.setSender(userAddress);

            const txbBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
            const txbBase64 = btoa(txbBytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));

            const sponsorRes = await fetch('/api/sponsor', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txbBytes: txbBase64, sender: userAddress })
            });
            const sponsorData = await sponsorRes.json();
            if (sponsorData.error) throw new Error(sponsorData.error);

            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            const txBytes = Uint8Array.from(atob(sponsorData.sponsoredTxBytes), c => c.charCodeAt(0));
            const signResult = keypair.signTransaction ? await keypair.signTransaction(txBytes) : await keypair.signTransactionBlock(txBytes);

            const executeRes = await fetch('/api/execute', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ digest: sponsorData.digest, signature: signResult.signature })
            });
            const executeData = await executeRes.json();
            if (executeData.error) throw new Error(executeData.error);

            txDigest = executeData.digest;
        } catch (error: any) {
            alert("Có lỗi: " + error.message);
        } finally {
            isSaving = false;
        }
    }

    function handleVerifyUpload(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        verifyResult = null; 
        const reader = new FileReader();
        reader.onload = (e) => {
            verifyFileHash = sha256(e.target?.result as ArrayBuffer);
        };
        reader.readAsArrayBuffer(file);
    }

    async function verifyOnBlockchain() {
        isVerifying = true;
        verifyResult = null;
        try {
            const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet') });
            const events = await suiClient.queryEvents({
                query: { MoveEventType: `${env.PUBLIC_PACKAGE_ID}::${env.PUBLIC_MODULE_NAME}::HashStored` }, order: 'descending'
            });

            let isFound = false;
            for (const event of events.data) {
                const payload = event.parsedJson as any;
                if (payload?.hash_value === verifyFileHash) {
                    isFound = true;
                    verifyFileName = payload.file_name || 'Không có tên';
                    verifyDesc = payload.description || 'Không có mô tả';
                    verifyTimestamp = payload.timestamp ? new Date(Number(payload.timestamp)).toLocaleString('vi-VN') : 'Không rõ thời gian';
                    break;
                }
            }
            verifyResult = isFound ? 'success' : 'fail';
        } catch (error) {
            alert("Lỗi khi kết nối mạng lưới Sui");
        } finally {
            isVerifying = false;
        }
    }
</script>

<main class="app-container">
    <header class="app-header">
        <h1>Document Vault</h1>
        <p>Hệ thống Xác thực & Công chứng Tài liệu phi tập trung trên Sui Blockchain</p>
    </header>

    <section class="card verify-card">
        <div class="card-header">
            <span class="icon">🔍</span>
            <h2>Kiểm tra & Xác thực công khai</h2>
        </div>
        <p class="subtitle">(Không cần đăng nhập) Tải tài liệu lên để kiểm tra chứng nhận Blockchain.</p>
        
        <div class="file-upload-wrapper">
            <input type="file" onchange={handleVerifyUpload} disabled={isVerifying} class="file-input" />
        </div>
        
        {#if verifyFileHash}
            <div class="result-box bg-light">
                <label>Mã băm tệp đang kiểm tra:</label>
                <code class="hash-text text-orange">{verifyFileHash}</code>
                
                <button class="btn btn-warning full-width" onclick={verifyOnBlockchain} disabled={isVerifying}>
                    {isVerifying ? 'Đang truy vấn sổ cái...' : 'Truy xuất Blockchain để đối chiếu'}
                </button>

                {#if verifyResult === 'success'}
                    <div class="alert alert-success">
                        <div class="alert-title">✅ TÀI LIỆU HỢP LỆ</div>
                        <div class="alert-body">
                            <p><strong>Tên tài liệu:</strong> {verifyFileName}</p>
                            <p><strong>Ghi chú:</strong> {verifyDesc}</p>
                            <hr class="divider-sub">
                            <p class="timestamp">Được đóng dấu thời gian vào: {verifyTimestamp}</p>
                        </div>
                    </div>
                {:else if verifyResult === 'fail'}
                    <div class="alert alert-danger">
                        <div class="alert-title">❌ CẢNH BÁO GIẢ MẠO</div>
                        <div class="alert-body">
                            <p>Tài liệu này đã bị chỉnh sửa hoặc chưa từng được công chứng trên Blockchain!</p>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </section>

    <div class="section-divider">
        <span>Khu vực Chủ sở hữu</span>
    </div>

    {#if !isAuthenticated}
        <section class="card text-center auth-card">
            <h3 class="auth-title">Đăng nhập để phát hành tài liệu</h3>
            <p class="auth-desc">Tạo bằng chứng số bằng công nghệ zkLogin, không cần quản lý Private Key.</p>
            <button class="btn btn-google" onclick={loginWithGoogle}>
                <svg viewBox="0 0 24 24" class="google-icon"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Đăng nhập bằng Google
            </button>
        </section>
    {:else}
        <div class="user-profile">
            <div class="user-info">
                <span class="status-dot"></span>
                <div>
                    <div class="user-label">Đã kết nối zkLogin</div>
                    <code class="wallet-address">{userAddress.slice(0,6)}...{userAddress.slice(-4)}</code>
                </div>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick={() => { enokiFlow.logout(); isAuthenticated = false; }}>Đăng xuất</button>
        </div>

        <section class="card owner-card">
            <div class="card-header">
                <span class="icon">📤</span>
                <h2>Khởi tạo & Lưu trữ</h2>
            </div>
            <p class="subtitle">Tải tài liệu gốc lên, băm và lưu metadata lên Blockchain.</p>
            
            <div class="file-upload-wrapper">
                <input type="file" onchange={handleFileUpload} disabled={isSaving} class="file-input" />
            </div>
            
            {#if fileHash}
                <div class="form-group">
                    <label for="fname">Tên tài liệu hiển thị:</label>
                    <input type="text" id="fname" class="input-control" bind:value={fileName} placeholder="VD: Hợp đồng kinh tế" />
                    
                    <label for="fdesc">Mô tả / Ghi chú:</label>
                    <textarea id="fdesc" class="input-control" bind:value={description} placeholder="Ghi chú thêm..."></textarea>
                </div>

                <div class="result-box bg-light">
                    <label>Mã băm SHA-256 (Dữ liệu on-chain):</label>
                    <code class="hash-text text-primary">{fileHash}</code>
                    
                    <button class="btn btn-primary full-width mt-1" onclick={handleSaveToBlockchain} disabled={isSaving || !fileName}>
                        {isSaving ? 'Đang thực thi giao dịch...' : 'Đóng dấu lên Blockchain'}
                    </button>

                    {#if txDigest}
                        <div class="alert alert-success mt-1">
                            🎉 <strong>Đóng dấu thành công!</strong> <br>
                            <a href="https://suiscan.xyz/testnet/tx/{txDigest}" target="_blank" class="tx-link">Xem trên SuiScan ↗</a>
                        </div>
                    {/if}
                </div>
            {/if}
        </section>
    {/if}
</main>

<style>
    /* Biến CSS chuẩn để dễ dàng thay đổi màu sắc hệ thống */
    :root {
        --primary-color: #2563eb;
        --primary-hover: #1d4ed8;
        --warning-color: #ea580c;
        --warning-hover: #c2410c;
        --danger-color: #dc2626;
        --success-color: #16a34a;
        --success-bg: #f0fdf4;
        --success-border: #bbf7d0;
        --danger-bg: #fef2f2;
        --danger-border: #fecaca;
        --bg-color: #f8fafc;
        --card-bg: #ffffff;
        --text-main: #0f172a;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --radius: 12px;
        --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }

    /* Đặt nền tổng thể cho app */
    :global(body) {
        background-color: var(--bg-color);
        color: var(--text-main);
        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
    }

    .app-container {
        max-width: 768px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    /* Tiêu đề trang */
    .app-header {
        text-align: center;
        margin-bottom: 3rem;
    }
    .app-header h1 {
        font-size: 2.5rem;
        font-weight: 800;
        color: var(--text-main);
        margin-bottom: 0.5rem;
        letter-spacing: -0.025em;
    }
    .app-header p {
        color: var(--text-muted);
        font-size: 1.1rem;
    }

    /* Khung Card tiêu chuẩn */
    .card {
        background: var(--card-bg);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 2rem;
        border: 1px solid var(--border-color);
        margin-bottom: 1.5rem;
    }
    .verify-card {
        border-top: 4px solid var(--warning-color);
    }
    .owner-card {
        border-top: 4px solid var(--primary-color);
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }
    .card-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-main);
    }
    .icon { font-size: 1.5rem; }
    .subtitle {
        color: var(--text-muted);
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
    }

    /* Form & Input */
    .file-upload-wrapper {
        margin-bottom: 1.5rem;
    }
    .file-input {
        display: block;
        width: 100%;
        padding: 0.75rem;
        border: 2px dashed var(--border-color);
        border-radius: 8px;
        background: #f8fafc;
        cursor: pointer;
    }
    .form-group {
        background: #f1f5f9;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }
    .form-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #334155;
    }
    .input-control {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-family: inherit;
        font-size: 1rem;
        box-sizing: border-box;
        transition: border-color 0.2s;
    }
    .input-control:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    textarea.input-control {
        min-height: 100px;
        resize: vertical;
    }

    /* Kết quả & Mã băm */
    .result-box {
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }
    .bg-light { background-color: #f8fafc; }
    .result-box label {
        display: block;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
    }
    .hash-text {
        display: block;
        word-break: break-all;
        background: #e2e8f0;
        padding: 0.75rem;
        border-radius: 6px;
        font-family: monospace;
        font-size: 0.9rem;
    }
    .text-primary { color: var(--primary-color); font-weight: bold;}
    .text-orange { color: var(--warning-color); font-weight: bold;}

    /* Nút bấm (Buttons) */
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .full-width { width: 100%; }
    .mt-1 { margin-top: 1.5rem; }
    
    .btn-primary { background: var(--primary-color); color: white; }
    .btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
    
    .btn-warning { background: var(--warning-color); color: white; }
    .btn-warning:hover:not(:disabled) { background: var(--warning-hover); }

    .btn-outline-danger {
        background: transparent;
        color: var(--danger-color);
        border: 1px solid var(--danger-color);
    }
    .btn-outline-danger:hover {
        background: var(--danger-color);
        color: white;
    }
    .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.875rem; }

    /* Nút Google */
    .btn-google {
        background: white;
        color: #3c4043;
        border: 1px solid #dadce0;
        box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3);
        gap: 10px;
    }
    .btn-google:hover { background: #f8f9fa; box-shadow: 0 1px 3px 1px rgba(60,64,67,0.15); }
    .google-icon { width: 20px; height: 20px; }

    /* Alert / Thông báo */
    .alert {
        padding: 1rem 1.25rem;
        border-radius: 8px;
        margin-top: 1rem;
        border: 1px solid;
    }
    .alert-title {
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
        text-align: center;
    }
    .alert-body p { margin: 0 0 0.5rem 0; line-height: 1.5; }
    .alert-body p:last-child { margin-bottom: 0; }
    
    .alert-success { background: var(--success-bg); border-color: var(--success-border); color: #166534; }
    .alert-danger { background: var(--danger-bg); border-color: var(--danger-border); color: #991b1b; text-align: center; }
    
    .divider-sub {
        border: 0;
        height: 1px;
        background: var(--success-border);
        margin: 1rem 0;
    }
    .timestamp { font-size: 0.85rem; opacity: 0.8; }
    .tx-link { color: var(--primary-color); font-weight: bold; text-decoration: none;}
    .tx-link:hover { text-decoration: underline; }

    /* Đường kẻ ngăn cách giữa 2 khu vực */
    .section-divider {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 3rem 0;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.85rem;
    }
    .section-divider::before, .section-divider::after {
        content: '';
        flex: 1;
        border-bottom: 1px dashed #cbd5e1;
    }
    .section-divider span { padding: 0 1rem; }

    /* Profile Card */
    .auth-card { padding: 3rem 2rem; }
    .auth-title { font-size: 1.25rem; margin-top: 0; margin-bottom: 0.5rem; }
    .auth-desc { color: var(--text-muted); margin-bottom: 1.5rem; }
    
    .user-profile {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f0fdf4;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        border: 1px solid var(--success-border);
        margin-bottom: 1.5rem;
    }
    .user-info { display: flex; align-items: center; gap: 10px; }
    .status-dot {
        width: 10px; height: 10px;
        background-color: var(--success-color);
        border-radius: 50%;
        box-shadow: 0 0 0 3px #dcfce7;
    }
    .user-label { font-size: 0.85rem; font-weight: 600; color: #166534; margin-bottom: 2px; }
    .wallet-address { font-family: monospace; color: var(--text-muted); }
</style>