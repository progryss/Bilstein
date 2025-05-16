const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const URI = process.env.DB_URI;

const connectDb = async () => {
    try {
        await mongoose.connect(URI)
        console.log('Connected to MongoDB')
    } catch (error) {
        console.error('db connection failed',error)
        process.exit(0)
    }
};

module.exports = connectDb;
