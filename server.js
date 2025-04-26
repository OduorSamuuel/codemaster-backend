const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const connectDB = require('./connection');
const Player = require('./models/Player');
const playerRoutes = require('./routes/player');
const GameQuiz = require('./models/GameQuiz');
const mpesaRoutes = require('./routes/lipanampesa');
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.set('io', io);
const PORT = 5000;
const QUESTION_TIME = 30;
const ANSWER_DISPLAY_TIME = 10000; 

// Game state storage
const games = new Map();

// Debug function for game state
const logGameState = (roomCode, action) => {
  const gameState = games.get(roomCode);
  console.log('\n=== Game State Debug ===');
  console.log(`Action: ${action}`);
  console.log(`Room: ${roomCode}`);
  console.log('Current State:', gameState ? {
    active: gameState.active,
    currentQuestion: gameState.currentQuestion,
    totalQuestions: gameState.totalQuestions,
    startTime: gameState.startTime ? new Date(gameState.startTime).toISOString() : null,
    questionStartTime: gameState.questionStartTime ? new Date(gameState.questionStartTime).toISOString() : null,
    timeLeft: gameState.questionStartTime ? Math.max(0, QUESTION_TIME - Math.floor((Date.now() - gameState.questionStartTime) / 1000)) : null,
    elapsedTime: gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : null,
    connectedPlayers: gameState.connectedPlayers?.size || 0,
    questions: gameState.questions?.length || 0
  } : 'No game state');
  console.log('========================\n');
};

app.use(cors());
app.use(express.json());

// Database connection
connectDB()
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] New client connected:`, socket.id);

  // Join room handler
  socket.on('joinRoom', async (roomCode) => {
    console.log(`\n[${new Date().toISOString()}] Client ${socket.id} joining room: ${roomCode}`);
    socket.join(roomCode);

    try {
      // Get and emit player list
      const players = await Player.find({ roomCode }).sort({ score: -1 });
      socket.emit('playerList', players);
      socket.emit('players-sync', players);

      // Get game state and sync with new player
      const gameState = games.get(roomCode);
      console.log('Game State:', gameState);

      if (gameState && gameState.active) {
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - gameState.questionStartTime) / 1000);
        const timeLeft = Math.max(0, QUESTION_TIME - elapsedTime);

        // Initialize connectedPlayers if needed
        if (!gameState.connectedPlayers) {
          gameState.connectedPlayers = new Set();
        }

        // Track connected player
        gameState.connectedPlayers.add(socket.id);
        
        // Send synchronized state
        socket.emit('gameState', {
          status: 'playing',
          currentQuestion: gameState.currentQuestion,
          timeLeft,
          totalQuestions: gameState.totalQuestions,
          startTime: gameState.startTime,
          questionStartTime: gameState.questionStartTime,
          serverTime: currentTime
        });

        logGameState(roomCode, 'player-joined');
      }
    } catch (error) {
      console.error('[ERROR] Error in joinRoom:', error.message);
    }
  });
  socket.on('enterRoom', async (roomCode) => {
    socket.join(roomCode);
    console.log(`Player joined room: ${roomCode}`);
  
    try {
      // Fetch and send current player list to the joining client
      const players = await Player.find({ roomCode });
      socket.emit('players-sync', players);
      console.log('Player list sent to client:', players);
    } catch (error) {
      console.error('Error fetching players for room:', error);
    }
  }); 
  

  socket.on('remove-player', async ({ roomCode, playerId }) => {
    try {
      await Player.findOneAndDelete({ roomCode, playerId });
      // Broadcast removal to all clients in the room
      io.to(roomCode).emit('player-removed', playerId);
      
      // Send updated player list to ensure sync
      const updatedPlayers = await Player.find({ roomCode });
      io.to(roomCode).emit('players-sync', updatedPlayers);
    } catch (error) {
      console.error('Error removing player:', error);
    }
  });

  // Time sync handler
  socket.on('timeSync', ({ roomCode, clientTime }) => {
    const gameState = games.get(roomCode);
    if (gameState && gameState.active) {
      const currentTime = Date.now();
      const elapsedTime = Math.floor((currentTime - gameState.questionStartTime) / 1000);
      const timeLeft = Math.max(0, QUESTION_TIME - elapsedTime);
      
      socket.emit('timeSyncResponse', {
        clientTime,
        serverTime: currentTime,
        timeLeft,
        currentQuestion: gameState.currentQuestion,
        questionStartTime: gameState.questionStartTime,
        startTime: gameState.startTime
      });

      logGameState(roomCode, 'time-sync');
    }
  });

  // Score update handler
  socket.on('player-score-update', async ({ playerId, newScore, roomCode }) => {
    try {
      const player = await Player.findOneAndUpdate(
        { playerId },
        { $set: { score: newScore } },
        { new: true }
      );
  
      if (player) {
        io.to(roomCode).emit('player-score-update', { playerId, newScore });
        const updatedPlayers = await Player.find({ roomCode }).sort({ score: -1 });
        io.to(roomCode).emit('players-sync', updatedPlayers);
        logGameState(roomCode, 'score-update');
      }
    } catch (error) {
      console.error('[ERROR] Error updating score:', error.message);
    }
  });

  // Time up handler
  socket.on('timeUp', ({ roomCode }) => {
    console.log(`\n[${new Date().toISOString()}] Time up signal received for room:`, roomCode);
    const gameState = games.get(roomCode);
    
    if (gameState && gameState.active) {
      logGameState(roomCode, 'timeUp');
      io.to(roomCode).emit('showAnswer');
      
      // Schedule next question or game end
      setTimeout(() => {
        if (gameState.currentQuestion >= gameState.totalQuestions - 1) {
          gameState.active = false;
          io.to(roomCode).emit('gameOver');
          games.delete(roomCode);
          logGameState(roomCode, 'game-over');
        } else {
          gameState.currentQuestion++;
          gameState.questionStartTime = Date.now();
          
          io.to(roomCode).emit('questionUpdate', {
            questionIndex: gameState.currentQuestion,
            startTime: gameState.startTime,
            questionStartTime: gameState.questionStartTime,
            serverTime: Date.now()
          });
          
          logGameState(roomCode, 'next-question');
        }
      }, ANSWER_DISPLAY_TIME);
    }
  });

  // Score update broadcast
  socket.on('updateScore', ({ roomCode, playerId, score }) => {
    io.to(roomCode).emit('scoreUpdate', { playerId, score });
    logGameState(roomCode, 'score-broadcast');
  });

  // Game start notification
  socket.on('game-starting', (roomCode) => {
    io.to(roomCode).emit('game-starting', roomCode);
    logGameState(roomCode, 'game-starting');
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`\n[${new Date().toISOString()}] Client disconnected:`, socket.id);
    // Remove player from all game states
    for (const [roomCode, gameState] of games.entries()) {
      if (gameState.connectedPlayers?.has(socket.id)) {
        gameState.connectedPlayers.delete(socket.id);
        logGameState(roomCode, 'player-disconnected');
      }
    }
  });
});

// Game start endpoint
app.post('/api/game/start', async (req, res) => {
  try {
    const { roomCode } = req.body;
    if (!roomCode) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    console.log('Starting game for room:', roomCode);

    // Fetch quiz
    const gameQuiz = await GameQuiz.findOne({ roomCode });
    if (!gameQuiz) {
      return res.status(404).json({ error: 'No quiz found for this room' });
    }

    // Initialize game state
    const gameState = {
      roomCode,
      quizName: gameQuiz.quizName,
      questions: gameQuiz.questions,
      totalQuestions: gameQuiz.questions.length,
      currentQuestion: 0,
      active: true,
      startTime: Date.now(),
      questionStartTime: Date.now(),
      connectedPlayers: new Set(),
      scores: new Map()
    };

    // Store in games Map
    games.set(roomCode, gameState);
    
    // Notify all clients
    io.to(roomCode).emit('gameState', {
      status: 'playing',
      currentQuestion: 0,
      totalQuestions: gameState.totalQuestions,
      startTime: gameState.startTime,
      questionStartTime: gameState.questionStartTime,
      serverTime: Date.now()
    });

    logGameState(roomCode, 'game-start');
    
    res.status(200).json({ 
      message: 'Game started successfully',
      gameState: {
        ...gameState,
        connectedPlayers: Array.from(gameState.connectedPlayers),
        scores: Object.fromEntries(gameState.scores)
      }
    });

  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/game', require('./routes/quizegameRoutes'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/player', playerRoutes);
app.use('/api/mpesa', mpesaRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('\n[ERROR]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Start server
server.listen(PORT, () => {
  console.log(`\n[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);
});

module.exports = server;