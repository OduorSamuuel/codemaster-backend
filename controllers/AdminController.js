const { User } = require('../models/User');
const Course = require('../models/Course');
const PaymentDetails = require('../models/PaymentDetails');
const jwt = require('jsonwebtoken');
const UserAnalytics = require('../models/UserAnalytics');
const Quiz = require('../models/Quiz');


const getDashboardStats = async (req, res) => {
  try {
    // Verify the token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });

    // Total Users
    const totalUsers = await User.countDocuments();

    // Total Revenue
    const totalRevenue = await PaymentDetails.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);

    const revenue = totalRevenue.length ? totalRevenue[0].totalRevenue : 0;

    // Total Courses Created
    const totalCourses = await Course.countDocuments();

    // Premium Users and Sales Rate
    const premiumUsers = await User.aggregate([
      { $match: { 'subscription.type': 'premium' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$subscription.startedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Total premium users count
    const totalPremiumUsers = await User.countDocuments({ 'subscription.type': 'premium' });
console.log('Admin stats fetched successfully.',res.json);
    res.json({
      totalUsers,
      totalRevenue: `Ksh ${revenue}`,
      totalCourses,
      totalPremiumUsers,
      salesData: premiumUsers,
    });
    console.log('Admin stats fetched successfully.',res.json);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics.' });
  }
};
const getUserAnalytics = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || decoded.role !== 'admin') {
     
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
      }
  
      // Get query parameters for filtering and pagination
      const { page = 1, limit = 10, search = '' } = req.query;
      const skip = (page - 1) * limit;
  
      // Build search query
      const searchQuery = search 
        ? { $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]}
        : {};
  
      // Get users with their analytics data
      const users = await User.aggregate([
        { $match: searchQuery },
        // Lookup user analytics
        {
          $lookup: {
            from: 'useranalytics',
            localField: '_id',
            foreignField: 'userId',
            as: 'analytics'
          }
        },
        // Calculate user level based on XP
        {
          $addFields: {
            level: { 
              $floor: { 
                $sqrt: { 
                  $divide: [{ $ifNull: ['$xp', 0] }, 100] 
                } 
              } 
            }
          }
        },
        // Calculate completed lessons and progress
        {
          $addFields: {
            totalCompletedLessons: {
              $reduce: {
                input: '$progress',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    { $size: { $ifNull: ['$$this.completedLessons', []] } }
                  ]
                }
              }
            }
          }
        },
        // Calculate course-specific skills based on lesson completions
        {
          $addFields: {
            skills: {
              $reduce: {
                input: '$progress',
                initialValue: {
                  frontend: 0,
                  backend: 0,
                  algorithms: 0
                },
                in: {
                  frontend: {
                    $multiply: [
                      { 
                        $divide: [
                          { $size: { $ifNull: ['$$this.completedLessons', []] } },
                          { $max: [{ $size: { $ifNull: ['$$this.completedLessons', []] } }, 1] }
                        ]
                      },
                      0.1
                    ]
                  },
                  backend: {
                    $multiply: [
                      { 
                        $divide: [
                          { $size: { $ifNull: ['$$this.completedLessons', []] } },
                          { $max: [{ $size: { $ifNull: ['$$this.completedLessons', []] } }, 1] }
                        ]
                      },
                      0.1
                    ]
                  },
                  algorithms: {
                    $multiply: [
                      { 
                        $divide: [
                          { $size: { $ifNull: ['$$this.completedLessons', []] } },
                          { $max: [{ $size: { $ifNull: ['$$this.completedLessons', []] } }, 1] }
                        ]
                      },
                      0.1
                    ]
                  }
                }
              }
            }
          }
        },
        // Calculate current quest progress
        {
          $addFields: {
            currentQuest: {
              progress: {
                $multiply: [
                  {
                    $divide: [
                      { $size: { $ifNull: ['$progress.completedLessons', []] } },
                      { $max: [{ $size: { $ifNull: ['$progress.completedLessons', []] } }, 1] }
                    ]
                  },
                  100
                ]
              }
            }
          }
        },
        // Calculate achievements and other metrics
        {
          $addFields: {
            achievements: {
              $size: { $ifNull: ['$quizResults', []] }
            },
            streak: { 
              $size: { 
                $filter: {
                  input: { $ifNull: ['$progress', []] },
                  as: 'prog',
                  cond: { 
                    $gte: ['$$prog.lastAccessed', new Date(Date.now() - 24*60*60*1000)]
                  }
                }
              }
            },
            completedQuests: '$totalCompletedLessons'
          }
        },
        // Project only needed fields
        {
          $project: {
            _id: 1,
            name: '$username',
            email: 1,
            level: 1,
            skills: 1,
            currentQuest: 1,
            achievements: 1,
            streak: 1,
            completedQuests: 1,
            totalTimeSpent: {
              $reduce: {
                input: '$analytics',
                initialValue: 0,
                in: { $add: ['$$value', { $ifNull: ['$$this.totalTimeSpent', 0] }] }
              }
            }
          }
        },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]);
  
      // Get total counts for dashboard stats
      const stats = await Promise.all([
        User.countDocuments({ 
          'progress.lastAccessed': { 
            $gte: new Date(Date.now() - 24*60*60*1000) 
          }
        }),
        User.aggregate([
          {
            $group: {
              _id: null,
              totalCompleted: {
                $sum: {
                  $reduce: {
                    input: '$progress',
                    initialValue: 0,
                    in: {
                      $add: [
                        '$$value',
                        { $size: { $ifNull: ['$$this.completedLessons', []] } }
                      ]
                    }
                  }
                }
              }
            }
          }
        ]),
        UserAnalytics.aggregate([
          {
            $group: {
              _id: null,
              totalHours: { $sum: { $ifNull: ['$totalTimeSpent', 0] } }
            }
          }
        ])
      ]);
  
      const dashboardStats = {
        activeQuesters: stats[0],
        questsCompleted: stats[1][0]?.totalCompleted || 0,
        learningHours: Math.floor((stats[2][0]?.totalHours || 0) / 3600),
        avgCompletion: Math.round(
          (stats[1][0]?.totalCompleted || 0) / (await User.countDocuments() || 1) * 100
        )
      };
  
      // Get total count for pagination
      const totalUsers = await User.countDocuments(searchQuery);
  
      res.json({
        users,
        dashboardStats,
        pagination: {
          total: totalUsers,
          page: parseInt(page),
          pages: Math.ceil(totalUsers / limit)
        }
      });
  
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      res.status(500).json({ error: 'Failed to fetch user analytics.' });
    }
  };
  const getCourseData = async (req, res) => {
    try {
        // Get all courses with populated sections and lessons
        const courses = await Course.find().lean();

        // Get all analytics and users for efficient processing
        const analytics = await UserAnalytics.find().lean();
        const users = await User.find({ 
            'enrolledCourses.courseId': { $exists: true } 
        }).lean();

        // Process each course with its related data
        const processedCourses = await Promise.all(courses.map(async (course) => {
            // Get course-specific analytics
            const courseAnalytics = analytics.filter(
                a => a.courseId.toString() === course._id.toString()
            );

            // Get enrolled users for this course
            const enrolledUsers = users.filter(user => 
                user.enrolledCourses.some(
                    ec => ec.courseId.toString() === course._id.toString()
                )
            );

            // Calculate total lessons
            const totalLessons = course.sections.reduce(
                (total, section) => total + section.lessons.length, 
                0
            );

            // Calculate completion rate
            const completionRates = courseAnalytics
                .filter(a => a.completionStatus?.percentageCompleted != null)
                .map(a => a.completionStatus.percentageCompleted);
            
            const averageCompletionRate = completionRates.length > 0
                ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
                : 0;

            // Calculate average time spent
            const averageTimeSpent = courseAnalytics.length > 0
                ? Math.round(
                    courseAnalytics.reduce((acc, curr) => acc + (curr.totalTimeSpent || 0), 0) / 
                    courseAnalytics.length / 60000 // Convert to minutes
                )
                : 0;

            // Get lesson engagement metrics
            const lessonEngagement = {};
            courseAnalytics.forEach(analytic => {
                analytic.lessonAnalytics.forEach(lesson => {
                    if (!lessonEngagement[lesson.lessonId]) {
                        lessonEngagement[lesson.lessonId] = {
                            timeSpent: 0,
                            attempts: 0,
                            uniqueUsers: new Set()
                        };
                    }
                    lessonEngagement[lesson.lessonId].timeSpent += lesson.timeSpent;
                    lessonEngagement[lesson.lessonId].attempts += lesson.attempts;
                    lessonEngagement[lesson.lessonId].uniqueUsers.add(analytic.userId);
                });
            });

            return {
                _id: course._id,
                title: course.title,
                description: course.description,
                metrics: {
                    totalSections: course.sections.length,
                    totalLessons,
                    enrolledStudents: enrolledUsers.length,
                    averageCompletionRate,
                    averageTimeSpentMinutes: averageTimeSpent
                },
                engagement: {
                    totalAttempts: Object.values(lessonEngagement).reduce(
                        (sum, lesson) => sum + lesson.attempts, 
                        0
                    ),
                    mostEngagedLesson: Object.entries(lessonEngagement)
                        .sort((a, b) => b[1].attempts - a[1].attempts)[0]?.[0] || null,
                    totalActiveUsers: new Set(
                        courseAnalytics.map(a => a.userId.toString())
                    ).size
                },
                lastUpdated: course.updatedAt || course.createdAt,
                sections: course.sections.map(section => ({
                    _id: section._id,
                    title: section.title,
                    lessonCount: section.lessons.length,
                    lessons: section.lessons.map(lesson => ({
                        _id: lesson._id,
                        title: lesson.title,
                        engagement: lessonEngagement[lesson._id] ? {
                            timeSpent: Math.round(lessonEngagement[lesson._id].timeSpent / 60000),
                            attempts: lessonEngagement[lesson._id].attempts,
                            uniqueUsers: lessonEngagement[lesson._id].uniqueUsers.size
                        } : null
                    }))
                }))
            };
        }));

        return res.status(200).json({
            success: true,
            data: processedCourses
        });
    } catch (error) {
        console.error('Error in getCourseData:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching course data',
            error: error.message
        });
    }
};
const getQuizData = async (req, res) => {
    try {
        console.log("Fetching all quizzes...");
        const quizzes = await Quiz.find().lean();
        console.log(`Fetched ${quizzes.length} quizzes.`);

        console.log("Fetching user analytics...");
        const analytics = await UserAnalytics.find().lean();
        console.log(`Fetched ${analytics.length} analytics entries.`);

        console.log("Fetching users with quiz results...");
        // Modified to match exact structure of quiz results
        const users = await User.find({
            'quizResults': { 
                $exists: true,
                $ne: [] 
            }
        }).lean();
        console.log(`Fetched ${users.length} users with quiz results.`);

        console.log("Fetching courses...");
        const courses = await Course.find().lean();
        console.log(`Fetched ${courses.length} courses.`);

        console.log("Processing quizzes...");
        const processedQuizzes = await Promise.all(quizzes.map(async (quiz) => {
            // Debug logging
            console.log(`\nProcessing quiz: ${quiz._id}`);
            console.log(`Quiz lesson ID: ${quiz.lessonId}`);
            
            // Find course info
            let lessonInfo = null;
            let sectionInfo = null;
            let courseInfo = null;

            for (const course of courses) {
                if (!course.sections) continue;
                
                for (const section of course.sections) {
                    if (!section.lessons) continue;
                    
                    const lesson = section.lessons.find(l => 
                        l._id.toString() === quiz.lessonId.toString()
                    );
                    
                    if (lesson) {
                        lessonInfo = lesson;
                        sectionInfo = section;
                        courseInfo = course;
                        console.log(`Found matching course: ${course.title}`);
                        break;
                    }
                }
                if (lessonInfo) break;
            }

            // Process quiz results with exact structure matching
            const quizResults = users.reduce((results, user) => {
                const userResults = user.quizResults || [];
                const matchingResults = userResults.filter(result => {
                    const quizIdMatch = result.quizId?.toString() === quiz._id.toString();
                    if (quizIdMatch) {
                        console.log(`Found result for user ${user._id}, score: ${result.score}`);
                    }
                    return quizIdMatch;
                });
                return [...results, ...matchingResults];
            }, []);

            console.log(`Quiz ${quiz._id}: Found ${quizResults.length} quiz results`);

            // Process analytics based on lesson ID
            const quizAnalytics = analytics.filter(a => 
                a.lessonId?.toString() === quiz.lessonId?.toString()
            );

            // Calculate metrics with validation
            const validScores = quizResults
                .map(result => Number(result.score))
                .filter(score => !isNaN(score));
            
            const passThreshold = 70;
            const passCount = validScores.filter(score => score >= passThreshold).length;
            const averageScore = validScores.length > 0
                ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
                : 0;
            const passRate = quizResults.length > 0
                ? Math.round((passCount / quizResults.length) * 100)
                : 0;

            // Process question performance
            const questionPerformance = quiz.questions.map((question, index) => {
                const questionAttempts = quizResults.filter(
                    result => result.questionResponses && 
                    result.questionResponses[index] !== undefined
                );
                
                // Match correctChoice using $numberInt structure
                const correctChoiceIndex = typeof question.correctChoice === 'object' 
                    ? Number(question.correctChoice.$numberInt)
                    : Number(question.correctChoice);

                const correctAnswers = questionAttempts.filter(
                    result => Number(result.questionResponses[index]) === correctChoiceIndex
                );

                return {
                    questionId: question._id,
                    questionText: question.questionText,
                    totalAttempts: questionAttempts.length,
                    correctAnswers: correctAnswers.length,
                    successRate: questionAttempts.length > 0
                        ? Math.round((correctAnswers.length / questionAttempts.length) * 100)
                        : 0
                };
            });

            return {
                _id: quiz._id,
                courseInfo: courseInfo ? {
                    courseId: courseInfo._id,
                    courseTitle: courseInfo.title,
                    sectionTitle: sectionInfo.title,
                } : null,
                lessonInfo: {
                    lessonId: quiz.lessonId,
                    lessonTitle: lessonInfo?.title || 'Unknown Lesson'
                },
                metrics: {
                    totalQuestions: quiz.questions.length,
                    averageScore,
                    passRate,
                    totalAttempts: quizResults.length,
                    uniqueParticipants: new Set(quizResults.map(r => r.userId?.toString())).size
                },
                performance: {
                    questions: questionPerformance,
                    mostChallenging: questionPerformance
                        .sort((a, b) => a.successRate - b.successRate)[0] || null,
                    easiest: questionPerformance
                        .sort((a, b) => b.successRate - a.successRate)[0] || null
                },
                engagement: {
                    recentAttempts: quizResults.filter(result => 
                        new Date(result.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length,
                    completionRate: quizResults.length > 0
                        ? Math.round((quizResults.filter(result => result.completed).length / quizResults.length) * 100)
                        : 0
                }
            };
        }));

        const overallStats = {
            totalQuizzes: processedQuizzes.length,
            totalQuestions: processedQuizzes.reduce((sum, quiz) => 
                sum + quiz.metrics.totalQuestions, 0),
            totalAttempts: processedQuizzes.reduce((sum, quiz) => 
                sum + quiz.metrics.totalAttempts, 0),
            averagePassRate: processedQuizzes.length > 0
                ? Math.round(processedQuizzes.reduce((sum, quiz) => 
                    sum + quiz.metrics.passRate, 0) / processedQuizzes.length)
                : 0
        };

        console.log("Quizzes processed successfully.");
        return res.status(200).json({
            success: true,
            stats: overallStats,
            data: processedQuizzes
        });
    } catch (error) {
        console.error('Error in getQuizData:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching quiz data',
            error: error.message
        });
    }
};

const createQuiz = async (req, res) => {
    try {
        const { lessonId, questions } = req.body;

        // Validate questions structure
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Questions array is required and must not be empty'
            });
        }

        const newQuiz = await Quiz.create({
            lessonId,
            questions: questions.map(q => ({
                questionText: q.questionText,
                questionType: q.questionType,
                choices: q.choices,
                correctChoice: q.correctChoice
            }))
        });

        return res.status(201).json({
            success: true,
            data: newQuiz
        });
    } catch (error) {
        console.error('Error in createQuiz:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating quiz',
            error: error.message
        });
    }
};

const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedQuiz = await Quiz.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedQuiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: updatedQuiz
        });
    } catch (error) {
        console.error('Error in updateQuiz:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating quiz',
            error: error.message
        });
    }
};

const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedQuiz = await Quiz.findByIdAndDelete(id);

        if (!deletedQuiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Quiz deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteQuiz:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting quiz',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getUserAnalytics,
    getCourseData,
    getQuizData,
    createQuiz,
    updateQuiz,
    deleteQuiz
};
