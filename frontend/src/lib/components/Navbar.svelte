<script lang="ts">
    import { enokiFlow } from '$lib/enoki';
    import { env } from '$env/dynamic/public';

    let { isAuthenticated = $bindable(), userAddress, locale = $bindable() } = $props();

    function toggleLocale() {
        locale = locale === 'vi' ? 'en' : 'vi';
    }

    async function loginWithGoogle() {
        const url = await enokiFlow.createAuthorizationURL({
            provider: 'google',
            clientId: env.PUBLIC_GOOGLE_CLIENT_ID,
            redirectUrl: `${window.location.protocol}//${window.location.host}`, 
            network: 'testnet'
        });
        window.location.href = url;
    }
</script>

<nav class="vt-top-nav">
    <div class="nav-left">
        <svg class="nav-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        <span class="nav-brand">DOCUMENT VAULT</span>
    </div>
    
    <div class="nav-right">
        <button class="nav-btn-lang" onclick={toggleLocale}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            {locale === 'vi' ? 'VI' : 'EN'}
        </button>

        {#if isAuthenticated}
            <span class="nav-address">{userAddress.slice(0,6)}...{userAddress.slice(-4)}</span>
            <button class="nav-btn-logout" onclick={() => { enokiFlow.logout(); isAuthenticated = false; }}>
                {locale === 'vi' ? 'Đăng xuất' : 'Sign out'}
            </button>
        {:else}
            <button class="nav-btn-signin" onclick={loginWithGoogle}>
                {locale === 'vi' ? 'Đăng nhập' : 'Sign In'}
            </button>
        {/if}
    </div>
</nav>

<style>
    .vt-top-nav {
        background: var(--vt-nav-bg);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex; justify-content: space-between; align-items: center;
        padding: 0.75rem 1.5rem; height: 55px;
        position: sticky; top: 0; z-index: 100;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }
    .nav-left { display: flex; align-items: center; gap: 0.75rem; color: var(--vt-accent-blue); }
    .nav-logo { width: 22px; height: 22px; }
    .nav-brand { font-size: 1rem; font-weight: 600; color: #fff; letter-spacing: 1px; }
    .nav-right { display: flex; align-items: center; gap: 1.2rem; }
    
    .nav-btn-lang {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        color: #fff; padding: 0.35rem 0.7rem; border-radius: 4px;
        font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;
        transition: all 0.2s;
    }
    .nav-btn-lang svg { width: 14px; height: 14px; }
    .nav-btn-lang:hover { border-color: var(--vt-accent-blue); background: rgba(138, 180, 248, 0.1); }

    .nav-address { font-family: var(--font-mono); font-size: 0.85rem; color: var(--vt-text-muted); }
    .nav-btn-logout { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--vt-text-main); padding: 0.45rem 1rem; border-radius: 4px; font-size: 0.85rem; cursor: pointer; }
    .nav-btn-logout:hover { border-color: var(--vt-danger); color: var(--vt-danger); }

    .nav-btn-signin {
        background: rgba(138, 180, 248, 0.1); border: 1px solid var(--vt-accent-blue);
        color: var(--vt-accent-blue); padding: 0.5rem 1.25rem; border-radius: 4px;
        font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .nav-btn-signin:hover { background: var(--vt-accent-blue); color: #000; box-shadow: 0 0 15px rgba(138, 180, 248, 0.3); }
</style>