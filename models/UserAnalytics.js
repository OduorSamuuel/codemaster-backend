const mongoose = require('mongoose');

const SessionDataSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  lastActive: { type: Date, required: true },
  duration: { type: Number }
});

const LessonAnalyticsSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  timeSpent: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 }
});

const CompletionStatusSchema = new mongoose.Schema({
  isCompleted: { type: Boolean, default: false },
  percentageCompleted: { type: Number, default: 0 },
  completedAt: { type: Date }
});

const UserAnalyticsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true 
  },
  sessionData: [SessionDataSchema],
  lessonAnalytics: [LessonAnalyticsSchema],
  totalTimeSpent: { type: Number, default: 0 },
  completionStatus: CompletionStatusSchema,
  lastAccessedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create compound index for efficient queries
UserAnalyticsSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const UserAnalytics = mongoose.model('UserAnalytics', UserAnalyticsSchema);

module.exports = UserAnalytics;