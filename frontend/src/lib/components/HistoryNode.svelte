<script lang="ts">
    import { onMount } from 'svelte';
    import { env } from '$env/dynamic/public';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

    // Nhận props từ trang cha (+page.svelte)
    let { locale, onViewHome } = $props();
    
    let records = $state<any[]>([]);
    let isLoading = $state(true);

    // Hàm truy vấn lịch sử từ Events trên Blockchain
    async function fetchHistory() {
        isLoading = true;
        try {
            const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet') });
            
            // Lấy các sự kiện HashStored được phát ra từ Package của bạn
            const events = await suiClient.queryEvents({
                query: { MoveEventType: `${env.PUBLIC_PACKAGE_ID}::vault::HashStored` },
                order: 'descending'
            });

            // Chuyển đổi dữ liệu từ Event sang mảng để hiển thị
            records = events.data.map(event => event.parsedJson);
        } catch (e) {
            console.error("Lỗi khi lấy dữ liệu sổ cái:", e);
        } finally {
            isLoading = false;
        }
    }

    onMount(fetchHistory);
</script>

<section class="history-section">
    <div class="history-header">
        <div class="title-group">
            <h2>{locale === 'vi' ? 'SỔ CÁI CÔNG CHỨNG' : 'NOTARY LEDGER'}</h2>
            <p>{locale === 'vi' ? 'Dữ liệu được lưu trữ vĩnh viễn trên mạng lưới Sui' : 'Records permanently stored on Sui Network'}</p>
        </div>
        <button class="btn-back" onclick={onViewHome}>
            {locale === 'vi' ? '← Quay lại' : '← Back Home'}
        </button>
    </div>

    <div class="glass-panel">
        {#if isLoading}
            <div class="loading-state">
                <div class="spinner"></div>
                <span>{locale === 'vi' ? 'Đang đồng bộ sổ cái...' : 'Syncing Ledger...'}</span>
            </div>
        {:else if records.length === 0}
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                <p>{locale === 'vi' ? 'Chưa có bản ghi nào trên hệ thống.' : 'No records found.'}</p>
            </div>
        {:else}
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>{locale === 'vi' ? 'TÊN TÀI LIỆU' : 'FILE NAME'}</th>
                            <th>{locale === 'vi' ? 'MÃ BĂM SHA-256' : 'SHA-256 HASH'}</th>
                            <th>{locale === 'vi' ? 'THỜI GIAN' : 'TIMESTAMP'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each records as item}
                            <tr>
                                <td class="file-column">
                                    <div class="file-info">
                                        <span class="file-name" title={item.file_name}>{item.file_name}</span>
                                    </div>
                                </td>
                                <td class="hash-column">
                                    <code>{item.hash_value}</code>
                                </td>
                                <td class="time-column">
                                    <span class="date">{new Date(Number(item.timestamp)).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}</span>
                                    <span class="time">{new Date(Number(item.timestamp)).toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US')}</span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</section>

<style>
    .history-section { 
        animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
        width: 100%; 
    }

    @keyframes fadeIn { 
        from { opacity: 0; transform: translateY(10px); } 
        to { opacity: 1; transform: translateY(0); } 
    }

    /* Header */
    .history-header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-end; 
        margin-bottom: 2.5rem; 
    }
    .history-header h2 { 
        margin: 0; 
        font-weight: 300; 
        letter-spacing: 2px; 
        color: #fff; 
        font-size: 1.8rem; 
    }
    .history-header p { 
        margin: 0.5rem 0 0; 
        color: var(--vt-text-muted); 
        font-size: 0.9rem; 
    }

    .btn-back { 
        background: transparent; 
        border: 1px solid var(--vt-accent-blue); 
        color: var(--vt-accent-blue); 
        padding: 0.6rem 1.2rem; 
        border-radius: 8px; 
        cursor: pointer; 
        font-weight: 600; 
        transition: all 0.2s;
    }
    .btn-back:hover { 
        background: rgba(138, 180, 248, 0.1); 
        box-shadow: 0 0 15px rgba(138, 180, 248, 0.2);
    }

    /* Bảng & Glassmorphism */
    .glass-panel { 
        background: rgba(16, 20, 38, 0.8); 
        border: 1px solid rgba(255, 255, 255, 0.05); 
        border-radius: 20px; 
        backdrop-filter: blur(20px); 
        box-shadow: 0 25px 50px rgba(0,0,0,0.5); 
        overflow: hidden; 
    }
    
    .table-container { 
        width: 100%;
        overflow-x: hidden; /* TRIỆT TIÊU THANH TRƯỢT NGANG */
    }

    table { 
        width: 100%; 
        border-collapse: collapse; 
        text-align: left; 
        table-layout: fixed; /* ÉP CỘT CỐ ĐỊNH TỈ LỆ */
    }

    /* Tỉ lệ cột: 25% - 55% - 20% */
    th:nth-child(1), td:nth-child(1) { width: 25%; }
    th:nth-child(2), td:nth-child(2) { width: 55%; }
    th:nth-child(3), td:nth-child(3) { width: 20%; }

    th { 
        background: rgba(255,255,255,0.03); 
        padding: 1.2rem; 
        font-size: 0.75rem; 
        color: var(--vt-text-muted); 
        border-bottom: 1px solid rgba(255,255,255,0.05); 
        text-transform: uppercase; 
        letter-spacing: 1.5px; 
    }

    td { 
        padding: 1.2rem; 
        border-bottom: 1px solid rgba(255,255,255,0.02); 
        vertical-align: middle;
    }
    
    .file-name { 
        color: #fff; 
        font-weight: 500; 
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.9rem;
    }

    .hash-column code { 
        font-family: var(--font-mono); 
        color: var(--vt-accent-blue); 
        background: rgba(0,0,0,0.3); 
        padding: 0.5rem 0.8rem; 
        border-radius: 6px; 
        font-size: 0.75rem; 
        line-height: 1.5;
        
        /* FIX QUAN TRỌNG: Ngắt dòng mã băm để không tràn bảng */
        word-break: break-all; 
        display: block; 
    }

    .time-column { 
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
    }
    .date { color: #fff; font-size: 0.85rem; font-weight: 500; }
    .time { color: var(--vt-text-muted); font-size: 0.75rem; }

    /* States */
    .loading-state, .empty-state { 
        padding: 6rem 2rem; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: 1.5rem; 
        color: var(--vt-text-muted); 
    }
    .empty-state svg { width: 48px; height: 48px; opacity: 0.3; }

    .spinner { 
        width: 32px; 
        height: 32px; 
        border: 3px solid rgba(255,255,255,0.1); 
        border-top-color: var(--vt-accent-blue); 
        border-radius: 50%; 
        animation: spin 1s linear infinite; 
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Tùy chỉnh thanh cuộn dọc (Scrollbar) cho đồng bộ Dark Mode */
    :global(::-webkit-scrollbar) { width: 6px; }
    :global(::-webkit-scrollbar-track) { background: rgba(0,0,0,0.2); }
    :global(::-webkit-scrollbar-thumb) { 
        background: var(--vt-accent-blue); 
        border-radius: 10px; 
    }
</style>