const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { SUPABASE_CONFIG, ADMIN_CONFIG } = require('../config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
        
        const sessionToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        if (!isFromConfig) {
            await supabase
                .from('admin_sessions')
                .insert({
                    admin_id: admin.id,
                    token: sessionToken,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                });
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
        await supabase.from('admin_sessions').delete().eq('token', sessionToken);
        res.json({ success: true });
    } catch (error) {
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
        const { data, error } = await supabase.from('settings').select('*').single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.json({
            server_name: 'Minecraft Server',
            tagline: 'Your adventure awaits!',
            ip: 'play.server.com',
            port: '25565',
            max_player: 100,
            community_count: 0,
            wa_link: '',
            discord_link: '',
            tiktok_link: ''
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
        res.json(data || null);
    } catch (error) {
        res.json(null);
    }
});

app.get('/api/ranks', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ranks')
            .select('*')
            .order('price', { ascending: true });
        res.json(data || []);
    } catch (error) {
        res.json([]);
    }
});

// ==================== ADMIN ENDPOINTS ====================

app.post('/api/settings', adminAuth, async (req, res) => {
    try {
        await supabase.from('settings').update(req.body).eq('id', 1);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/announcement', adminAuth, async (req, res) => {
    try {
        await supabase.from('announcements').update({ is_active: false }).neq('id', 0);
        const { data, error } = await supabase.from('announcements').insert([{
            title: req.body.title,
            content: req.body.content,
            is_active: true,
            created_at: new Date()
        }]).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/announcement', adminAuth, async (req, res) => {
    try {
        const { data: active } = await supabase.from('announcements').select('id').eq('is_active', true).single();
        if (!active) return res.status(404).json({ error: 'No active announcement' });
        await supabase.from('announcements').delete().eq('id', active.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ranks', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase.from('ranks').insert([req.body]).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/ranks/:id', adminAuth, async (req, res) => {
    try {
        await supabase.from('ranks').update(req.body).eq('id', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/ranks/:id', adminAuth, async (req, res) => {
    try {
        await supabase.from('ranks').delete().eq('id', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/ranks', adminAuth, async (req, res) => {
    try {
        await supabase.from('ranks').delete().neq('id', 0);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/ranks/inactive', adminAuth, async (req, res) => {
    try {
        await supabase.from('ranks').delete().eq('is_active', false);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export untuk Vercel
module.exports = app;
