const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const crypto = require('crypto');
const { SUPABASE_CONFIG, ADMIN_CONFIG } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Supabase Client
const supabase = createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.serviceKey
);

// ==================== AUTH MIDDLEWARE ====================
const adminAuth = async (req, res, next) => {
    const sessionToken = req.headers['x-session-token'];
    
    if (!sessionToken) {
        return res.status(401).json({ error: 'No session token provided' });
    }
    
    try {
        const { data: session, error } = await supabase
            .from('admin_sessions')
            .select('*')
            .eq('token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single();
        
        if (error || !session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
        req.adminId = session.admin_id;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// ==================== AUTH ENDPOINTS ====================

app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        // Cek dari database dulu, fallback ke config
        let admin = null;
        let isFromConfig = false;
        
        // Coba cari di database
        const { data: dbAdmin, error: dbError } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();
        
        if (!dbError && dbAdmin) {
            admin = dbAdmin;
            if (admin.password !== password) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        } else {
            // Fallback ke config jika database kosong
            if (username === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password) {
                isFromConfig = true;
                admin = { id: 1, username: ADMIN_CONFIG.username, role: 'admin' };
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        
        // Generate session token
        const sessionToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        // Simpan session ke database (hanya jika database tersedia)
        if (!isFromConfig) {
            const { error: sessionError } = await supabase
                .from('admin_sessions')
                .insert({
                    admin_id: admin.id,
                    token: sessionToken,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                });
            
            if (sessionError) {
                console.error('Session error:', sessionError);
            }
        }
        
        res.json({
            success: true,
            token: sessionToken,
            expires_at: expiresAt,
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role || 'admin'
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/logout', adminAuth, async (req, res) => {
    try {
        const sessionToken = req.headers['x-session-token'];
        
        await supabase
            .from('admin_sessions')
            .delete()
            .eq('token', sessionToken);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

app.get('/api/admin/check', adminAuth, async (req, res) => {
    try {
        const { data: admin, error } = await supabase
            .from('admins')
            .select('id, username, role')
            .eq('id', req.adminId)
            .single();
        
        if (error) throw error;
        
        res.json({ authenticated: true, admin });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

// ==================== PUBLIC ENDPOINTS ====================

app.get('/api/settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .single();

        if (error) throw error;
        
        const settings = {
            id: data?.id || 1,
            server_name: data?.server_name || 'Minecraft Server',
            tagline: data?.tagline || 'Your adventure awaits!',
            description: data?.description || 'Best Minecraft server with unique features',
            ip: data?.ip || 'play.server.com',
            port: data?.port || '25565',
            max_player: data?.max_player || 100,
            community_count: data?.community_count || 0,
            wa_link: data?.wa_link || '',
            discord_link: data?.discord_link || '',
            tiktok_link: data?.tiktok_link || '',
            instagram_link: data?.instagram_link || ''
        };
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.json({
            id: 1,
            server_name: 'Minecraft Server',
            tagline: 'Your adventure awaits!',
            description: 'Best Minecraft server with unique features',
            ip: 'play.server.com',
            port: '25565',
            max_player: 100,
            community_count: 0,
            wa_link: '',
            discord_link: '',
            tiktok_link: '',
            instagram_link: ''
        });
    }
});

app.get('/api/announcement', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        res.json(data || null);
    } catch (error) {
        console.error('Error fetching announcement:', error);
        res.json(null);
    }
});

app.get('/api/ranks', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ranks')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error('Error fetching ranks:', error);
        res.json([]);
    }
});

// ==================== ADMIN ENDPOINTS ====================

app.post('/api/settings', adminAuth, async (req, res) => {
    try {
        const { data: currentSettings, error: fetchError } = await supabase
            .from('settings')
            .select('*')
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        const updateData = {};
        if (req.body.server_name !== undefined) updateData.server_name = req.body.server_name;
        if (req.body.tagline !== undefined) updateData.tagline = req.body.tagline;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.ip !== undefined) updateData.ip = req.body.ip;
        if (req.body.port !== undefined) updateData.port = req.body.port;
        if (req.body.max_player !== undefined) updateData.max_player = req.body.max_player;
        if (req.body.community_count !== undefined) updateData.community_count = req.body.community_count;
        if (req.body.wa_link !== undefined) updateData.wa_link = req.body.wa_link;
        if (req.body.discord_link !== undefined) updateData.discord_link = req.body.discord_link;
        if (req.body.tiktok_link !== undefined) updateData.tiktok_link = req.body.tiktok_link;
        if (req.body.instagram_link !== undefined) updateData.instagram_link = req.body.instagram_link;
        
        let result;
        if (currentSettings) {
            const { data, error } = await supabase
                .from('settings')
                .update(updateData)
                .eq('id', 1)
                .select();
            
            if (error) throw error;
            result = data[0];
        } else {
            const { data, error } = await supabase
                .from('settings')
                .insert([{ id: 1, ...updateData }])
                .select();
            
            if (error) throw error;
            result = data[0];
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/announcement', adminAuth, async (req, res) => {
    try {
        await supabase
            .from('announcements')
            .update({ is_active: false })
            .neq('id', 0);

        const { data, error } = await supabase
            .from('announcements')
            .insert([{
                title: req.body.title,
                content: req.body.content,
                is_active: true,
                created_at: new Date()
            }])
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/announcement', adminAuth, async (req, res) => {
    try {
        const { data: activeAnnouncement, error: fetchError } = await supabase
            .from('announcements')
            .select('id')
            .eq('is_active', true)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!activeAnnouncement) {
            return res.status(404).json({ error: 'No active announcement found' });
        }

        const { error: deleteError } = await supabase
            .from('announcements')
            .delete()
            .eq('id', activeAnnouncement.id);

        if (deleteError) throw deleteError;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: error.message });
    }
});

// RANK ENDPOINTS
app.post('/api/ranks', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ranks')
            .insert([{
                name: req.body.name,
                price: req.body.price,
                description: req.body.description || '',
                benefits: req.body.benefits || '',
                is_active: req.body.is_active !== false
            }])
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('Error creating rank:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/ranks/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ranks')
            .update({
                name: req.body.name,
                price: req.body.price,
                description: req.body.description || '',
                benefits: req.body.benefits || '',
                is_active: req.body.is_active
            })
            .eq('id', req.params.id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('Error updating rank:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/ranks/:id', adminAuth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('ranks')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting rank:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/ranks', adminAuth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('ranks')
            .delete()
            .neq('id', 0);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting all ranks:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/ranks/inactive', adminAuth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('ranks')
            .delete()
            .eq('is_active', false);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting inactive ranks:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATIC FILES ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/shop.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Tambahkan ini di server.js, setelah app.use(express.static...)

// Route manual untuk CSS
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

app.get('/admin.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.js'));
});

// 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.url}` });
});


// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
    console.log(`\n📋 Available API endpoints:`);
    console.log(`   POST /api/admin/login`);
    console.log(`   POST /api/admin/logout`);
    console.log(`   GET  /api/admin/check`);
    console.log(`   GET  /api/settings`);
    console.log(`   GET  /api/announcement`);
    console.log(`   GET  /api/ranks`);
});