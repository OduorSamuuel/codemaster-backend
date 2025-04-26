const express = require('express');
const Section = require('../models/Section');

const router = express.Router();

// Create a new section
router.post('/', async (req, res) => {
    const { title, type, content, codeSnippet, language, tutorial } = req.body;

    if (type === 'code' && !codeSnippet) {
        return res.status(400).json({ error: 'Code snippet is required for code sections.' });
    }

    if (type === 'text' && !content) {
        return res.status(400).json({ error: 'Content is required for text sections.' });
    }

    try {
        const newSection = new Section({ title, type, content, codeSnippet, language, tutorial });
        await newSection.save();
        res.status(201).json(newSection);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all sections for a tutorial
router.get('/tutorial/:tutorialId', async (req, res) => {
    try {
        const sections = await Section.find({ tutorial: req.params.tutorialId });
        res.json(sections);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching sections' });
    }
});

module.exports = router;
