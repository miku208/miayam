// ==================== KONFIGURASI SUPABASE ====================
// Ganti dengan kredensial Supabase kamu

const SUPABASE_CONFIG = {
    url: 'https://wxmadcygmemjkpfmzqnm.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bWFkY3lnbWVtamtwZm16cW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY2NjEyMSwiZXhwIjoyMDkzMjQyMTIxfQ.I_jd5OPAnsGAnEQAa8ykcw04h6GEpS2Q-VFWXnVXsAg'
};

// ==================== KONFIGURASI ADMIN ====================
const ADMIN_CONFIG = {
    username: 'miayam',
    password: 'wawan123'
};

// ==================== EKSPOR ====================
module.exports = { SUPABASE_CONFIG, ADMIN_CONFIG };