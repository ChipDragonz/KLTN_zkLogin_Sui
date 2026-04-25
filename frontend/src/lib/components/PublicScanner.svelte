<script lang="ts">
    import { env } from '$env/dynamic/public';
    import { sha256 } from 'js-sha256';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

    let { locale } = $props();

    // =========================================================================
    // TRẠNG THÁI (STATE VARIABLES)
    // Các biến lưu trữ dữ liệu trong quá trình xác thực tài liệu
    // =========================================================================
    let verifyFileHash = $state(''); // Lưu trữ mã băm SHA-256 của tệp người dùng tải lên
    let isVerifying = $state(false); // Trạng thái đang tải (hiệu ứng spinner)
    let verifyResult = $state<'success' | 'fail' | null>(null); // Kết quả đối chiếu với Blockchain
    
    // Dữ liệu lấy về từ Blockchain nếu tài liệu hợp lệ
    let verifyTimestamp = $state('');
    let verifyFileName = $state(''); 
    let verifyDesc = $state('');     

    // =========================================================================
    // CÁC HÀM XỬ LÝ CHÍNH (MAIN FUNCTIONS)
    // =========================================================================

    /**
     * Hàm xử lý khi người dùng chọn một tệp tin (File Upload)
     * Đọc nội dung tệp dưới dạng ArrayBuffer và tính toán mã băm SHA-256 ngay trên trình duyệt (Client-side)
     */
    function handleVerifyUpload(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        verifyResult = null; 
        const reader = new FileReader();
        // Callback được gọi khi tệp được đọc xong
        reader.onload = (e) => { 
            // Tính toán băm SHA-256 từ nội dung tệp tin
            verifyFileHash = sha256(e.target?.result as ArrayBuffer); 
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Hàm xác thực dữ liệu trên Sui Blockchain
     * Truy vấn các sự kiện (Events) của Smart Contract để kiểm tra xem mã băm có tồn tại không.
     */
    async function verifyOnBlockchain() {
        isVerifying = true;
        verifyResult = null;
        try {
            // Khởi tạo kết nối tới node của mạng lưới Sui Testnet
            const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet') });
            
            // Lấy lịch sử sự kiện `HashStored` từ Smart Contract đã triển khai
            const events = await suiClient.queryEvents({
                query: { MoveEventType: `${env.PUBLIC_PACKAGE_ID}::${env.PUBLIC_MODULE_NAME}::HashStored` }, order: 'descending'
            });

            let isFound = false;
            // Lặp qua các sự kiện lấy được để tìm mã băm tương ứng
            for (const event of events.data) {
                const payload = event.parsedJson as any;
                // Nếu tìm thấy mã băm trong lịch sử sự kiện (Event History)
                if (payload?.hash_value === verifyFileHash) {
                    isFound = true;
                    // Lấy các thông tin (metadata) đã được ghi nhận trên chuỗi khối
                    verifyFileName = payload.file_name || 'No Name';
                    verifyDesc = payload.description || 'No Description';
                    verifyTimestamp = payload.timestamp ? new Date(Number(payload.timestamp)).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') : 'Unknown';
                    break;
                }
            }
            // Cập nhật kết quả dựa trên việc tìm kiếm
            verifyResult = isFound ? 'success' : 'fail';
        } catch (error) { 
            alert("Lỗi kết nối Blockchain / Blockchain connection error"); 
        } finally { 
            isVerifying = false; 
        }
    }
</script>

<section class="vt-hero-section">
    <div class="vt-big-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        <h1>DOCUMENT VAULT</h1>
    </div>
    <p class="vt-hero-desc">
        {locale === 'vi' 
            ? 'Xác thực tính toàn vẹn và chứng thực tài liệu số thông qua chữ ký mật mã trên Sui Blockchain.' 
            : 'Verify integrity and timestamp digital documents via cryptographic signatures on Sui Blockchain.'}
    </p>

    <div class="vt-search-wrapper {isVerifying ? 'processing' : ''}">
        <input type="file" onchange={handleVerifyUpload} disabled={isVerifying} id="verify-file" class="hidden-input" />
        <label for="verify-file" class="vt-search-bar">
            <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
            <span class="search-placeholder">
                {locale === 'vi' ? 'Chọn tài liệu để tính toán mã băm SHA-256' : 'Select a file to calculate SHA-256 hash'}
            </span>
            <div class="browse-btn">{locale === 'vi' ? 'Tải lên' : 'Browse'}</div>
        </label>

        {#if verifyFileHash}
            <div class="vt-results-reveal">
                <div class="vt-hash-info">
                    <span class="text-muted">Hash:</span>
                    <code class="hash-text">{verifyFileHash}</code>
                </div>
                <button class="vt-btn-search" onclick={verifyOnBlockchain} disabled={isVerifying}>
                    {#if isVerifying}<span class="spinner"></span> {locale === 'vi' ? 'Đang truy vấn...' : 'Querying...'}{:else}{locale === 'vi' ? 'Kiểm tra Blockchain' : 'Search on Ledger'}{/if}
                </button>

                {#if verifyResult === 'success'}
                    <div class="vt-alert vt-alert-success">
                        <div class="alert-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg></div>
                        <div class="alert-content">
                            <h4 class="text-green">{locale === 'vi' ? 'Tài liệu Toàn vẹn' : 'Document Integrity Verified'}</h4>
                            <p>{locale === 'vi' ? 'Không phát hiện chỉnh sửa. Tài liệu khớp hoàn toàn với bản ghi gốc.' : 'No modifications detected. Document matches the original on-chain record.'}</p>
                            <div class="vt-meta-grid">
                                <div class="vt-meta-item"><span>{locale === 'vi' ? 'Tên:' : 'Name:'}</span> {verifyFileName}</div>
                                <div class="vt-meta-item"><span>{locale === 'vi' ? 'Chú thích:' : 'Description:'}</span> {verifyDesc}</div>
                                <div class="vt-meta-item"><span>{locale === 'vi' ? 'Thời gian:' : 'Timestamp:'}</span> {verifyTimestamp}</div>
                            </div>
                        </div>
                    </div>
                {:else if verifyResult === 'fail'}
                    <div class="vt-alert vt-alert-danger">
                        <div class="alert-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
                        <div class="alert-content">
                            <h4 class="text-red">{locale === 'vi' ? 'Phát hiện chỉnh sửa' : 'Modification Detected'}</h4>
                            <p>{locale === 'vi' ? 'Mã băm không khớp. Tài liệu đã bị thay đổi hoặc chưa được công chứng.' : 'Hash mismatch. The document has been altered or is unverified.'}</p>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</section>

<style>
    .vt-hero-section { text-align: center; margin-bottom: 4rem; }
    .vt-big-logo { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem; }
    .vt-big-logo svg { width: 55px; height: 55px; color: var(--vt-accent-blue); }
    .vt-big-logo h1 { font-size: 2.8rem; font-weight: 300; letter-spacing: 2px; color: #fff; margin: 0; }
    .vt-hero-desc { color: var(--vt-text-main); font-size: 1rem; max-width: 650px; margin: 0 auto 3rem; line-height: 1.6; opacity: 0.85;}

    .vt-search-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; }
    .hidden-input { display: none; }
    
    .vt-search-bar {
        width: 100%; max-width: 700px; padding: 1.25rem 1.75rem;
        background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 14px; cursor: pointer; display: flex; align-items: center; gap: 1rem;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5); transition: all 0.3s;
    }
    .file-icon { width: 26px; height: 26px; color: var(--vt-accent-blue); }
    .search-placeholder { color: #ffffff; font-size: 1.1rem; font-weight: 500; flex: 1; }
    .browse-btn { background: rgba(255,255,255,0.15); padding: 0.6rem 1.4rem; border-radius: 6px; font-size: 0.9rem; color: #fff; border: 1px solid rgba(255,255,255,0.2); font-weight: 600; }
    .vt-search-bar:hover { background: rgba(255, 255, 255, 0.18); border-color: var(--vt-accent-blue); transform: translateY(-2px); }

    .vt-btn-search { margin-top: 2rem; padding: 0.9rem 3.5rem; background: transparent; border: 1px solid var(--vt-accent-blue); color: var(--vt-accent-blue); font-weight: 700; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
    .vt-btn-search:hover:not(:disabled) { background: rgba(138, 180, 248, 0.15); box-shadow: 0 0 20px rgba(138, 180, 248, 0.3); }

    .vt-alert { margin-top: 2.5rem; border-top: 5px solid; padding: 1.75rem; background: rgba(16, 20, 38, 0.9); display: flex; gap: 1.25rem; text-align: left; border-radius: 0 0 16px 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); backdrop-filter: blur(10px); }
    .vt-alert-success { border-color: var(--vt-success); }
    .vt-alert-danger { border-color: var(--vt-danger); }
    .alert-icon svg { width: 36px; height: 36px; filter: drop-shadow(0 0 8px currentColor); }
    .text-green { color: var(--vt-success); }
    .text-red { color: var(--vt-danger); }
    
    .vt-meta-grid { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.25rem;}
    .vt-meta-item { font-size: 0.95rem; display: flex; gap: 0.75rem; }
    .vt-meta-item span { color: var(--vt-text-muted); min-width: 100px; font-weight: 600; }
    .spinner { width: 16px; height: 16px; border: 3px solid rgba(255,255,255,0.2); border-top-color: currentColor; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>