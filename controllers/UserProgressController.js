
const { User } = require('../models/User');
const { updateStreak } = require('../utils/streakUtils');




const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Course = require('../models/Course');

require('dotenv').config();






const getUserProgress = async (req, res) => {
    try {
        console.log('User Progress');
        
        // Fetch the user by ID
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        
        // Process the progress array
        const populatedProgress = await Promise.all(user.progress.map(async (progress) => {
            try {
                // Fetch the course with sections and lessons
                const course = await Course.findById(progress.courseId)
                    .populate({
                        path: 'sections',
                        populate: { path: 'lessons' }
                    });

                if (!course) {
                    console.log('Course not found for ID:', progress.courseId);
                    return null;
                }

                console.log('Course found:', course.title);

                // Calculate total lessons and completed lessons
                const totalLessons = course.sections.reduce(
                    (count, section) => count + section.lessons.length,
                    0
                );

                const completedLessons = progress.completedLessons.length;

                // Progress percentage
                const progressPercentage = ((completedLessons / totalLessons) * 100).toFixed(2);

                // Determine the next lesson
                const completedLessonsSet = new Set(progress.completedLessons.map(id => id.toString()));
                let nextLesson = null;

                for (const section of course.sections) {
                    for (const lesson of section.lessons) {
                        if (!completedLessonsSet.has(lesson._id.toString())) {
                            nextLesson = lesson;
                            break;
                        }
                    }
                    if (nextLesson) break;
                }

                // Return the structured data for the course
                return {
                    courseId: course._id,
                    courseTitle: course.title,
                    totalLessons,
                    completedLessons,
                    progressPercentage,
                    nextLesson: nextLesson
                        ? {
                              _id: nextLesson._id,
                              title: nextLesson.title
                          }
                        : null // If no next lesson, course is completed
                };
            } catch (err) {
                console.error('Error processing progress for courseId:', progress.courseId, err);
                return null; // Return null to continue processing other courses
            }
        }));

        // Filter out any null values that result from failed progress processing
        const filteredProgress = populatedProgress.filter(p => p !== null);

        // Respond with the user progress
        res.status(200).json(filteredProgress);
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ error: error.message });
    }
};

const postStreak=async(req,res,next)=> { 
    const  userId  = req.user.id;

try {
    const streak = await updateStreak(userId);
    res.status(200).json({ success: true, streak });
} catch (err) {
    res.status(500).json({ success: false, error: err.message });
}
}

const getStreak=async(req,res,next)=>{
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json(user.streak);
    } catch (error) {
        next(error);
    }
}
const GetDetailedProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const streakInfo = {
            currentStreak: user.streak?.days || 0,
            lastActivity: user.streak?.lastActivity,
            activeDates: user.streak?.activeDates || [],
            // Calculate longest streak from activeDates
            longestStreak: calculateLongestStreak(user.streak?.activeDates || [])
        };

        // Fetch all enrolled courses with progress
        console.log('User hahah:', user);
        const enrolledCourses = await Promise.all(user.progress.map(async (progress) => {
            const course = await Course.findById(progress.courseId).populate({
                path: 'sections',
                populate: { path: 'lessons' }
            });

            if (!course) return null;

            // Calculate total and completed lessons
            const totalLessons = course.sections.reduce(
                (count, section) => count + section.lessons.length, 
                0
            );
            const completedLessons = progress.completedLessons.length;
            const progressPercentage = ((completedLessons / totalLessons) * 100).toFixed(2);

            return {
                _id: course._id,
                title: course.title,
                progressPercentage: parseFloat(progressPercentage),
                completedLessons,
                totalLessons
            };
        })).then(courses => courses.filter(Boolean));

        // Calculate overall progress
        const overallProgress = enrolledCourses.length > 0
            ? (enrolledCourses.reduce((sum, course) => sum + course.progressPercentage, 0) / enrolledCourses.length).toFixed(2)
            : 0;

        // Dynamically calculate skill progress based on completed courses
        const skillProgress = await calculateSkillProgress(user, enrolledCourses);

        // Dynamically generate achievements
        const achievements = await generateAchievements(user, enrolledCourses);

        // Prepare final response
        const response = {
            courses: enrolledCourses,
            overallProgress: parseFloat(overallProgress),
            totalCoursesCompleted: enrolledCourses.filter(course => course.progressPercentage === 100).length,
            totalXP: user.xp || 0,
            skillProgress,
            achievements,
            streak: streakInfo
        };


        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching detailed progress:', error);
        res.status(500).json({ error: error.message });
    }


}
const calculateLongestStreak = (activeDates) => {
    if (!activeDates.length) return 0;
    
    const sortedDates = activeDates
        .map(date => new Date(date))
        .sort((a, b) => a - b);
    
    let currentStreak = 1;
    let maxStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
        const diff = Math.abs(sortedDates[i] - sortedDates[i-1]);
        if (diff <= 24 * 60 * 60 * 1000) { // Within 24 hours
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }
    
    return maxStreak;
};

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
async function calculateSkillProgress(user, enrolledCourses) {
    // This could be expanded to use more sophisticated tracking
    const skillMap = {
        'Python': ['Learn Python'],
        'JavaScript': ['JavaScript Fundamentals'],
        'React': ['React Basics']
    };

    const skillProgress = Object.entries(skillMap).map(([skill, courseTitles]) => {
        const relevantCourses = enrolledCourses.filter(course => 
            courseTitles.includes(course.title)
        );

        const averageProgress = relevantCourses.length > 0
            ? relevantCourses.reduce((sum, course) => sum + course.progressPercentage, 0) / relevantCourses.length
            : 0;

        return {
            name: skill,
            percentage: Math.round(averageProgress)
        };
    });

    return skillProgress;
}
const isSameDay = (date1, date2) => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

// Utility to check if two dates are consecutive
const isConsecutiveDay = (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000; // Milliseconds in a day
    return date1.getTime() + oneDay === date2.getTime();
};










const getLeaderboardData = async (req, res) => {
    try {
      const userId = req.user._id; 
      
      
      // Get all users sorted by XP (descending) and limit to top 10
      const leaderboardData = await User.aggregate([
      
        // Match only users with XP or streaks
        {
          $match: {
            $or: [
              { xp: { $exists: true, $gt: 0 } },
              { 'streak.days': { $exists: true, $gt: 0 } }
            ]
          }
        },
        // Project only the fields we need
        {
          $project: {
            username: 1,
            xp: 1,
            'streak.days': 1,
            'streak.lastActivity': 1
          }
        },
        
        {
          $sort: {
            xp: -1,
            'streak.days': -1
          }
        },
        {
          $limit: 10
        }
      ]);
  console.log('Leaderboard Data:', leaderboardData);
      // Find current user's rank
      const userRankData = await User.aggregate([
        {
          $match: {
            $or: [
              { xp: { $exists: true, $gt: 0 } },
              { 'streak.days': { $exists: true, $gt: 0 } }
            ]
          }
        },
        {
          $project: {
            username: 1,
            xp: 1,
            'streak.days': 1
          }
        },
        {
          $sort: {
            xp: -1,
            'streak.days': -1
          }
        },
        {
          $group: {
            _id: null,
            users: {
              $push: {
                _id: '$_id',
                username: '$username',
                xp: '$xp',
                streakDays: '$streak.days'
              }
            }
          }
        },
        {
          $unwind: {
            path: '$users',
            includeArrayIndex: 'rank'
          }
        },
        {
          $match: {
            'users._id': userId
          }
        }
      ]);
  
      // Format the response
      const rankings = leaderboardData.map(user => ({
        user: {
          _id: user._id,
          username: user.username,
          streak: {
            days: user.streak?.days || 0,
            lastActivity: user.streak?.lastActivity
          }
        },
        xp: user.xp || 0
      }));
  
      // Get user's rank (if found)
      const userRank = userRankData.length > 0 ? {
        userId: userId,
        rank: userRankData[0].rank + 1,
        xp: userRankData[0].users.xp,
        streakDays: userRankData[0].users.streakDays
      } : null;
  
      return res.status(200).json({
        success: true,
        rankings,
        userRank
      });
  
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard data',
        error: error.message
      });
    }
  };


module.exports = { getUserProgress,postStreak ,getStreak,GetDetailedProgress,getLeaderboardData};
