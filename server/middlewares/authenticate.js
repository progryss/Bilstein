require('dotenv').config();
const jwt = require("jsonwebtoken");
const tokenKey = process.env.SECRET_KEY;
const { User } = require('../models/user-models')

const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies.userCookie;
        if (!token) {
            return res.status(401).send("Token is missing. Please log in.");
        }
        const varification = jwt.verify(token, tokenKey);
        const rootUser = await User.findOne({ _id: varification._id });
        if (!rootUser) {
            return res.status(401).send("User not found. Please log in again.");
        }

        // Clean up expired tokens before proceeding
        await rootUser.cleanupExpiredTokens();

        req.token = token;
        req.validUser = rootUser;
        req.userId = rootUser._id;
        next();
    } catch (error) {
        return res.status(401).send("Token is not verified or has expired.");
    }
}

module.exports = authenticate;