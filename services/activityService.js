/*
const User = require('../models/User');

/**
 * Log a recent activity for a user.
 * @param {String} userId - ID of the user performing the action.
 * @param {String} type - Type of activity (e.g., 'courseEnrolled', 'xpUpdated').
 * @param {String} description - Description of the activity.
 * @param {String} [courseId] - Optional ID of the course involved in the activity.
 * @param {String} [lessonId] - Optional ID of the lesson involved in the activity.
 * @param {Number} [xpEarned] - Optional XP earned associated with the activity.
 */
/*
async function logRecentActivity(userId, type, description, courseId = null, lessonId = null, xpEarned = 0) {
    try {
        // Create the activity log
        const activity = new RecentActivity({
            userId,
            type,
            description,
            courseId,
            lessonId,
            xpEarned,
        });

        // Save the activity log
        await activity.save();

        // Find the user and add this activity to their recent activities
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
            return;
        }

        user.recentActivities.push(activity._id);
        await user.save();

        console.log('Recent activity logged successfully');
    } catch (error) {
        console.error('Error logging activity:', error.message);
    }
}
/*

module.exports = {
    logRecentActivity,
};

*/