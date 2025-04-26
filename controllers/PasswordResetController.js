const sendEmail = require('../services/emailservice');  
const { User } = require('../models/User'); 
const crypto = require('crypto');
const bcrypt = require('bcryptjs'); 

const { getPasswordResetTemplate } = require('../emails/passwordReset');

const SendResetToken = async (req, res) => {
    console.log('SendResetToken called');
    const { email } = req.body;

    try {
        // Validate email
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'Invalid email address' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No user found with that email address' });
        }

        // Generate a password reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpire = Date.now() + 3600000; // Token valid for 1 hour

        // Save token and expiration time in the database
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = resetTokenExpire;
        await user.save();

        // Frontend reset URL
        const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        // Get the HTML template with the reset URL
        const htmlContent = getPasswordResetTemplate(resetURL, process.env.COMPANY_NAME);

        await sendEmail(user.email, 'Password Reset Request', '', htmlContent);

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (err) {
        console.error('Error in SendResetToken:', err);
        res.status(500).json({ message: 'Error sending reset email', error: err.message });
    }
};


// Reset Password
const ResetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Error in ResetPassword:', err);
        res.status(500).json({ message: 'Error resetting password' });
    }
};

module.exports = { SendResetToken, ResetPassword };
