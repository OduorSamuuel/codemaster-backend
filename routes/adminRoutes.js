const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');
const { getDashboardStats ,getUserAnalytics,getCourseData,
    getQuizData,
    createQuiz,
    updateQuiz,
    deleteQuiz,

} = require('../controllers/AdminController');

router.get('/stats', AuthMiddleware, getDashboardStats);
router.get('/users/analytics', AuthMiddleware, getUserAnalytics);
router.get('/courses/data', AuthMiddleware, getCourseData);
router.get('/quiz/data', AuthMiddleware, getQuizData);
router.post('/create', AuthMiddleware, createQuiz);
router.put('/update/:id', AuthMiddleware, updateQuiz);
router.delete('/delete/:id', AuthMiddleware, deleteQuiz);
module.exports = router;
