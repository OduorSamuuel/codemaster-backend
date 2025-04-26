const express = require('express');
const { User } = require('../models/User');
const {Login, Logout}= require('../controllers/AuthenticatedSessionController');



const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Course = require('../models/Course');
const authMiddleware = require('../middleware/auth');
require('dotenv').config();
const mongoose = require('mongoose');
const { logRecentActivity } = require('../services/activityService');
const { Signup } = require('../controllers/SignupController');
const { getUserProgress, postStreak, getStreak, GetDetailedProgress, getLeaderboardData } = require('../controllers/UserProgressController');
const { getProfile } = require('../controllers/ProfileController');
const { ResetPassword } = require('../controllers/PasswordResetController');



const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;


// Register a new user
router.post('/register',Signup);

router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; 

 
        const user = await User.findById(userId).select('xp streak');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            xp: user.xp || 0,
            streak: user.streak?.days || 0, // Safely access nested properties
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
});

router.post('/reset-password/:token',ResetPassword );




router.get('/detailed-progress', authMiddleware, GetDetailedProgress);




// Helper function to generate achievements dynamically
async function generateAchievements(user, enrolledCourses) {
    const achievements = [];

    // Achievement for first course completion
    if (enrolledCourses.some(course => course.progressPercentage === 100)) {
        achievements.push({
            title: 'Course Completer',
            description: 'Completed your first course',
            dateEarned: new Date(),
            icon: 'faTrophy'
        });
    }

    // Achievement for reaching certain XP milestones
    const xpMilestones = [
        { threshold: 100, title: 'Beginner Learner', icon: 'faBook' },
        { threshold: 500, title: 'Intermediate Scholar', icon: 'faBookOpen' },
        { threshold: 1000, title: 'Advanced Learner', icon: 'faGraduationCap' }
    ];

    const xpAchievement = xpMilestones.find(milestone => 
        user.xp >= milestone.threshold
    );

    if (xpAchievement) {
        achievements.push({
            title: xpAchievement.title,
            description: `Reached ${xpAchievement.threshold} XP`,
            dateEarned: new Date(),
            icon: xpAchievement.icon
        });
    }

    return achievements;
}
// Enroll a user in a course
router.post('/enroll/:courseId', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id; // Now this will be available from the middleware
        const { courseId } = req.params;

        // Verify the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is already enrolled
        const isAlreadyEnrolled = user.enrolledCourses.some(
            enroll => enroll.courseId.toString() === courseId
        );

        if (isAlreadyEnrolled) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        // Enroll the user in the course
        user.enrolledCourses.push({ 
            courseId, 
            enrolledAt: new Date(),
            progress: { 
                isEnrolled: true,
                startedAt: new Date()
            } 
        });

        await user.save();

        res.status(201).json({ 
            message: 'Enrolled successfully', 
            enrolledCourses: user.enrolledCourses.map(course => course.courseId)
        });
    } catch (error) {
        console.error('Enrollment error:', error);
        next(error);
    }
});


router.post('/update-xp', authMiddleware, async (req, res) => {
    const { xpToAdd, courseId, quizId } = req.body;
    console.log('Update XP Request:', { 
        userId: req.user?.id, 
        xpToAdd, 
        courseId, 
        quizId 
    });

    try {
        if (!req.user || !req.user.id) {
            console.error('No authenticated user found');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userId = req.user.id;

        // Validate userId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error('Invalid user ID:', userId);
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Update XP for the authenticated user
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { xp: xpToAdd } }, // Increment the XP by xpToAdd
            { new: true } // Return the updated document
        );

        if (!user) {
            console.error('User not found for ID:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        // Log the updated user details
        console.log('Updated User XP:', user.xp);

        // Send success response
        res.status(200).json({ message: 'XP updated successfully', xp: user.xp });
    } catch (error) {
        console.error('XP Update Error:', error);
        res.status(500).json({ error: error.message });
    }
});


// Helper function to check consecutive day activity
function isConsecutiveDay(lastActivity) {
  const today = new Date();
  const last = new Date(lastActivity);
  const oneDayAgo = new Date(today);
  oneDayAgo.setDate(today.getDate() - 1);

  return (
    last.getFullYear() === oneDayAgo.getFullYear() &&
    last.getMonth() === oneDayAgo.getMonth() &&
    last.getDate() === oneDayAgo.getDate()
  );
}

router.post('/login',Login)



// Logout a user (not much to do in this route for now)
router.post('/logout',Logout);
router.post('/progress', authMiddleware, async (req, res, next) => {
    const userId = req.user.id; // Extract user ID from authMiddleware
    const { courseId, currentLesson, completedLessons } = req.body;
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
  
      // Convert IDs to ObjectId for consistency
      const currentLessonObjectId = new mongoose.Types.ObjectId(currentLesson);
      const completedLessonsObjectIds = completedLessons.map(id => new mongoose.Types.ObjectId(id));
  
      // Check if progress exists for the course
      const progress = user.progress.find(p => p.courseId.toString() === courseId);
  
      if (progress) {
        // Update existing progress
        progress.currentLesson = currentLessonObjectId;
        progress.completedLessons = Array.from(
          new Set([...progress.completedLessons.map(id => id.toString()), ...completedLessonsObjectIds])
        ); // Avoid duplicate lesson entries
        progress.lastAccessed = new Date();
      } else {
        // Create new progress for the course
        user.progress.push({
          courseId,
          currentLesson: currentLessonObjectId,
          completedLessons: completedLessonsObjectIds,
        });
      }
  
      // Save the updated user progress
      await user.save();
  
      res.status(200).json({ message: 'Progress updated successfully', progress: user.progress });
    } catch (error) {
      next(error); // Pass errors to global error handler
    }
  });
  
  router.get('/progress/:courseId', authMiddleware, async (req, res, next) => {
    const userId = req.user.id; // Extract user ID from authMiddleware
    const { courseId } = req.params; // Extract course ID from URL params
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
  
      // Find progress for the specified course
      const existingProgress = user.progress.find((p) => p.courseId.toString() === courseId);
  
      // If no progress exists, return a default progress object
      const progress = existingProgress || {
        courseId,
        currentLesson: null, // Default for current lesson
        completedLessons: [], // Default for completed lessons
        lastAccessed: null, // Optional: add default lastAccessed
      };
  
      res.status(200).json(progress);
    } catch (error) {
      next(error); // Pass errors to global error handler
    }
  });
  
// Save quiz results
router.post('/quiz-results', async (req, res, next) => {
    const { userId, courseId, quizId, score } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.quizResults.push({ courseId, quizId, score });
        await user.save();
        res.status(200).json({ message: 'Quiz result saved successfully', quizResults: user.quizResults });
    } catch (error) {
        next(error);
    }
});
// Get enrolled courses for a user
router.get('/enrolled-courses', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Find the user and populate the enrolled courses
        const user = await User.findById(userId)
            .populate({
                path: 'enrolledCourses.courseId',
                model: 'Course' // Assuming your Course model is named 'Course'
            });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Map the enrolled courses to include course details
        const enrolledCourses = user.enrolledCourses.map(enrollment => ({
            course: enrollment.courseId,
            enrolledAt: enrollment.enrolledAt,
            progress: enrollment.progress
        }));

        res.status(200).json(enrolledCourses);
    } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        next(error);
    }
});

// Get quiz results of a user for a specific course
router.get('/quiz-results/:userId/:courseId', async (req, res, next) => {
    const { userId, courseId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const quizResults = user.quizResults.filter((qr) => qr.courseId.toString() === courseId);
        res.status(200).json(quizResults);
    } catch (error) {
        next(error);
    }
});
router.get('/progress', authMiddleware,getUserProgress);


  
  // GET /api/users/progress
  router.get('/profile', authMiddleware,getProfile)

// Update streak (track consecutive days of activity)
router.post('/streak',authMiddleware,postStreak);

// Get streak of a user
router.get('/streak/:userId',getStreak);

router.get('/active-courses', authMiddleware, async (req, res) => {
    try {
      // Access the authenticated user's ID from the auth middleware
      const userId = req.user._id;
  
      // Fetch user data with enrolled courses and related course details
      const user = await User.findById(userId).populate({
        path: "enrolledCourses.courseId", // Populate course details
        populate: {
          path: "sections.lessons", // Populate lessons within sections
        },
      });
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const activeCourses = user.enrolledCourses.map((course) => {
        const completedLessons = course.progress?.completedLessons || [];
        const allLessons =
          course.courseId?.sections?.flatMap((section) => section.lessons) || [];
  
        const lastCompletedLesson =
          completedLessons[completedLessons.length - 1]; // Latest completed lesson
  
        const currentProgressIndex = allLessons.indexOf(lastCompletedLesson) + 1;
  
        const currentProgress =
          currentProgressIndex < allLessons.length
            ? allLessons[currentProgressIndex]
            : null; // Next lesson ID or null if all completed
  
        return {
          courseId: course.courseId?._id || null,
          courseTitle: course.courseId?.title || "Untitled",
          currentProgress,
          completedLessons,
        };
      });
  
      res.status(200).json({ activeCourses });
    } catch (error) {
      console.error("Error fetching active courses:", error);
      res
        .status(500)
        .json({ message: "Error fetching active courses", error: error.message });
    }
  });

router.post('/update-streak', authMiddleware,postStreak ) ;
router.get('/leaderboard',authMiddleware,getLeaderboardData);

  
  
  

module.exports = router;
