// Global variables
let settings = {};
let whatsappLink = '';

// Fetch and initialize data
async function init() {
    await fetchSettings();
    await fetchAnnouncement();
    await fetchServerStatus();
    await fetchRanks();
    await updateMetaTags();
    setHeroBackground();
}

// Fetch settings from API
async function fetchSettings() {
    try {
        const response = await fetch('/api/settings');
        settings = await response.json();
        
        // Update UI with settings
        document.querySelectorAll('#server-name, #footer-name').forEach(el => {
            if (el) el.textContent = settings.server_name || 'Minecraft Server';
        });
        
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle) heroTitle.textContent = settings.server_name || 'Minecraft Server';
        
        const heroTagline = document.getElementById('hero-tagline');
        if (heroTagline) heroTagline.textContent = settings.tagline || 'Your adventure awaits!';
        
        const serverIp = document.getElementById('server-ip');
        if (serverIp) serverIp.textContent = settings.ip || 'play.server.com';
        
        const infoIp = document.getElementById('info-ip');
        if (infoIp) infoIp.textContent = settings.ip || '-';
        
        const infoPort = document.getElementById('info-port');
        if (infoPort) infoPort.textContent = settings.port || '25565';
        
        const infoCommunity = document.getElementById('info-community');
        if (infoCommunity) infoCommunity.textContent = settings.community_count || '0';
        
        // Set social links
        const socialLinks = [
            { id: 'social-wa', url: settings.wa_link },
            { id: 'social-discord', url: settings.discord_link },
            { id: 'social-tiktok', url: settings.tiktok_link },
            { id: 'footer-wa', url: settings.wa_link },
            { id: 'footer-discord', url: settings.discord_link },
            { id: 'footer-tiktok', url: settings.tiktok_link }
        ];
        
        socialLinks.forEach(link => {
            const element = document.getElementById(link.id);
            if (element && link.url) {
                element.href = link.url;
            }
        });
        
        whatsappLink = settings.wa_link;
        
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}

// Set hero background from local file
function setHeroBackground() {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
        const img = new Image();
        img.src = 'assets/images/bg-hero.jpg';
        img.onerror = function() {
            heroSection.style.backgroundImage = 'none';
            heroSection.style.background = 'linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%)';
        };
    }
}

// Fetch announcement
async function fetchAnnouncement() {
    try {
        const response = await fetch('/api/announcement');
        const announcement = await response.json();
        
        const announcementSection = document.getElementById('announcement-section');
        if (announcementSection && announcement && announcement.id) {
            const annTitle = document.getElementById('announcement-title');
            const annContent = document.getElementById('announcement-content');
            if (annTitle) annTitle.textContent = announcement.title;
            if (annContent) annContent.textContent = announcement.content;
            announcementSection.style.display = 'block';
        } else if (announcementSection) {
            announcementSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching announcement:', error);
        const announcementSection = document.getElementById('announcement-section');
        if (announcementSection) announcementSection.style.display = 'none';
    }
}

// Fetch server status from mcsrvstat.us
async function fetchServerStatus() {
    try {
        const ipElem = document.getElementById('server-ip');
        const portElem = document.getElementById('info-port');
        
        if (!ipElem) return;
        
        const ip = ipElem.textContent || 'play.server.com';
        const port = portElem ? portElem.textContent : '25565';
        const fullAddress = `${ip}:${port}`;
        
        const response = await fetch(`https://api.mcsrvstat.us/2/${fullAddress}`);
        const data = await response.json();
        
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const playerCountElem = document.getElementById('player-count');
        const infoStatus = document.getElementById('info-status');
        const infoPlayers = document.getElementById('info-players');
        
        if (statusIndicator && statusText) {
            if (data.online) {
                statusIndicator.innerHTML = '<i class="fas fa-circle status-online"></i>';
                statusText.textContent = 'Online';
                if (playerCountElem) playerCountElem.textContent = `👥 ${data.players?.online || 0}/${data.players?.max || settings.max_player || 100}`;
                if (infoStatus) infoStatus.textContent = '🟢 Online';
                if (infoPlayers) infoPlayers.textContent = `${data.players?.online || 0}/${data.players?.max || settings.max_player || 100}`;
            } else {
                statusIndicator.innerHTML = '<i class="fas fa-circle status-offline"></i>';
                statusText.textContent = 'Offline';
                if (playerCountElem) playerCountElem.textContent = '';
                if (infoStatus) infoStatus.textContent = '🔴 Offline';
                if (infoPlayers) infoPlayers.textContent = '0';
            }
        }
    } catch (error) {
        console.error('Error fetching server status:', error);
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            statusIndicator.innerHTML = '<i class="fas fa-circle status-offline"></i>';
        }
        const statusText = document.getElementById('status-text');
        if (statusText) statusText.textContent = 'Error';
    }
}

// Fetch ranks for shop page
async function fetchRanks() {
    const ranksGrid = document.getElementById('ranks-grid');
    if (!ranksGrid) return;
    
    try {
        const response = await fetch('/api/ranks');
        const ranks = await response.json();
        const activeRanks = ranks.filter(rank => rank.is_active);
        
        if (activeRanks.length === 0) {
            ranksGrid.innerHTML = '<p style="text-align:center">No ranks available</p>';
            return;
        }
        
        ranksGrid.innerHTML = activeRanks.map(rank => `
            <div class="rank-card">
                <h3>${escapeHtml(rank.name)}</h3>
                <div class="rank-price">Rp ${formatNumber(rank.price)}</div>
                <p class="rank-description">${escapeHtml(rank.description || '')}</p>
                <ul class="rank-benefits">
                    ${rank.benefits ? rank.benefits.split(',').map(b => `<li>✓ ${escapeHtml(b.trim())}</li>`).join('') : '<li>✓ Exclusive perks</li>'}
                </ul>
                <button class="btn btn-buy" onclick="buyRank('${rank.name}', ${rank.price})">
                    <i class="fab fa-whatsapp"></i> Buy Now
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error fetching ranks:', error);
        if (ranksGrid) ranksGrid.innerHTML = '<p style="text-align:center">Error loading ranks</p>';
    }
}

// Buy rank function
function buyRank(rankName, price) {
    if (whatsappLink) {
        const message = `Halo%2C%20saya%20tertarik%20untuk%20membeli%20rank%20${encodeURIComponent(rankName)}%20seharga%20Rp%20${formatNumber(price)}.%20Mohon%20informasi%20lebih%20lanjut.`;
        const url = whatsappLink.includes('?') ? `${whatsappLink}&text=${message}` : `${whatsappLink}?text=${message}`;
        window.open(url, '_blank');
        showToast('Redirecting to WhatsApp...');
    } else {
        showToast('WhatsApp link not configured');
    }
}

// Copy IP function
function copyIP() {
    const ipElement = document.getElementById('server-ip');
    if (ipElement) {
        navigator.clipboard.writeText(ipElement.textContent);
        showToast('IP Copied!');
        
        // Add visual feedback
        const btn = document.querySelector('.copy-ip-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
    }
}

// Join server function
const joinBtn = document.getElementById('join-btn');
if (joinBtn) {
    joinBtn.addEventListener('click', () => {
        const ip = document.getElementById('server-ip')?.textContent || '';
        if (ip) {
            navigator.clipboard.writeText(ip);
            showToast('IP Copied! Join Minecraft and enter the IP');
        }
    });
}

// Show toast notification
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper functions
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Update meta tags with local images
async function updateMetaTags() {
    const serverName = settings.server_name || 'Minecraft Server';
    const description = settings.tagline || 'Join the best Minecraft server with unique features, ranks, and an amazing community!';
    const baseUrl = window.location.origin;
    const ogImageUrl = `${baseUrl}/assets/images/og-image.jpg`;
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    
    if (ogTitle) ogTitle.setAttribute('content', serverName);
    if (ogDesc) ogDesc.setAttribute('content', description);
    if (ogImage) ogImage.setAttribute('content', ogImageUrl);
    if (ogSiteName) ogSiteName.setAttribute('content', serverName);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
    if (twitterImage) twitterImage.setAttribute('content', ogImageUrl);
    
    document.title = `${serverName} - Minecraft Server`;
}

// Refresh data when localStorage changes
window.addEventListener('storage', (e) => {
    if (e.key === 'announcementUpdated' || e.key === 'announcementDeleted') {
        fetchAnnouncement();
    }
    if (e.key === 'settingsUpdated') {
        fetchSettings();
    }
});

// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        }
    });
}

// Refresh server status every 30 seconds
setInterval(fetchServerStatus, 30000);

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
