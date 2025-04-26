// emailTemplates/passwordReset.js
const getPasswordResetTemplate = (resetURL, companyName = 'Code master') => {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Reset styles for email clients */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
        }

        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            text-align: center;
            padding: 32px 0;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            padding: 0 20px;
        }

        .content {
            padding: 40px;
            background-color: #ffffff;
        }

        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }

        .button-container {
            text-align: center;
            margin: 32px 0;
        }

        .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25);
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .button:hover {
            background: linear-gradient(135deg, #4338CA 0%, #6D28D9 100%);
            box-shadow: 0 6px 8px rgba(79, 70, 229, 0.35);
        }

        .warning {
            padding: 16px;
            margin: 24px 0;
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            border-radius: 6px;
            color: #92400E;
            font-size: 14px;
        }

        .link-box {
            margin: 24px 0;
            padding: 16px;
            background-color: #F3F4F6;
            border-radius: 6px;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
            color: #4F46E5;
        }

        .footer {
            text-align: center;
            padding: 24px 40px;
            background-color: #F9FAFB;
            border-top: 1px solid #E5E7EB;
            color: #6B7280;
            font-size: 13px;
        }

        .security-note {
            margin-top: 16px;
            padding: 16px;
            background-color: #EEF2FF;
            border-radius: 6px;
            font-size: 14px;
            color: #3730A3;
        }

        @media only screen and (max-width: 600px) {
            .container {
                margin: 20px;
                width: auto;
            }
            
            .content {
                padding: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p class="greeting">Hello,</p>
            <p>We received a request to reset the password for your account. To proceed with the password reset, please click the button below.</p>
            
            <div class="button-container">
                <a href="${resetURL}" class="button">Reset Your Password</a>
            </div>

            <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </div>

            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <div class="link-box">
                ${resetURL}
            </div>

            <div class="security-note">
                <strong>🔒 Security Note:</strong> This password reset link can only be used once. If you need to reset your password again, please request a new link.
            </div>
        </div>
        <div class="footer">
            <p>This is an automated message from  Code Master. Please do not reply to this email.</p>
            <p style="margin-top: 8px;">If you need assistance, please contact our support team.</p>
        </div>
    </div>
</body>
</html>`;
};

module.exports = { getPasswordResetTemplate };