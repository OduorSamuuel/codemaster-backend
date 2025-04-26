const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String }, // HTML content for the lesson
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz', // Link to the quiz for this lesson
    required: false, // Make it optional for now
  },
});

// Section schema
const SectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  lessons: [LessonSchema], // Array of lessons in this section
});


const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String }, // HTML content for the course
  sections: [SectionSchema], // Array of sections within the course
  createdAt: { type: Date, default: Date.now },
});

// Export Course model
const Course = mongoose.model('Course', CourseSchema);
module.exports = Course;
