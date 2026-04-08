const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../database/supabase');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, profession } = req.body;
        
        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password_hash: hashedPassword,
                role: 'user',
                avatar: name.charAt(0).toUpperCase()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date() })
            .eq('id', user.id);
        
        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create default admin (run once)
async function createDefaultAdmin() {
    const adminEmail = 'admin@govt.com';
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .single();
    
    if (!existing) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await supabase
            .from('users')
            .insert({
                name: 'Administrator',
                email: adminEmail,
                password_hash: hashedPassword,
                role: 'admin',
                avatar: 'A'
            });
        console.log('✅ Default admin created: admin@govt.com / admin123');
    }
}

createDefaultAdmin();

module.exports = router;