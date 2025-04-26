const mongoose = require('mongoose');
const { User } = require('../models/User');

// Utility to check if two dates are on the same day
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
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return diff <= oneDay && diff > 0;
};

const updateStreak = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Initialize streak if it doesn't exist
        if (!user.streak) {
            user.streak = {
                days: 0,
                lastActivity: null,
                activeDates: []
            };
        }

        const today = new Date();
        const lastActivity = user.streak.lastActivity
            ? new Date(user.streak.lastActivity)
            : null;

        // If this is the first activity
        if (!lastActivity) {
            user.streak.days = 1;
            user.streak.lastActivity = today;
            user.streak.activeDates = [today];
        }
        // If it's a different day than last activity
        else if (!isSameDay(lastActivity, today)) {
            // Check if the last activity was yesterday
            if (isConsecutiveDay(lastActivity, today)) {
                user.streak.days += 1;
            } else {
                user.streak.days = 1; // Reset streak for non-consecutive days
            }
            user.streak.lastActivity = today;
            user.streak.activeDates.push(today);
        }
        // If it's the same day, don't modify the streak

        // Save user with updated streak
        await user.save();

        return user.streak;
    } catch (err) {
        console.error('Error updating streak:', err.message);
        throw err;
    }
};

module.exports = { updateStreak };