const { User } = require('../models/User');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; 

const Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Determine subscription status
        const subscriptionStatus = user.subscription?.type === 'premium' ? 'Premium User' : 'Free User';
    
        // Generate JWT
        const token = jwt.sign(
            {
                id: user._id,
                type: user.type,
                email: user.email,
                role: user.role,
                subscription: user.subscription?.type,
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Respond with token and user details
        return res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                subscription: user.subscription?.type,
            },
        });
    } catch (error) {

        return res.status(500).json({ error: 'Internal server error' });
    }
};
const Logout = async (req, res) => {
    try{
        res.status(200).json({message: 'Logout successful'});
    }catch(error){
        next(error);
    }
}



module.exports = { Login,
    Logout
 };
