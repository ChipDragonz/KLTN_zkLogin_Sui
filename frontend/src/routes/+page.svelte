<script lang="ts">
    import { onMount } from 'svelte';
    import { enokiFlow } from '$lib/enoki';
    import Navbar from '$lib/components/Navbar.svelte';
    import PublicScanner from '$lib/components/PublicScanner.svelte';
    import PublisherNode from '$lib/components/PublisherNode.svelte';
    import HistoryNode from '$lib/components/HistoryNode.svelte';
    import Footer from '$lib/components/Footer.svelte';

    let isAuthenticated = $state(false);
    let userAddress = $state('');
    let locale = $state('vi'); 
    let view = $state('main'); // Điều hướng giữa 'main' và 'history'

    onMount(async () => {
        try { await enokiFlow.handleAuthCallback(); } catch (e) {}
        const session = await enokiFlow.getSession();
        if (session?.jwt) {
            isAuthenticated = true;
            userAddress = (await enokiFlow.getKeypair({ network: 'testnet' })).toSuiAddress();
            window.history.replaceState(null, '', window.location.pathname);
        }
    });
</script>

<div class="vibe-bg">
    <div class="retro-grid"></div>
    <div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div>
</div>

<Navbar bind:isAuthenticated {userAddress} bind:locale bind:view />

<main class="vt-main-container">
    {#if view === 'main'}
        <div class="fade-in-node">
            <PublicScanner {locale} />
            <div style="margin-top: 6rem;">
                <PublisherNode {isAuthenticated} {userAddress} {locale} />
            </div>
        </div>
    {:else if view === 'history'}
        <div class="fade-in-node">
            <HistoryNode 
                {locale} 
                {isAuthenticated} 
                {userAddress} 
                onViewHome={() => view = 'main'} 
            />
        </div>
    {/if}
</main>

<Footer {locale} />

<style>
    :global(:root) {
        --vt-bg-color: #050511; --vt-nav-bg: #0c0e1a; --vt-border: #232a42;
        --vt-text-main: #e2e8f0; --vt-text-muted: #8492a6; --vt-accent-blue: #8ab4f8;
        --vt-success: #48bb78; --vt-danger: #f56565; 
        --font-main: 'Inter', system-ui, sans-serif; --font-mono: 'JetBrains Mono', monospace;
    }
    :global(body) { background: var(--vt-bg-color); color: var(--vt-text-main); font-family: var(--font-main); margin: 0; display: flex; flex-direction: column; min-height: 100vh; }
    .vt-main-container { max-width: 850px; margin: 0 auto; padding: 5rem 1.5rem; flex: 1; width: 100%; box-sizing: border-box; }
    .fade-in-node { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .vibe-bg { position: fixed; inset: 0; z-index: -1; background: #050511; }
    .retro-grid { position: absolute; bottom: 0; width: 100%; height: 60vh; background-image: linear-gradient(rgba(255, 0, 128, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 128, 0.08) 1px, transparent 1px); background-size: 40px 40px; transform: perspective(600px) rotateX(60deg); transform-origin: center top; opacity: 0.7; }
    .blob { position: absolute; filter: blur(120px); opacity: 0.3; border-radius: 50%; }
    .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, #ff007f 0%, transparent 75%); }
    .blob-2 { bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: radial-gradient(circle, #3b82f6 0%, transparent 75%); }
</style>