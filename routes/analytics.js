const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

const authMiddleware = require('../middleware/auth');

router.post('/session-update', authMiddleware, analyticsController.updateSessionData);


// Get analytics for a specific course
router.get('/course/:courseId', authMiddleware, async (req, res) => {
  try {
    const analytics = await UserAnalytics.findOne({
      userId: req.user._id,
      courseId: req.params.courseId
    }).populate('lessonAnalytics.lessonId');
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get overall course statistics
router.get('/course-stats/:courseId', authMiddleware, async (req, res) => {
  try {
    const stats = await CourseStats.findOne({ courseId: req.params.courseId });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course statistics' });
  }
});

module.exports = router;