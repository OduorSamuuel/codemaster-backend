const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const QuestionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  options: { type: [OptionSchema], required: true },
  correctAnswerIndex: { type: Number, required: true },
});

const GameQuizSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  quizName: { type: String, required: true },
  questions: { type: [QuestionSchema], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model('GameQuiz', GameQuizSchema);
