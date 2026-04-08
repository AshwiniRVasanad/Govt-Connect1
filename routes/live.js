const express = require('express');
const axios = require('axios');
const feedparser = require('feedparser');
const { supabase } = require('../database/supabase');

const router = express.Router();

// Fetch LIVE schemes from PIB
router.get('/pib', async (req, res) => {
    try {
        const response = await axios.get(process.env.PIB_RSS_URL, {
            responseType: 'stream'
        });
        
        const articles = [];
        const parser = response.data.pipe(feedparser);
        
        parser.on('readable', function() {
            let item;
            while (item = this.read()) {
                articles.push({
                    title: item.title,
                    description: item.description?.substring(0, 500),
                    link: item.link,
                    pubDate: item.pubDate,
                    source: 'PIB'
                });
            }
        });
        
        parser.on('end', async () => {
            // Cache to database
            for (const article of articles.slice(0, 20)) {
                await supabase
                    .from('live_updates')
                    .upsert({
                        title: article.title,
                        description: article.description,
                        link: article.link,
                        source: article.source,
                        published_at: article.pubDate,
                        category: detectCategory(article.title)
                    });
            }
            
            res.json({ updates: articles.slice(0, 20), source: 'PIB' });
        });
    } catch (error) {
        console.error('PIB fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch PIB updates' });
    }
});

// Function to detect category from title
function detectCategory(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('education') || lowerTitle.includes('scholarship')) return 'Education';
    if (lowerTitle.includes('agriculture') || lowerTitle.includes('farmer')) return 'Agriculture';
    if (lowerTitle.includes('health') || lowerTitle.includes('medical')) return 'Health';
    if (lowerTitle.includes('employment') || lowerTitle.includes('job')) return 'Employment';
    if (lowerTitle.includes('business') || lowerTitle.includes('loan')) return 'Business';
    if (lowerTitle.includes('house') || lowerTitle.includes('awas')) return 'Housing';
    return 'General';
}

// Get cached live updates
router.get('/cached', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('live_updates')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(30);
        
        if (error) throw error;
        res.json({ updates: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get cached updates' });
    }
});

// Karnataka specific schemes
router.get('/karnataka', async (req, res) => {
    const karnatakaSchemes = [
        {
            name: "Karnataka Gruha Jyothi",
            description: "Free electricity up to 200 units for BPL families",
            link: "https://grameen.karnataka.gov.in",
            category: "Energy"
        },
        {
            name: "Karnataka Yuva Nidhi",
            description: "₹3000/month allowance for unemployed graduates",
            link: "https://karnataka.gov.in",
            category: "Employment"
        },
        {
            name: "Karnataka Shakti",
            description: "Free bus travel for women across Karnataka",
            link: "https://karnataka.gov.in",
            category: "Women"
        },
        {
            name: "Karnataka Anna Bhagya",
            description: "10kg free rice per person for BPL families",
            link: "https://karnataka.gov.in",
            category: "General"
        },
        {
            name: "Karnataka Vidyasiri",
            description: "Scholarship for SC/ST students",
            link: "https://backwardclasses.karnataka.gov.in",
            category: "Education"
        }
    ];
    
    res.json({ schemes: karnatakaSchemes, source: 'Karnataka Govt' });
});

module.exports = router;