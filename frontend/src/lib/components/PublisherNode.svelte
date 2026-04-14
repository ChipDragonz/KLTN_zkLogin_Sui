<script lang="ts">
    import { env } from '$env/dynamic/public';
    import { sha256 } from 'js-sha256';
    import { Transaction } from '@mysten/sui/transactions';
    import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
    import { enokiFlow } from '$lib/enoki';

    let { isAuthenticated, userAddress, locale } = $props();

    let fileHash = $state('');
    let fileName = $state('');
    let description = $state('');
    let isSaving = $state(false);
    let txDigest = $state('');

    function handleFileUpload(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        fileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => { fileHash = sha256(e.target?.result as ArrayBuffer); txDigest = ''; };
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
            const sponsorRes = await fetch('/api/sponsor', { method: 'POST', body: JSON.stringify({ txbBytes: txbBase64, sender: userAddress }) });
            const sponsorData = await sponsorRes.json();
            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            const signResult = await keypair.signTransactionBlock(Uint8Array.from(atob(sponsorData.sponsoredTxBytes), c => c.charCodeAt(0)));
            const executeRes = await fetch('/api/execute', { method: 'POST', body: JSON.stringify({ digest: sponsorData.digest, signature: signResult.signature }) });
            const executeData = await executeRes.json();
            txDigest = executeData.digest;
        } catch (e) { alert("Error stamping document"); } finally { isSaving = false; }
    }
</script>

<div id="auth" class="vt-owner-section">
    {#if !isAuthenticated}
        <div class="vt-locked-prompt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>
                {locale === 'vi' ? 'Publisher Node yêu cầu xác thực. Vui lòng' : 'Publisher Node requires authentication. Please'}
                <strong>{locale === 'vi' ? 'Đăng nhập' : 'Sign In'}</strong>.
            </span>
        </div>
    {:else}
        <section class="vt-publisher-dashboard">
            <div class="dashboard-header">
                <h3>{locale === 'vi' ? 'Bàn làm việc Công chứng' : 'Minting Dashboard'}</h3>
                <div class="pulse-indicator">{locale === 'vi' ? 'Đang hoạt động' : 'Active'}</div>
            </div>
            
            <input type="file" onchange={handleFileUpload} disabled={isSaving} id="owner-file" style="display:none" />
            <label for="owner-file" class="vt-file-picker">
                {locale === 'vi' ? 'Chọn tài liệu nguồn để phát hành' : 'Select Source Document to Publish'}
            </label>

            {#if fileHash}
                <div class="form-reveal">
                    <div class="vt-input-group">
                        <label>{locale === 'vi' ? 'Tên tài liệu' : 'Asset Name'}</label>
                        <input type="text" bind:value={fileName} placeholder="..." class="vt-text-input" />
                    </div>
                    <div class="vt-input-group">
                        <label>{locale === 'vi' ? 'Mô tả Metadata' : 'Metadata Context'}</label>
                        <textarea bind:value={description} placeholder="..." class="vt-text-input textarea"></textarea>
                    </div>

                    <button class="btn-mint" onclick={handleSaveToBlockchain} disabled={isSaving || !fileName}>
                        {#if isSaving}<span class="spinner"></span> Processing...{:else}{locale === 'vi' ? 'Đóng dấu lên Sui Blockchain' : 'Sign on Sui Blockchain'}{/if}
                    </button>
                    {#if txDigest}
                        <div class="tx-success">
                            {locale === 'vi' ? 'Giao dịch thành công!' : 'Success!'} 
                            <a href="https://suiscan.xyz/testnet/tx/{txDigest}" target="_blank">View ↗</a>
                        </div>
                    {/if}
                </div>
            {/if}
        </section>
    {/if}
</div>

<style>
    .vt-owner-section { max-width: 700px; margin: 0 auto; }
    .vt-locked-prompt { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 2rem; background: rgba(0, 0, 0, 0.25); border: 1px dashed rgba(255, 255, 255, 0.15); border-radius: 12px; color: var(--vt-text-muted); }
    .vt-locked-prompt svg { width: 28px; color: var(--vt-accent-blue); }
    .vt-publisher-dashboard { background: rgba(16, 20, 38, 0.6); border: 1px solid rgba(255,255,255,0.05); padding: 2.5rem; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1.5rem; }
    .vt-file-picker { display: block; padding: 2rem; border: 1px dashed var(--vt-border); text-align: center; cursor: pointer; color: #fff; background: rgba(255,255,255,0.02); border-radius: 8px; font-weight: 500;}
    .vt-file-picker:hover { border-color: var(--vt-accent-blue); background: rgba(138, 180, 248, 0.05); }
    .vt-input-group { margin-top: 1.5rem; text-align: left; }
    .vt-input-group label { display: block; font-size: 0.8rem; text-transform: uppercase; color: var(--vt-text-muted); margin-bottom: 0.5rem; font-weight: 700; }
    .vt-text-input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid var(--vt-border); color: #fff; padding: 1rem; border-radius: 8px; font-family: var(--font-main); font-size: 1rem; }
    .vt-text-input:focus { outline: none; border-color: var(--vt-accent-blue); }
    .btn-mint { width: 100%; margin-top: 2rem; padding: 1.1rem; background: var(--vt-accent-blue); color: #000; font-weight: 800; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; }
    .tx-success { margin-top: 1.5rem; background: rgba(72, 187, 120, 0.1); padding: 1rem; border-radius: 6px; color: var(--vt-success); font-weight: 600; text-align: center; }
    .pulse-indicator { color: var(--vt-success); font-size: 0.85rem; font-weight: 700; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.2); border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>