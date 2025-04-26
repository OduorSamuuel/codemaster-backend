const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tutorial: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutorial', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Progress', progressSchema);
