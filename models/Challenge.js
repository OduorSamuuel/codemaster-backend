const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    tutorial: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutorial', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['quiz', 'coding'], default: 'coding' }, // "quiz" or "coding problem"
    progress: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Challenge', challengeSchema);
