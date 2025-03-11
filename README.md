# DermaLens API Documentation

## _Authentication & User Management API_

[![N|Solid](https://i.imgur.com/8wECp9E.png)](https://dermalens.com)

[![Node.js](https://img.shields.io/badge/Node.js-14.x+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com)
[![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)](https://jwt.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green.svg)](https://mongodb.com)

This repository contains the authentication and user management API for the DermaLens application. It provides endpoints for user registration, authentication, profile management, and session handling.

## Features

- **User Authentication** - Secure signup, signin, and signout functionality
- **JWT-based Sessions** - Stateless authentication using JSON Web Tokens
- **Profile Management** - Update and retrieve user profile information
- **Password Security** - Bcrypt hashing for secure password storage
- **Input Validation** - Request validation middleware
- **Error Handling** - Consistent error responses

## Project Structure

```
supabase-auth-api/
├── .env                  # Environment variables (not in repo)
├── .gitignore            # Git ignore file
├── index.js              # Application entry point
├── package.json          # Project dependencies and scripts
├── package-lock.json     # Dependency lock file
├── config/               # Configuration files
│   └── supabase.js       # Supabase configuration
├── controllers/          # Request handlers
│   └── authController.js # Authentication controller
├── middleware/           # Custom middleware
│   └── auth.js           # Authentication middleware
├── routes/               # API routes
│   └── auth.js           # Authentication routes
└── node_modules/         # Installed packages (not in repo)
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Request Body | Response |
| ------ | ------ | ------ | ------ | ------ |
| POST | `/api/auth/signup` | Register a new user | `{ email, password, name }` | `{ user, token }` |
| POST | `/api/auth/signin` | Login a user | `{ email, password }` | `{ user, token }` |
| POST | `/api/auth/logout` | Logout a user | None (requires auth token) | `{ message }` |
| GET | `/api/auth/profile` | Get user profile | None (requires auth token) | `{ user }` |
| PUT | `/api/auth/profile` | Update user profile | `{ name, phone, avatar }` (requires auth token) | `{ user }` |

## Installation

1. Clone the repository:
```sh
git clone https://github.com/yourusername/supabase-auth-api.git
cd supabase-auth-api
```

2. Install dependencies:
```sh
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/dermalens
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

4. Start the server:
```sh
npm start
```

For development with auto-restart:
```sh
npm run dev
```

## Implementation Details

### Authentication Flow

1. **Registration (Signup)**:
   - Client sends email, password, and name to `/api/auth/signup`
   - Server validates input
   - Server checks if email already exists
   - If email is unique, password is hashed using bcrypt
   - New user is created in the database
   - JWT token is generated and returned with user data

2. **Login (Signin)**:
   - Client sends email and password to `/api/auth/signin`
   - Server validates input
   - Server checks if user exists and verifies password
   - If credentials are valid, JWT token is generated and returned with user data

3. **Authentication Middleware**:
   - Extracts JWT token from Authorization header
   - Verifies token validity
   - Attaches user ID to request object for use in protected routes

### Code Examples

#### Authentication Controller (authController.js)

```javascript
// Sample signup function
exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
    
    // Return user data and token
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
```

#### Authentication Middleware (auth.js)

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

#### Authentication Routes (auth.js)

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
```

## Error Handling

The API uses a consistent error response format:

```json
{
  "message": "Error message describing what went wrong",
  "error": "Optional technical details (only in development)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created (for successful signup)
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `500` - Server Error

## Testing

Run tests using Jest:

```sh
npm test
```

## Deployment

### Docker

Build and run with Docker:

```sh
docker build -t dermalens-auth-api .
docker run -p 3000:3000 -d dermalens-auth-api
```

### Environment Variables for Production

For production deployment, ensure these environment variables are set:

- `NODE_ENV=production`
- `PORT=3000` (or your preferred port)
- `MONGODB_URI=your_production_mongodb_uri`
- `JWT_SECRET=your_strong_secret_key`
- `JWT_EXPIRES_IN=7d` (or your preferred token expiration time)

## License

MIT

**Secure Authentication for Better Skin Health!**

[//]: # (Reference links)
   [node.js]: <http://nodejs.org>
   [express]: <http://expressjs.com>
   [mongodb]: <https://www.mongodb.com/>
   [jwt]: <https://jwt.io/>
