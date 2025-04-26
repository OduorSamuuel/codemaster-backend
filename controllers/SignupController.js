
const {User} = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const Signup = async (req, res,next) => {
    const {username, email, password} = req.body;
    try{
        const existingUser =await User.findOne({email});
        if(existingUser){
            return res.status(400).json({error: 'User already exists'});
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            subscription:{}
        });
        await newUser.save();
       
        const token = jwt.sign(
            {
                id: newUser._id,
                type: newUser.type,
                email: newUser.email,
                role: newUser.role,
                subscription: newUser.subscription?.type,
            },
            process.env.JWT_SECRET,
            {expiresIn: '1h'}
        );

        res.status(201).json({message: 'User created successfully',
        token: token,
        user: {
            id: newUser._id,
            email: newUser.email,
            role: newUser.role,
            subscription: newUser.subscription?.type,}
        });
    
    }catch(error){
        next(error);
    }
}
module.exports = {Signup};