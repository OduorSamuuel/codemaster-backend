const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const { User } = require('../models/User');
const authMiddleware = require('../middleware/auth'); // Import the auth middleware
const { updateStreak } = require('../utils/streakUtils');


const multer = require('multer');
const path = require('path');
const fs = require('fs');



// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../client/public/uploads');
    
    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// Image upload route
router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Generate the relative path for storing in the database
    const imagePath = `/uploads/${req.file.filename}`;

    res.status(200).json({ 
      message: 'Image uploaded successfully', 
      imagePath: imagePath 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Image upload failed', error: error.message });
  }
});

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { title, description, sections } = req.body;
    
    // Validate input
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." });
    }
    
    // Create and save the course
    const newCourse = new Course({ 
      title, 
      description, 
      sections: sections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson => ({
          ...lesson,
          // Ensure image paths are correctly stored
          description: processImagePaths(lesson.description)
        }))
      }))
    });

    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    next(error);
  }
});

// Helper function to process and validate image paths
function processImagePaths(content) {
 // Implement logic to validate and potentially sanitize image paths
 // This could involve checking if paths are within your uploads directory
 return content;
}
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({ _id: userId });
   
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('user:', user);
    console.log('user enrolled course:', user.enrolledCourses);

    const enrolledCourseIds = user.enrolledCourses.map(ec => ec.courseId.toString());

    const courses = await Course.aggregate([
      {
        $addFields: {
          isEnrolled: {
            $in: [{ $toString: '$_id' }, enrolledCourseIds]
          }
        }
      },
      {
        $project: {
          title: 1,
          description: 1,
          sections: 1,
          isEnrolled: 1
        }
      }
    ]);

    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
   
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});


// Get a specific course by ID (protected route)
router.get("/:courseId", authMiddleware, async (req, res, next) => {

  console.log('req.params.courseId:', req.params.courseId);
  try {
    const course = await Course.findById(req.params.courseId);
    const userId = req.user.id;
    console.log('userId:', userId);
    const user = await User.findById(userId);
    

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Update streak when user accesses the course
    const streak = await updateStreak(userId);

    console.log('This is the subscription:', user.subscription.type);
    console.log('Updated streak:', streak);

    res.status(200).json({
      course,
      subscription: user.subscription.type,
      streak,
    });
  } catch (error) {
    next(error);
  }
});

// Update a course by ID (protected route)
router.put("/:id", authMiddleware, async (req, res, next) => {
   try {
     const { title, description, sections } = req.body;
     const updatedCourse = await Course.findByIdAndUpdate(
       req.params.id,
       { title, description, sections },
       { new: true, runValidators: true }
     );
     
     if (!updatedCourse) {
       return res.status(404).json({ message: "Course not found." });
     }
     res.status(200).json(updatedCourse);
   } catch (error) {
     next(error);
   }
});

// Delete a course by ID (protected route)
router.delete("/:id", authMiddleware, async (req, res, next) => {
   try {
     const deletedCourse = await Course.findByIdAndDelete(req.params.id);
     if (!deletedCourse) {
       return res.status(404).json({ message: "Course not found." });
     }
     res.status(200).json({ message: "Course deleted successfully." });
   } catch (error) {
     next(error);
   }
});
router.get("/:courseId/sections", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate({
      path: "sections.lessons.quiz", // Populate quiz data for each lesson
      select: "title description", // Select relevant quiz fields
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const sections = course.sections; // Extract sections from the course
    res.status(200).json(sections); // Return only sections (without the full course details)
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ message: 'Error fetching sections', error: error.message });
  }
});

router.get("/:courseId/sections/:sectionId/lessons", authMiddleware, async (req, res) => {


  try {
    const { courseId, sectionId } = req.params;

    // Find the course by ID
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Find the section by ID within the course
    const section = course.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }

    // Return the lessons of the found section
    res.status(200).json(section.lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ message: 'Error fetching lessons', error: error.message });
  }
});



module.exports = router;