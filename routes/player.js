// routes/quizegameRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const multiavatar = require('@multiavatar/multiavatar');
const { v4: uuidv4 } = require('uuid');
const Player = require('../models/Player');
const GameQuiz = require('../models/GameQuiz');

const router = express.Router();

// Function to generate unique avatar
const generateUniqueAvatar = async (roomCode) => {
  let avatar;
  let existingPlayer;
  
  do {
    avatar = multiavatar(Math.random().toString(36).substring(7));
    existingPlayer = await Player.findOne({ roomCode, avatar });
  } while (existingPlayer);
  
  return avatar;
};

router.post('/join', async (req, res) => {
  const { roomCode, playerName } = req.body;
  const io = req.app.get('io');

  try {
    const room = await GameQuiz.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if there's already an avatar in the room
    let avatar;
    const existingPlayer = await Player.findOne({ roomCode, name: playerName });
    
    if (existingPlayer) {
      avatar = existingPlayer.avatar; // Use existing avatar if it exists
    } else {
      avatar = await generateUniqueAvatar(roomCode); // Generate a new one if the player doesn't have one
    }

    const playerId = uuidv4();

    const player = new Player({
      playerId,
      name: playerName,
      roomCode,
      avatar,
      score: 0,
    });

    await player.save();

    // Broadcast the player list to all clients
    const players = await Player.find({ roomCode });
    io.to(roomCode).emit('players-sync', players);

    res.status(201).json({ message: 'Player joined', player });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Get players in room
router.get('/get-players/:roomCode', async (req, res) => {
  const { roomCode } = req.params;

  try {
    const players = await Player.find({ roomCode });
    if (!players || players.length === 0) {
      return res.json({ players: [] });
    }
    res.json({ players });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz for room
router.get('/game-quiz/:roomCode', async (req, res) => {
  try {
    const quiz = await GameQuiz.findOne({ roomCode: req.params.roomCode });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/update-score', async (req, res) => {
 
  try {
    const { score, playerId, roomCode } = req.body;

    const player = await Player.findOneAndUpdate(
      { playerId },
      { $set: { score } },
      { new: true }
    );

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
console.log('Emitting score updatecfureu:', { playerId, score, roomCode }); 
    const io = req.app.get('io');
    if (io && roomCode) {
    console.log('Emitting score update:', { playerId, score, roomCode });
      // First emit the individual score update
      io.to(roomCode).emit('player-score-update', { 

        playerId, 
        newScore: score 
      });
      console.log('Emitting score update ahahah:', { playerId, score, roomCode }); 

      // Then emit the full sorted player list
      const updatedPlayers = await Player.find({ roomCode }).sort({ score: -1 });
      io.to(roomCode).emit('players-sync', updatedPlayers);

      console.log('Score update emitted:', {
        playerId,
        score,
        roomCode,
        playerCount: updatedPlayers.length
      });
      
    }

    res.json({ 
      success: true, 
      score: player.score,
      player
    });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ message: 'Server error updating score' });
  }
});


module.exports = router;