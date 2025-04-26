const GameQuiz = require('../models/GameQuiz');

const CreateQuizRoom = async (req, res) => {
  console.log('Create Quiz Room');
  const { roomCode, quizName, questions } = req.body;
  
  try {
    // Basic validation
    if (!roomCode || !quizName || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ 
        message: 'Missing required fields or invalid format' 
      });
    }

    // Check for authenticated user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        message: 'User authentication required' 
      });
    }

console.log('User:', req.user);
    const newQuiz = new GameQuiz({
      roomCode,
      quizName,
      questions,
      createdBy: req.user.id  
    });

    // Validate the entire document before saving
    await newQuiz.validate();
    
    const savedQuiz = await newQuiz.save();
    console.log('New Quiz:', savedQuiz);
    
    res.status(201).json({ 
      message: 'Quiz created successfully', 
      quiz: savedQuiz 
    });

  } catch (err) {
    console.error('Error creating quiz:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.keys(err.errors).reduce((acc, key) => {
          acc[key] = err.errors[key].message;
          return acc;
        }, {})
      });
    }
    
    // Log detailed error for debugging
    console.error('Full error details:', {
      name: err.name,
      message: err.message,
      user: req.user,
      userId: req.user?._id
    });
    
    res.status(500).json({ 
      message: 'Failed to create quiz room',
      error: err.message 
    });
  }
};


const getUserChallenges = async (req, res) => {
    const userId = req.user.id;  
  
    try {
      const challenges = await GameQuiz.find(
        { createdBy: userId }, // Filter challenges by createdBy user ID
        { roomCode: 1, quizName: 1, _id: 0 } // Select only roomCode and quizName
      );
  
      if (challenges.length === 0) {
        return res.status(404).json({ message: 'No challenges found for this user.' });
      }
  
      res.json(challenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      res.status(500).json({ message: 'An error occurred while retrieving challenges.' });
    }
  };
  
module.exports = {
  CreateQuizRoom,
    getUserChallenges
};