const express = require('express');
const { supabase } = require('../database/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all schemes (public)
router.get('/', async (req, res) => {
    try {
        const { category, search, limit = 50 } = req.query;
        
        let query = supabase
            .from('schemes')
            .select('*')
            .eq('is_active', true);
        
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        
        const { data, error } = await query.limit(limit);
        
        if (error) throw error;
        
        res.json({ schemes: data, total: data.length });
    } catch (error) {
        console.error('Get schemes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single scheme
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('schemes')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        res.status(404).json({ error: 'Scheme not found' });
    }
});

// Get schemes by category
router.get('/category/:category', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('schemes')
            .select('*')
            .eq('category', req.params.category)
            .eq('is_active', true);
        
        if (error) throw error;
        
        res.json({ schemes: data });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;