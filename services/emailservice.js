const nodemailer = require('nodemailer');
require('dotenv').config();  // Make sure .env is properly set up

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Using Gmail's SMTP service
  auth: {
    user: process.env.GMAIL_USER,  // Your Gmail address
    pass: process.env.GMAIL_PASS,  // Your Gmail password or app-specific password
  },
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"Code Master" <${process.env.GMAIL_USER}>`,  // Sender name and email
      to: to,                        // Recipient email
      subject: subject,              // Subject of the email
      text: text,                    // Plain text body
      html: html,                    // HTML body
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);  // Log the response
  } catch (error) {
    console.error('Error sending email:', error);  // Log any errors
  }
};

module.exports = sendEmail;
