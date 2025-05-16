const express = require('express');
const connectDb = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const router = require('./router/auth-routes');
const cookieParser = require('cookie-parser');
const { connectRedis } = require('./redisClient');

require('dotenv').config();

const app = express();

// Basic middlewares
app.use(express.json());
app.use(cookieParser());

// Proper Helmet setup with selective CSP for development and better control
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
        defaultSrc: ["'self'"], // Default policy for loading content
        imgSrc: ["'self'"],
        scriptSrc: ["'self'"], // Scripts allowed from the same origin
        styleSrc: ["'self'"], // Styles allowed from the same origin
        upgradeInsecureRequests: [], // Add if you want to upgrade HTTP to HTTPS on live
    },
}));

// Set Cross-Origin Resource Policy to allow cross-origin resource access
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

// CORS setup to allow requests from specified origins and support credentials
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies to be sent with requests
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
}));

// API routes
app.use("/api/", router);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

(async () => {
    try {
      await connectDb(); 
      await connectRedis(); 
      const port = process.env.PORT;
      app.listen(port, () => {
        console.log(`Server started on port ${port}`);
      });
    } catch (err) {
      console.error('Error during startup:', err);
      // Optionally process.exit(1) if this is a fatal connection error
    }
  })();
  


