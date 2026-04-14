<script lang="ts">
    import { enokiFlow } from '$lib/enoki';
    import { env } from '$env/dynamic/public';

    // Nhận các props bindable để đồng bộ trạng thái với +page.svelte
    let { 
        isAuthenticated = $bindable(), 
        userAddress, 
        locale = $bindable(), 
        view = $bindable() 
    } = $props();

    // Chuyển đổi ngôn ngữ
    function toggleLocale() {
        locale = locale === 'vi' ? 'en' : 'vi';
    }

    // Đăng nhập zkLogin
    async function loginWithGoogle() {
        const url = await enokiFlow.createAuthorizationURL({
            provider: 'google',
            clientId: env.PUBLIC_GOOGLE_CLIENT_ID,
            redirectUrl: `${window.location.protocol}//${window.location.host}`, 
            network: 'testnet'
        });
        window.location.href = url;
    }

    // Đăng xuất
    function handleLogout() {
        enokiFlow.logout();
        isAuthenticated = false;
        view = 'main'; // Quay về trang chủ khi thoát
    }
</script>

<nav class="vt-top-nav">
    <button class="nav-left" onclick={() => view = 'main'}>
        <svg class="nav-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v4"/><path d="M12 16h.01"/>
        </svg>
        <span class="nav-brand">DOCUMENT VAULT</span>
    </button>
    
    <div class="nav-right">
        <button 
            class="nav-btn-link {view === 'history' ? 'active' : ''}" 
            onclick={() => view = 'history'}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="nav-icon">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="link-text">{locale === 'vi' ? 'Lịch sử' : 'History'}</span>
        </button>

        <button class="nav-btn-lang" onclick={toggleLocale}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span class="lang-label">{locale === 'vi' ? 'VI' : 'EN'}</span>
        </button>

        {#if isAuthenticated}
            <div class="user-auth-info">
                <span class="nav-address">
                    {userAddress.slice(0,6)}...{userAddress.slice(-4)}
                </span>
                <button class="nav-btn-logout" onclick={handleLogout}>
                    {locale === 'vi' ? 'Đăng xuất' : 'Sign out'}
                </button>
            </div>
        {:else}
            <button class="nav-btn-signin" onclick={loginWithGoogle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                </svg>
                {locale === 'vi' ? 'Đăng nhập' : 'Sign In'}
            </button>
        {/if}
    </div>
</nav>

<style>
    .vt-top-nav {
        background: var(--vt-nav-bg);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex; 
        justify-content: space-between; 
        align-items: center;
        padding: 0 1.5rem; 
        height: 60px;
        position: sticky; 
        top: 0; 
        z-index: 1000;
        backdrop-filter: blur(10px);
    }

    /* Reset button styles */
    button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
    }

    .nav-left { 
        display: flex; 
        align-items: center; 
        gap: 0.75rem; 
        color: var(--vt-accent-blue);
    }
    .nav-logo { width: 24px; height: 24px; }
    .nav-brand { 
        font-size: 1.05rem; 
        font-weight: 700; 
        color: #fff; 
        letter-spacing: 1.5px; 
    }

    .nav-right { display: flex; align-items: center; gap: 1.5rem; }

    /* Nút dạng link cho Lịch sử */
    .nav-btn-link {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        font-size: 0.9rem;
        font-weight: 500;
        padding: 0.5rem 0.8rem;
        border-radius: 6px;
        transition: all 0.2s;
    }
    .nav-btn-link:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--vt-accent-blue);
    }
    .nav-btn-link.active {
        color: var(--vt-accent-blue);
        background: rgba(138, 180, 248, 0.1);
        box-shadow: inset 0 0 0 1px rgba(138, 180, 248, 0.2);
    }
    .nav-icon { width: 18px; height: 18px; }

    .nav-btn-lang {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff; 
        padding: 0.4rem 0.8rem; 
        border-radius: 6px;
        font-size: 0.75rem; 
        font-weight: 800; 
        display: flex; 
        align-items: center; 
        gap: 8px;
    }
    .nav-btn-lang svg { width: 14px; height: 14px; color: var(--vt-accent-blue); }

    .user-auth-info { display: flex; align-items: center; gap: 1rem; }
    .nav-address { 
        font-family: var(--font-mono); 
        font-size: 0.85rem; 
        color: var(--vt-text-muted); 
    }

    .nav-btn-logout {
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: var(--vt-text-main); 
        padding: 0.4rem 0.8rem; 
        border-radius: 6px;
        font-size: 0.85rem; 
    }
    .nav-btn-logout:hover {
        border-color: var(--vt-danger);
        color: var(--vt-danger);
    }

    .nav-btn-signin {
        background: #fff; 
        color: #000; 
        padding: 0.5rem 1.25rem; 
        border-radius: 6px;
        font-size: 0.9rem; 
        font-weight: 700; 
        display: flex;
        align-items: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .nav-btn-signin:hover {
        background: var(--vt-accent-blue);
    }

    @media (max-width: 640px) {
        .nav-brand, .link-text, .nav-address { display: none; }
    }
</style>