const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Lesson' },
    questions: [
      {
        questionText: { type: String, required: true },
        questionType: {
          type: String,
          enum: ['multipleChoice', 'coding'],
          required: true,
        },
        choices: [
          {
            text: { type: String, required: true },
            isCorrect: { type: Boolean, default: false },
          },
        ],
        correctChoice: {
          type: Number,
          required: function () {
            return this.questionType === 'multipleChoice';
          },
          validate: {
            validator: function (value) {
              if (this.questionType === 'multipleChoice') {
                return value >= 0 && value < this.choices.length;
              }
              return true;
            },
            message: 'Correct answer must be a valid choice index for multipleChoice questions.',
          },
        },
        correctAnswer: {
          type: String,
          required: function () {
            return this.questionType === 'coding';
          },
        },
      },
    ],
  },
  { timestamps: true }
);

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
