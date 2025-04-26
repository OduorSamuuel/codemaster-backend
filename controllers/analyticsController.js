const UserAnalytics = require('../models/UserAnalytics');


exports.updateSessionData = async (req, res) => {
  try {
    const {
      courseId,
      sessionDuration,
      currentLesson,
      timePerLesson,
      lastActive
    } = req.body;

    let analytics = await UserAnalytics.findOne({
      userId: req.user.id,
      courseId
    });

    if (!analytics) {
      analytics = new UserAnalytics({
        userId: req.user.id,
        courseId,
        sessionData: [{
          startTime: new Date(Date.now() - sessionDuration),
          lastActive: new Date(lastActive)
        }]
      });
    } else {
      // Update current session
      const currentSession = analytics.sessionData[analytics.sessionData.length - 1];
      if (currentSession && !currentSession.endTime) {
        currentSession.lastActive = new Date(lastActive);
        currentSession.duration = sessionDuration;
      }
    }

    // Update lesson analytics
    Object.entries(timePerLesson).forEach(([lessonId, time]) => {
      const existingLesson = analytics.lessonAnalytics.find(
        la => la.lessonId.toString() === lessonId
      );

      if (existingLesson) {
        existingLesson.timeSpent += time;
        existingLesson.attempts += 1;
      } else {
        analytics.lessonAnalytics.push({
          lessonId,
          timeSpent: time,
          attempts: 1
        });
      }
    });

    analytics.totalTimeSpent += sessionDuration;
    analytics.lastAccessedAt = new Date();

    await analytics.save();

    res.status(200).json({ message: 'Analytics updated successfully' });
  } catch (error) {
    console.error('Error updating analytics:', error);
    res.status(500).json({ error: 'Failed to update analytics' });
  }
};


