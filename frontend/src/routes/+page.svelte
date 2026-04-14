<script lang="ts">
    import { onMount } from 'svelte';
    import { enokiFlow } from '$lib/enoki';
    import { env } from '$env/dynamic/public';
    import { sha256 } from 'js-sha256';

    // ĐÃ SỬA: Thêm $state() để báo cho Svelte 5 biết đây là biến cần cập nhật UI
    let isAuthenticated = $state(false);
    let userAddress = $state('');
    let fileHash = $state('');

    onMount(async () => {
        try {
            // Hứng callback từ URL (nó sẽ tự đọc đoạn #id_token=...)
            await enokiFlow.handleAuthCallback();
        } catch (error) {
            console.log("Không có callback ở URL hoặc callback đã được xử lý");
        }
        
        // Kiểm tra xem session đã được lưu thành công chưa
        const session = await enokiFlow.getSession();
        if (session && session.jwt) {
            isAuthenticated = true; // Lúc này UI sẽ lập tức re-render
            const keypair = await enokiFlow.getKeypair({ network: 'testnet' });
            userAddress = keypair.toSuiAddress();
            
            // LÀM SẠCH URL: Xóa đoạn token dài ngoằng trên thanh địa chỉ cho đẹp
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
            fileHash = sha256(arrayBuffer);
        };
        reader.readAsArrayBuffer(file);
    }
</script>

<main style="padding: 2rem; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
    <h1>Hệ Thống Document Vault</h1>
    
    {#if !isAuthenticated}
        <p>Vui lòng đăng nhập để lưu trữ mã băm tài liệu. Không cần ví, không cần phí gas!</p>
        <button on:click={loginWithGoogle} style="padding: 10px 20px; cursor: pointer; font-size: 16px;">
            Đăng nhập bằng Google
        </button>
    {:else}
        <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; border: 1px solid #c8e6c9;">
            <h3 style="margin-top: 0; color: #2e7d32;">✅ Đăng nhập thành công</h3>
            <p><strong>Ví zkLogin của bạn:</strong> <br>
                <code style="word-break: break-all; color: #d32f2f;">{userAddress}</code>
            </p>
            <button on:click={() => { enokiFlow.logout(); isAuthenticated = false; }} style="color: red; cursor: pointer; margin-top: 10px;">
                Đăng xuất
            </button>
        </div>

        <div style="margin-top: 2rem; padding: 1.5rem; border: 1px dashed #ccc; border-radius: 8px;">
            <h3>Tải tài liệu cần xác thực</h3>
            <input type="file" on:change={handleFileUpload} style="margin-bottom: 1rem;" />
            
            {#if fileHash}
                <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                    <p style="margin-top: 0;"><strong>Mã băm SHA-256 (Mã này sẽ đưa lên blockchain):</strong></p>
                    <code style="word-break: break-all; color: #0056b3; font-size: 1.1em;">{fileHash}</code>
                    
                    <button style="display: block; margin-top: 1.5rem; padding: 12px 24px; background: #007bff; color: white; cursor: pointer; border: none; border-radius: 6px; font-weight: bold;">
                        Lưu lên Blockchain (Giai đoạn 4)
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</main>