const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String, required: true },
  roomCode: { 
    type: mongoose.Schema.Types.String, 
    ref: 'GameQuiz', 
    required: true 
  },
  joinedAt: { type: Date, default: Date.now },
  score: { type: Number, default: 0 }, // Score to track correctness
  isReady: { type: Boolean, default: false },
  answers: [{ questionId: mongoose.Schema.Types.ObjectId, answerIndex: Number, isCorrect: Boolean }],
});

module.exports = mongoose.model('Player', PlayerSchema);
