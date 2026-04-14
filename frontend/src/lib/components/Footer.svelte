<script lang="ts">
    // Nhận biến locale từ trang chính để chuyển đổi ngôn ngữ
    let { locale } = $props();
</script>

<footer class="vt-footer">
    <div class="footer-container">
        <div class="footer-col brand-col">
            <div class="footer-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>DOCUMENT VAULT</span>
            </div>
            <p class="brand-info">
                {locale === 'vi' 
                    ? 'Hệ thống công chứng tài liệu phi tập trung trên Sui Blockchain.' 
                    : 'Decentralized document notary system powered by Sui Blockchain.'}
            </p>
            <div class="social-box">
                <a href="https://github.com/ChipDragonz/KLTN_zkLogin_Sui" aria-label="GitHub"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a>
                <a href="#twitter" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
            </div>
        </div>

        <div class="footer-col">
            <h4>{locale === 'vi' ? 'Sản phẩm' : 'Our product'}</h4>
            <a href="#about">{locale === 'vi' ? 'Về chúng tôi' : 'Document Vault'}</a>
            <a href="#contact">{locale === 'vi' ? 'Liên hệ' : 'Contact Us'}</a>
            <a href="#support">{locale === 'vi' ? 'Hỗ trợ' : 'Get Support'}</a>
        </div>

        <div class="footer-col">
            <h4>{locale === 'vi' ? 'Công nghệ' : 'Technology'}</h4>
            <a href="https://sui.io/" target="_blank">Sui Blockchain</a>
            <a href="#!" target="_blank">zkLogin Auth</a>
            <a href="#smart-contract">Smart Contracts</a>
        </div>

        <div class="footer-col">
            <h4>{locale === 'vi' ? 'Dịch vụ' : 'Services'}</h4>
            <a href="#api">API Integration</a>
            <a href="#enterprise">Enterprise Node</a>
            <a href="#security">Security Audit</a>
        </div>

        <div class="footer-col">
            <h4>{locale === 'vi' ? 'Tài liệu' : 'Documentation'}</h4>
            <a href="#search">{locale === 'vi' ? 'Tra cứu Hash' : 'Searching Hash'}</a>
            <a href="#reports">{locale === 'vi' ? 'Báo cáo' : 'Audit Reports'}</a>
            <a href="#tos">{locale === 'vi' ? 'Điều khoản' : 'Terms of Service'}</a>
        </div>
    </div>
    
    <div class="footer-bottom">
        <p>© 2026 Document Vault. {locale === 'vi' ? 'Hệ thống công chứng phi tập trung.' : 'Decentralized Notary System.'}</p>
    </div>
</footer>

<style>
    .vt-footer {
        background: rgba(10, 12, 24, 0.95);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding: 5rem 1.5rem 2rem;
        margin-top: 6rem;
        font-family: var(--font-main);
    }
    .footer-container {
        max-width: 1100px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.5fr repeat(4, 1fr);
        gap: 2.5rem;
        margin-bottom: 4rem;
    }

    /* Brand Column */
    .brand-col .footer-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--vt-accent-blue);
        font-weight: 700;
        margin-bottom: 1.2rem;
    }
    .brand-col .footer-logo svg { width: 24px; height: 24px; }
    .brand-info {
        color: var(--vt-text-muted);
        font-size: 0.85rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
    }
    .social-box { display: flex; gap: 1rem; }
    .social-box a { color: var(--vt-text-muted); transition: color 0.2s; }
    .social-box a svg { width: 20px; height: 20px; }
    .social-box a:hover { color: #fff; }

    /* Standard Columns */
    .footer-col h4 {
        color: #fff;
        font-size: 0.85rem;
        font-weight: 600;
        margin: 0 0 1.5rem 0;
        letter-spacing: 1px;
        text-transform: uppercase;
    }
    .footer-col a {
        display: block;
        color: var(--vt-text-muted);
        text-decoration: none;
        font-size: 0.9rem;
        margin-bottom: 0.8rem;
        transition: all 0.2s ease;
    }
    .footer-col a:hover {
        color: var(--vt-accent-blue);
        padding-left: 4px;
    }

    /* Bottom */
    .footer-bottom {
        max-width: 1100px;
        margin: 0 auto;
        text-align: center;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 2rem;
    }
    .footer-bottom p {
        color: var(--vt-text-muted);
        font-size: 0.8rem;
        margin: 0;
    }
    
    @media (max-width: 1024px) {
        .footer-container { grid-template-columns: repeat(3, 1fr); }
        .brand-col { grid-column: span 3; }
    }
    @media (max-width: 600px) {
        .footer-container { grid-template-columns: repeat(2, 1fr); }
        .brand-col { grid-column: span 2; }
    }
</style>