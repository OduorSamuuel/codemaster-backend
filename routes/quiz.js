const express = require('express');
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const {User} = require('../models/User');

const authMiddleware = require('../middleware/auth');


const router = express.Router();



router.post('/create', authMiddleware, async (req, res) => {
  const { lessonId, questions } = req.body;

  if (!lessonId || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Invalid input. Please provide a valid lesson and questions.' });
  }

  try {
    const formattedQuestions = questions.map((question) => {
      if (question.questionType === 'multipleChoice') {
        console.log('Processing question:', question);
    
        if (!Array.isArray(question.choices) || question.choices.length === 0) {
          throw new Error('Multiple choice question must have choices.');
        }
    
        // Check for correct choice
        const correctChoice = question.choices.findIndex(choice => choice.isCorrect);
        console.log('Correct choice index:', correctChoice);
    
        if (correctChoice === -1) {
          throw new Error('At least one choice must be marked as correct.');
        }
    
        return {
          questionText: question.questionText,
          questionType: 'multipleChoice',
          choices: question.choices.map(choice => ({
            text: choice.text,
            isCorrect: choice.isCorrect,
          })),
          correctChoice: correctChoice.toString(), // Convert index to string
        };
      } else if (question.questionType === 'coding') {
        if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
          throw new Error('Coding questions must have a valid correct answer.');
        }
    
        return {
          questionText: question.questionText,
          questionType: 'coding',
          choices: [],
          correctAnswer: question.correctAnswer,
        };
      } else {
        throw new Error('Unsupported question type.');
      }
    });
    

    const quiz = new Quiz({
      lessonId,
      questions: formattedQuestions,
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




router.get('/:lessonId', authMiddleware, async (req, res) => {
  try {
      console.log('Received lessonId:', req.params.lessonId);


      const lessonObjectId = new mongoose.Types.ObjectId(req.params.lessonId);
      console.log(req.user.id);
      const userId = req.user.id;  

      // Attempt to find the quiz based on the lessonId
      const quiz = await Quiz.findOne({ lessonId: lessonObjectId });

      console.log('Quiz fetched from database:', quiz);

      if (!quiz) {
          return res.status(404).json({ error: 'No quiz found for this lesson' });
      }

      // Check if the user has already attempted the quiz
      const quizResult = await User.findOne(
          { _id: userId, 'quizResults.quizId': quiz._id }
      
      );
      console.log("results",quizResult)

      if (quizResult) {

          return res.status(400).json({ message: 'Quiz already attempted' });
      }

      // If no quiz result found, the user can take the quiz
      res.status(200).json(quiz);

  } catch (error) {
      console.error('Quiz fetch error:', error);
      res.status(500).json({ error: error.message });
  }
});

router.post('/:quizId/submit', authMiddleware, async (req, res) => {
  const { quizId } = req.params;
  const {  answers } = req.body;
  const userId = req.user.id;

  console.log('Received quizId:', quizId);
  console.log('Received userId:', userId);
  console.log('Received answers:', answers);

  try {
      // Find quiz and populate questions
      console.log('Fetching quiz from the database...');
      const quiz = await Quiz.findById(quizId).populate('questions');
      
      if (!quiz) {
          console.log('Quiz not found');
          return res.status(404).json({ error: 'Quiz not found' });
      }

      console.log('Quiz found:', quiz);
      
      let score = 0;
      const incorrectAnswers = [];
      
      // Process each question in the quiz
      console.log('Processing quiz questions...');
      quiz.questions.forEach((question, index) => {
          const answer = answers[index];
          console.log(`Processing question ${index + 1}:`, question._id);
          console.log('User answer:', answer);

          if (question.questionType === 'multipleChoice') {
              console.log('Multiple choice question');
              if (question.choices[question.correctChoice].text === answer) {
                  score += 1;
                  console.log('Correct answer');
              } else {
                  incorrectAnswers.push({
                      questionId: question._id,
                      userAnswer: answer,
                      correctAnswer: question.choices[question.correctChoice].text
                  });
                  console.log('Incorrect answer');
              }
          } else if (question.questionType === 'coding') {
              console.log('Coding question');
              const isCorrect = verifyCodeAnswer(answer, question);
              if (isCorrect) {
                  score += 1;
                  console.log('Correct code answer for question:', question._id);
              } else {
                  incorrectAnswers.push({
                      questionId: question._id,
                      userAnswer: answer.run.output, // Assuming answer is an object with `run.output`
                      correctAnswer: question.correctAnswer
                  });
                  console.log('Incorrect code answer');
              }
          } else {
              console.log('Unknown question type:', question.questionType);
          }
      });

      console.log('Final score:', score);
      console.log('Incorrect answers:', incorrectAnswers);

      // Calculate XP
      const xpEarned = score * 10;
      console.log('XP Earned:', xpEarned);

      // Update user with quiz results and XP
      console.log('Updating user with quiz results...');
      const user = await User.findById(userId);
if (!user) {
    console.log(`User with ID ${userId} not found`);
    return res.status(404).json({ error: 'User not found' });
}

      const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
              $push: {
                  quizResults: {
                      courseId: quiz.courseId,
                      quizId: quiz._id,
                      score: score,
                      xpEarned: xpEarned,
                      incorrectAnswers: incorrectAnswers
                  }
              },
              $inc: { xp: xpEarned }
          },
          { new: true }
      );
      
      console.log('User updated successfully:', updatedUser);

      console.log('Quiz submitted successfully:', { score, xpEarned });
      res.status(200).json({
          message: 'Quiz submitted successfully',
          score,
          xpEarned
      });

  } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({ error: error.message });
  }
});



// Function to verify code answers (example)
const verifyCodeAnswer = (answer, question) => {
  // Remove any whitespace and newlines from both outputs
  const userOutput = answer.run.output.replace(/\s+/g, '').toLowerCase();
  const expectedOutput = question.correctAnswer.replace(/\s+/g, '').toLowerCase();
  return userOutput === expectedOutput;
};

module.exports = router;
