const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multiavatar = require('@multiavatar/multiavatar');
const Player = require('../models/Player');
const GameQuiz = require('../models/GameQuiz');
const authMiddleware = require('../middleware/auth');
const { createQuiz } = require('../controllers/AdminController');
const { CreateQuizRoom } = require('../controllers/GameQuizeController');

const router = express.Router();

// Generate a unique avatar
const generateUniqueAvatar = async (roomCode) => {
    const MAX_ITERATIONS = 10; // Limit to prevent infinite loops
    let avatar;
    let existingPlayer;
    let attempts = 0;

    do {
        avatar = multiavatar(Math.random().toString(36).substring(7));
        existingPlayer = await Player.findOne({ roomCode, avatar });
        attempts++;
    } while (existingPlayer && attempts < MAX_ITERATIONS);

    if (attempts >= MAX_ITERATIONS) {
        throw new Error('Failed to generate a unique avatar');
    }

    return avatar;
};

// Join a room
router.post('/join', async (req, res) => {
    const { roomCode, playerName } = req.body;

    try {
        const room = await GameQuiz.findOne({ roomCode });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const avatar = await generateUniqueAvatar(roomCode);
        const playerId = uuidv4();

        const player = new Player({
            playerId,
            name: playerName,
            roomCode,
            avatar,
            score: 0,
        });

        await player.save();

        res.status(201).json({ message: 'Player joined', player });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
});

router.get('/challenges', authMiddleware, async (req, res) => {
    try {

      const userId = req.user.id;
  
    
      const quizzes = await GameQuiz.find({ createdBy: userId }).select('quizName roomCode');
  
      if (!quizzes || quizzes.length === 0) {
        return res.status(404).json({ message: 'No quizzes found for this user.' });
      }
  
      // Respond with the quizzes
      res.status(200).json(quizzes);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  });


// Fetch players in a room
router.get('/get-players/:roomCode', async (req, res) => {
    try {
        const players = await Player.find({ roomCode: req.params.roomCode });
        if (!players.length) {
            return res.status(404).json({ message: 'No players found in the room' });
        }
        res.json({ players });
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Fetch quiz for a room
router.get('/game-quiz/:roomCode', async (req, res) => {
    try {
        const quiz = await GameQuiz.findOne({ roomCode: req.params.roomCode });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        res.json(quiz);
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/create-quiz-game', authMiddleware, CreateQuizRoom); 

module.exports = router;
