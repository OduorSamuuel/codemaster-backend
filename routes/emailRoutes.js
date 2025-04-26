const express = require('express');
const { sendTestEmail } = require('../controllers/emailController'); // Import the controller
const { SendResetToken } = require('../controllers/PasswordResetController');
const router = express.Router();

// POST route to test sending an email
router.post('/send-test-email', sendTestEmail);
router.post('/forgot-password', SendResetToken);

module.exports = router;
