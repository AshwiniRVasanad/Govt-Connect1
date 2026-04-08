const express = require('express');
const { supabase } = require('../database/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Add new scheme
router.post('/schemes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('schemes')
            .insert({
                ...req.body,
                source: 'admin',
                created_at: new Date(),
                updated_at: new Date()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ scheme: data, message: 'Scheme added successfully' });
    } catch (error) {
        console.error('Add scheme error:', error);
        res.status(500).json({ error: 'Failed to add scheme' });
    }
});

// Update scheme
router.put('/schemes/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('schemes')
            .update({
                ...req.body,
                updated_at: new Date()
            })
            .eq('id', req.params.id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ scheme: data, message: 'Scheme updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update scheme' });
    }
});

// Delete scheme
router.delete('/schemes/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('schemes')
            .update({ is_active: false })
            .eq('id', req.params.id);
        
        if (error) throw error;
        
        res.json({ message: 'Scheme deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete scheme' });
    }
});

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        const [schemes, users, chats, live] = await Promise.all([
            supabase.from('schemes').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('chat_sessions').select('*', { count: 'exact', head: true }),
            supabase.from('live_updates').select('*', { count: 'exact', head: true })
        ]);
        
        res.json({
            totalSchemes: schemes.count,
            totalUsers: users.count,
            totalChats: chats.count,
            totalLiveUpdates: live.count
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Bulk import schemes
router.post('/bulk-import', async (req, res) => {
    try {
        const { schemes } = req.body;
        let imported = 0;
        let failed = 0;
        
        for (const scheme of schemes) {
            const { error } = await supabase
                .from('schemes')
                .insert({
                    ...scheme,
                    source: 'bulk_import',
                    created_at: new Date()
                });
            
            if (error) failed++;
            else imported++;
        }
        
        res.json({
            message: `Import completed: ${imported} imported, ${failed} failed`,
            imported,
            failed
        });
    } catch (error) {
        res.status(500).json({ error: 'Bulk import failed' });
    }
});

module.exports = router;