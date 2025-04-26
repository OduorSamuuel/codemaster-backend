const sendEmail = require('../services/emailservice'); 

// Simple test method to send a test email
const sendTestEmail = async (req, res) => {
  const { recipientEmail } = req.body;

  try {
    // Send a test email to the recipient
    await sendEmail(
      recipientEmail, // The recipient's email address
      'Test Email',    // Subject of the email
      'This is a test email to verify the email sending functionality.', // Plain text body
      '<p>This is a <strong>test email</strong> to verify the email sending functionality.</p>' // HTML body
    );

    res.status(200).json({ message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Error sending test email', details: error.message });
  }
};

module.exports = { sendTestEmail };
