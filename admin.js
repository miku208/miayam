let isAuthenticated = false;
let currentRanks = [];
let selectedRanks = new Set();
let currentAnnouncement = null;

// Load settings into form
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        const setServerName = document.getElementById('set-server-name');
        const setTagline = document.getElementById('set-tagline');
        const setIp = document.getElementById('set-ip');
        const setPort = document.getElementById('set-port');
        const setMaxPlayer = document.getElementById('set-max-player');
        const setCommunityCount = document.getElementById('set-community-count');
        const setWaLink = document.getElementById('set-wa-link');
        const setDiscordLink = document.getElementById('set-discord-link');
        const setTiktokLink = document.getElementById('set-tiktok-link');
        
        if (setServerName) setServerName.value = settings.server_name || '';
        if (setTagline) setTagline.value = settings.tagline || 'Your adventure awaits!';
        if (setIp) setIp.value = settings.ip || '';
        if (setPort) setPort.value = settings.port || '';
        if (setMaxPlayer) setMaxPlayer.value = settings.max_player || '';
        if (setCommunityCount) setCommunityCount.value = settings.community_count || '';
        if (setWaLink) setWaLink.value = settings.wa_link || '';
        if (setDiscordLink) setDiscordLink.value = settings.discord_link || '';
        if (setTiktokLink) setTiktokLink.value = settings.tiktok_link || '';
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error loading settings');
    }
}

// Load assets preview
function loadAssetsPreview() {
    const logoPreview = document.getElementById('logo-preview');
    if (logoPreview) {
        logoPreview.src = 'assets/images/logo.png?' + Date.now();
        logoPreview.onerror = function() {
            this.src = 'https://placehold.co/150x150/2a2e3d/5865f2?text=Logo';
        };
    }
    
    const ogPreview = document.getElementById('og-preview');
    if (ogPreview) {
        ogPreview.src = 'assets/images/og-image.jpg?' + Date.now();
        ogPreview.onerror = function() {
            this.src = 'https://placehold.co/1200x630/2a2e3d/5865f2?text=OG+Image';
        };
    }
    
    const bgPreview = document.getElementById('bg-preview');
    if (bgPreview) {
        const img = new Image();
        img.src = 'assets/images/bg-hero.jpg?' + Date.now();
        img.onload = function() {
            bgPreview.style.backgroundImage = "url('assets/images/bg-hero.jpg?" + Date.now() + "')";
            bgPreview.style.backgroundSize = 'cover';
            bgPreview.style.backgroundPosition = 'center';
        };
        img.onerror = function() {
            bgPreview.style.backgroundImage = "linear-gradient(135deg, #0a0e1a, #1a1f2e)";
        };
    }
}

// Save settings
const settingsForm = document.getElementById('settings-form');
if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('login-password')?.value || 'admin123';
        
        const settings = {
            server_name: document.getElementById('set-server-name').value,
            tagline: document.getElementById('set-tagline').value,
            ip: document.getElementById('set-ip').value,
            port: document.getElementById('set-port').value,
            max_player: parseInt(document.getElementById('set-max-player').value) || 100,
            community_count: parseInt(document.getElementById('set-community-count').value) || 0,
            wa_link: document.getElementById('set-wa-link').value,
            discord_link: document.getElementById('set-discord-link').value,
            tiktok_link: document.getElementById('set-tiktok-link').value
        };
        
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'admin-password': password
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                showToast('Settings saved successfully!');
                loadSettings();
                localStorage.setItem('settingsUpdated', Date.now().toString());
            } else {
                const error = await response.json();
                showToast(error.error || 'Error saving settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast('Error saving settings');
        }
    });
}

// Load announcement
async function loadAnnouncement() {
    try {
        const response = await fetch('/api/announcement');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        currentAnnouncement = await response.json();
        
        const annTitle = document.getElementById('ann-title');
        const annContent = document.getElementById('ann-content');
        const currentCard = document.getElementById('current-announcement-card');
        const currentTitle = document.getElementById('current-ann-title');
        const currentContent = document.getElementById('current-ann-content');
        const currentDate = document.getElementById('current-ann-date');
        
        if (currentAnnouncement && currentAnnouncement.id) {
            if (currentCard) currentCard.style.display = 'block';
            if (currentTitle) currentTitle.textContent = currentAnnouncement.title;
            if (currentContent) currentContent.textContent = currentAnnouncement.content;
            if (currentDate) currentDate.textContent = `Created: ${new Date(currentAnnouncement.created_at).toLocaleString()}`;
            if (annTitle) annTitle.value = '';
            if (annContent) annContent.value = '';
        } else {
            if (currentCard) currentCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading announcement:', error);
        const currentCard = document.getElementById('current-announcement-card');
        if (currentCard) currentCard.style.display = 'none';
    }
}

// Delete announcement
async function deleteAnnouncement() {
    if (!currentAnnouncement || !currentAnnouncement.id) {
        showToast('No announcement to delete');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete the announcement "${currentAnnouncement.title}"?`)) {
        return;
    }
    
    const password = document.getElementById('login-password')?.value || 'admin123';
    
    try {
        const response = await fetch('/api/announcement', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'admin-password': password
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Announcement deleted successfully!');
            currentAnnouncement = null;
            await loadAnnouncement();
            localStorage.setItem('announcementDeleted', Date.now().toString());
        } else {
            showToast(result.error || 'Error deleting announcement');
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showToast('Error deleting announcement: ' + error.message);
    }
}

// Save announcement
const announcementForm = document.getElementById('announcement-form');
if (announcementForm) {
    announcementForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('login-password')?.value || 'admin123';
        
        const announcement = {
            title: document.getElementById('ann-title').value,
            content: document.getElementById('ann-content').value
        };
        
        if (!announcement.title || !announcement.content) {
            showToast('Please fill in both title and content');
            return;
        }
        
        try {
            const response = await fetch('/api/announcement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'admin-password': password
                },
                body: JSON.stringify(announcement)
            });
            
            if (response.ok) {
                showToast('Announcement published successfully!');
                announcementForm.reset();
                await loadAnnouncement();
                localStorage.setItem('announcementUpdated', Date.now().toString());
            } else {
                const error = await response.json();
                showToast(error.error || 'Error publishing announcement');
            }
        } catch (error) {
            console.error('Error saving announcement:', error);
            showToast('Error publishing announcement');
        }
    });
}

// Load ranks
async function loadRanks() {
    try {
        const response = await fetch('/api/ranks');
        currentRanks = await response.json();
        renderRanksTable();
    } catch (error) {
        console.error('Error loading ranks:', error);
    }
}

// Render ranks table
function renderRanksTable() {
    const tbody = document.getElementById('ranks-table-body');
    if (!tbody) return;
    
    if (currentRanks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No ranks available</td></tr>';
        return;
    }
    
    tbody.innerHTML = currentRanks.map(rank => `
        <tr>
            <td>
                <input type="checkbox" class="rank-checkbox" data-id="${rank.id}" 
                       onchange="toggleRankSelection(${rank.id})">
            </td>
            <td>${escapeHtml(rank.name)}</td>
            <td>Rp ${formatNumber(rank.price)}</td>
            <td>${escapeHtml(rank.description?.substring(0, 50) || '-')}</td>
            <td>${escapeHtml(rank.benefits?.substring(0, 50) || '-')}</td>
            <td>${rank.is_active ? '✅ Active' : '❌ Inactive'}</td>
            <td>
                <button class="edit-btn" onclick="editRank(${rank.id})">Edit</button>
                <button class="delete-btn" onclick="deleteRank(${rank.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function toggleRankSelection(rankId) {
    if (selectedRanks.has(rankId)) {
        selectedRanks.delete(rankId);
    } else {
        selectedRanks.add(rankId);
    }
    updateDeleteSelectedButton();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const checkboxes = document.querySelectorAll('.rank-checkbox');
    
    if (selectAllCheckbox && selectAllCheckbox.checked) {
        checkboxes.forEach(cb => {
            cb.checked = true;
            selectedRanks.add(parseInt(cb.dataset.id));
        });
    } else if (selectAllCheckbox) {
        checkboxes.forEach(cb => {
            cb.checked = false;
            selectedRanks.clear();
        });
    }
    updateDeleteSelectedButton();
}

function updateDeleteSelectedButton() {
    const btn = document.getElementById('delete-selected-btn');
    if (btn) {
        btn.textContent = `Delete Selected (${selectedRanks.size})`;
        btn.disabled = selectedRanks.size === 0;
    }
}

async function deleteSelectedRanks() {
    if (selectedRanks.size === 0) return;
    if (!confirm(`Delete ${selectedRanks.size} selected rank(s)?`)) return;
    
    const password = document.getElementById('login-password')?.value || 'admin123';
    let deletedCount = 0;
    
    for (const id of selectedRanks) {
        try {
            const response = await fetch(`/api/ranks/${id}`, {
                method: 'DELETE',
                headers: { 'admin-password': password }
            });
            if (response.ok) deletedCount++;
        } catch (error) {
            console.error(`Error deleting rank ${id}:`, error);
        }
    }
    
    selectedRanks.clear();
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    showToast(`Deleted ${deletedCount} rank(s)!`);
    loadRanks();
}

async function deleteAllRanks() {
    if (!confirm('⚠️ WARNING: This will delete ALL ranks permanently! Are you absolutely sure?')) return;
    
    const password = document.getElementById('login-password')?.value || 'admin123';
    
    try {
        const response = await fetch('/api/ranks', {
            method: 'DELETE',
            headers: {
                'admin-password': password
            }
        });
        
        if (response.ok) {
            showToast('All ranks deleted successfully!');
            selectedRanks.clear();
            loadRanks();
        } else {
            showToast('Error deleting ranks');
        }
    } catch (error) {
        console.error('Error deleting all ranks:', error);
        showToast('Error deleting ranks');
    }
}

async function deleteInactiveRanks() {
    const inactiveRanks = currentRanks.filter(rank => !rank.is_active);
    
    if (inactiveRanks.length === 0) {
        showToast('No inactive ranks to delete');
        return;
    }
    
    if (!confirm(`Delete ${inactiveRanks.length} inactive rank(s)?`)) return;
    
    const password = document.getElementById('login-password')?.value || 'admin123';
    
    try {
        const response = await fetch('/api/ranks/inactive', {
            method: 'DELETE',
            headers: {
                'admin-password': password
            }
        });
        
        if (response.ok) {
            showToast(`Deleted ${inactiveRanks.length} inactive ranks!`);
            selectedRanks.clear();
            loadRanks();
        } else {
            showToast('Error deleting inactive ranks');
        }
    } catch (error) {
        console.error('Error deleting inactive ranks:', error);
        showToast('Error deleting ranks');
    }
}

function showRankModal(rank = null) {
    const modal = document.getElementById('rank-modal');
    const modalTitle = document.getElementById('modal-title');
    
    if (rank) {
        if (modalTitle) modalTitle.textContent = 'Edit Rank';
        document.getElementById('rank-id').value = rank.id;
        document.getElementById('rank-name').value = rank.name;
        document.getElementById('rank-price').value = rank.price;
        document.getElementById('rank-description').value = rank.description || '';
        document.getElementById('rank-benefits').value = rank.benefits || '';
        document.getElementById('rank-active').checked = rank.is_active;
    } else {
        if (modalTitle) modalTitle.textContent = 'Add Rank';
        const rankForm = document.getElementById('rank-form');
        if (rankForm) rankForm.reset();
        document.getElementById('rank-id').value = '';
        document.getElementById('rank-active').checked = true;
    }
    
    if (modal) modal.style.display = 'block';
}

function editRank(id) {
    const rank = currentRanks.find(r => r.id === id);
    if (rank) showRankModal(rank);
}

async function deleteRank(id) {
    if (!confirm('Are you sure you want to delete this rank?')) return;
    
    const password = document.getElementById('login-password')?.value || 'admin123';
    
    try {
        const response = await fetch(`/api/ranks/${id}`, {
            method: 'DELETE',
            headers: {
                'admin-password': password
            }
        });
        
        if (response.ok) {
            showToast('Rank deleted successfully!');
            if (selectedRanks.has(id)) selectedRanks.delete(id);
            loadRanks();
        } else {
            showToast('Error deleting rank');
        }
    } catch (error) {
        console.error('Error deleting rank:', error);
        showToast('Error deleting rank');
    }
}

const rankForm = document.getElementById('rank-form');
if (rankForm) {
    rankForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('login-password')?.value || 'admin123';
        
        const rankId = document.getElementById('rank-id').value;
        const rankData = {
            name: document.getElementById('rank-name').value,
            price: parseInt(document.getElementById('rank-price').value),
            description: document.getElementById('rank-description').value,
            benefits: document.getElementById('rank-benefits').value,
            is_active: document.getElementById('rank-active').checked
        };
        
        const url = rankId ? `/api/ranks/${rankId}` : '/api/ranks';
        const method = rankId ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'admin-password': password
                },
                body: JSON.stringify(rankData)
            });
            
            if (response.ok) {
                showToast(rankId ? 'Rank updated successfully!' : 'Rank added successfully!');
                document.getElementById('rank-modal').style.display = 'none';
                loadRanks();
            } else {
                showToast('Error saving rank');
            }
        } catch (error) {
            console.error('Error saving rank:', error);
            showToast('Error saving rank');
        }
    });
}

document.querySelector('.close-modal')?.addEventListener('click', () => {
    document.getElementById('rank-modal').style.display = 'none';
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('rank-modal');
    if (e.target === modal && modal) {
        modal.style.display = 'none';
    }
});

document.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
        const activeTab = document.getElementById(`tab-${tab}`);
        if (activeTab) activeTab.style.display = 'block';
        
        if (tab === 'assets') {
            loadAssetsPreview();
        }
    });
});

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

// Global functions
window.showRankModal = showRankModal;
window.editRank = editRank;
window.deleteRank = deleteRank;
window.deleteAllRanks = deleteAllRanks;
window.deleteInactiveRanks = deleteInactiveRanks;
window.deleteSelectedRanks = deleteSelectedRanks;
window.toggleRankSelection = toggleRankSelection;
window.toggleSelectAll = toggleSelectAll;
window.deleteAnnouncement = deleteAnnouncement;
window.loadSettings = loadSettings;
window.loadRanks = loadRanks;
window.loadAnnouncement = loadAnnouncement;
window.loadAssetsPreview = loadAssetsPreview;
