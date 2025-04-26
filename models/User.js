const mongoose = require('mongoose');

// Streak Schema
const StreakSchema = new mongoose.Schema({
    days: { type: Number, default: 0 }, // Current streak count
    lastActivity: { type: Date, default: Date.now }, // Date of the last activity
    activeDates: [{ type: Date }] // Array of dates when the user was active
});


const SubscriptionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['free', 'premium'], 
        default: 'free' // Default is 'free'
    },
    startedAt: { type: Date, default: Date.now }, // Date the subscription started
    expiresAt: { type: Date }, // Expiry date for premium users
});

// Progress schema
const ProgressSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    currentLesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    startTime: { type: Date }, 
    completionTime: { type: Date }, 
    totalTimeSpent: { type: Number, default: 0 }, 
    clicks: { type: Number, default: 0 },
});

const QuizResultSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: function () {
            return this.quizResults && this.quizResults.length > 0;
        },
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: function () {
            return this.quizResults && this.quizResults.length > 0;
        },
    },
    score: { type: Number, required: false },
    xpEarned: { type: Number, default: 0 },
    attemptedAt: { type: Date, default: Date.now },
    incorrectAnswers: [
        {
            questionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Question',
                required: false,
            },
            userAnswer: { type: String, required: false },
            correctAnswer: { type: String, required: false },
            explanation: { type: String, required: false },
        },
    ],
    reattempts: { type: Number, default: 0 },
});



// Enrolled course schema
const EnrolledCourseSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    progress: {
        completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
        currentLesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    },
    isEnrolled: { type: Boolean, default: false },
});

// User schema with reset token fields added
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: { type: String }, // Token for password reset
    resetPasswordExpire: { type: Date }, // Expiration time for reset token
    enrolledCourses: [EnrolledCourseSchema], // Detailed structure for courses
    quizResults: [QuizResultSchema], // Embed quiz results directly into the user schema
    streak: StreakSchema, // Streak tracking
    xp: { type: Number, default: 0 }, // User's XP
    createdAt: { type: Date, default: Date.now },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    subscription: SubscriptionSchema, // Single active subscription
    progress: [ProgressSchema], // Progress for each course
});

const User = mongoose.model('User', UserSchema,);

module.exports = { User };
