<script lang="ts">
    import { onMount } from 'svelte';
    import { env } from '$env/dynamic/public';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

    let { locale, onViewHome } = $props();
    
    let records = $state<any[]>([]);
    let isLoading = $state(true);

    // --- LOGIC PHÂN TRANG (PAGINATION) ---
    let currentPage = $state(1);
    const itemsPerPage = 5; 

    let totalPages = $derived(Math.ceil(records.length / itemsPerPage));
    let paginatedRecords = $derived(
        records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    );

    function goToPage(page: number) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }
    // -------------------------------------

    async function fetchHistory() {
        isLoading = true;
        try {
            const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet') });
            const events = await suiClient.queryEvents({
                query: { MoveEventType: `${env.PUBLIC_PACKAGE_ID}::vault::HashStored` },
                order: 'descending'
            });
            records = events.data.map(event => event.parsedJson);
        } catch (e) {
            console.error("Lỗi:", e);
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
                <span>{locale === 'vi' ? 'Đang đồng bộ...' : 'Syncing...'}</span>
            </div>
        {:else if records.length === 0}
            <div class="empty-state">
                <p>{locale === 'vi' ? 'Chưa có bản ghi nào.' : 'No records found.'}</p>
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
                        {#each paginatedRecords as item}
                            <tr>
                                <td class="file-column"><span class="file-name">{item.file_name}</span></td>
                                <td class="hash-column"><code>{item.hash_value}</code></td>
                                <td class="time-column">
                                    <span class="date">{new Date(Number(item.timestamp)).toLocaleDateString()}</span>
                                    <span class="time">{new Date(Number(item.timestamp)).toLocaleTimeString()}</span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            {#if totalPages > 1}
                <div class="pagination-minimal">
                    <button class="symbol-btn" disabled={currentPage === 1} onclick={() => goToPage(1)} title="First">
                        «
                    </button>
                    <button class="symbol-btn" disabled={currentPage === 1} onclick={() => goToPage(currentPage - 1)} title="Prev">
                        ‹
                    </button>

                    <div class="page-indicator">
                        <span>{currentPage}</span> / <span>{totalPages}</span>
                    </div>

                    <button class="symbol-btn" disabled={currentPage === totalPages} onclick={() => goToPage(currentPage + 1)} title="Next">
                        ›
                    </button>
                    <button class="symbol-btn" disabled={currentPage === totalPages} onclick={() => goToPage(totalPages)} title="Last">
                        »
                    </button>
                </div>
            {/if}
        {/if}
    </div>
</section>

<style>
    .history-section { animation: fadeIn 0.4s ease; width: 100%; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .history-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
    .history-header h2 { margin: 0; font-weight: 300; letter-spacing: 2px; color: #fff; font-size: 1.8rem; }
    .history-header p { margin: 0.5rem 0 0; color: var(--vt-text-muted); font-size: 0.9rem; }

    .btn-back { background: transparent; border: 1px solid var(--vt-accent-blue); color: var(--vt-accent-blue); padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; }
    
    .glass-panel { background: rgba(16, 20, 38, 0.8); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; backdrop-filter: blur(20px); overflow: hidden; padding-bottom: 1.5rem; }
    
    table { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
    th { background: rgba(255,255,255,0.03); padding: 1.2rem; font-size: 0.75rem; color: var(--vt-text-muted); border-bottom: 1px solid rgba(255,255,255,0.05); text-transform: uppercase; }
    td { padding: 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.02); }
    th:nth-child(1), td:nth-child(1) { width: 25%; }
    th:nth-child(2), td:nth-child(2) { width: 55%; }
    th:nth-child(3), td:nth-child(3) { width: 20%; }

    .file-name { color: #fff; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
    code { font-family: var(--font-mono); color: var(--vt-accent-blue); background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 6px; font-size: 0.75rem; word-break: break-all; display: block; }
    .time-column { display: flex; flex-direction: column; align-items: flex-end; }
    .date { color: #fff; font-size: 0.85rem; }
    .time { color: var(--vt-text-muted); font-size: 0.75rem; }

    /* --- PHÂN TRANG TỐI GIẢN (MINIMAL PAGINATION) --- */
    .pagination-minimal {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5rem;
        margin-top: 2rem;
        user-select: none;
    }

    .symbol-btn {
        background: none;
        border: none;
        color: var(--vt-text-muted);
        font-size: 1.5rem;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0 0.5rem;
        line-height: 1;
    }

    .symbol-btn:hover:not(:disabled) {
        color: var(--vt-accent-blue);
        text-shadow: 0 0 10px var(--vt-accent-blue);
        transform: scale(1.2);
    }

    .symbol-btn:disabled {
        opacity: 0.1;
        cursor: not-allowed;
    }

    .page-indicator {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        color: var(--vt-text-muted);
        letter-spacing: 2px;
    }

    .page-indicator span {
        color: #fff;
        font-weight: 700;
    }

    .loading-state, .empty-state { padding: 6rem; text-align: center; color: var(--vt-text-muted); }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--vt-accent-blue); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>