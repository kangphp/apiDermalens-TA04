# DermaLens API Documentation

## _Authentication & User Management API with Supabase_

[![N|Solid](https://i.imgur.com/8wECp9E.png)](https://dermalens.com)

[![Node.js](https://img.shields.io/badge/Node.js-14.x+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.io)
[![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)](https://jwt.io)

This repository contains the authentication and user management API for the DermaLens application. It leverages Supabase for database operations and provides endpoints for user registration, authentication, profile management, and session handling.

## Features

- **User Authentication** - Secure signup, signin, and signout functionality
- **JWT-based Sessions** - Stateless authentication using JSON Web Tokens
- **Profile Management** - Update and retrieve user profile information
- **Password Security** - Bcrypt hashing for secure password storage
- **Input Validation** - Request validation middleware
- **Error Handling** - Consistent error responses
- **Supabase Integration** - Leveraging Supabase for database operations

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
SUPABASE_URL=https://rmhefocqqromltyvkcmi.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtaGVmb2NxcXJvbWx0eXZrY21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MzYwMDAsImV4cCI6MjA1NDIxMjAwMH0.SYYdCGiwuZz0wgyyQ9n_50YdKrRJ7mjagA0Uo6--qsU
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtaGVmb2NxcXJvbWx0eXZrY21pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODYzNjAwMCwiZXhwIjoyMDU0MjEyMDAwfQ.3yMSb8gtygWwG1ckyOwbDb0e2fyDHpkxfVdMCvp3Zec
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

> **IMPORTANT**: The `.env` file contains sensitive information. Never commit it to version control. Make sure it's included in your `.gitignore` file.

4. Start the server:
```sh
npm start
```

For development with auto-restart:
```sh
npm run dev
```

## Implementation Details

### Supabase Configuration

The API uses Supabase as its database and authentication provider. The connection is configured in `config/supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Client for anonymous operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Client with service role for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase, supabaseAdmin };
```

### Authentication Flow

1. **Registration (Signup)**:
   - Client sends email, password, and name to `/api/auth/signup`
   - Server validates input
   - Server uses Supabase to create a new user
   - JWT token is generated and returned with user data

2. **Login (Signin)**:
   - Client sends email and password to `/api/auth/signin`
   - Server validates input
   - Server authenticates with Supabase
   - If credentials are valid, JWT token is generated and returned with user data

3. **Authentication Middleware**:
   - Extracts JWT token from Authorization header
   - Verifies token validity
   - Attaches user ID to request object for use in protected routes

### Code Examples

#### Supabase Configuration (supabase.js)

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase, supabaseAdmin };
```

#### Authentication Controller (authController.js)

```javascript
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');

// Signup function
exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Create user in Supabase
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name }
    });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Create profile in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{ 
        id: data.user.id, 
        name, 
        email 
      }]);
    
    if (profileError) {
      return res.status(400).json({ message: profileError.message });
    }
    
    // Generate JWT token
    const token = jwt.sign({ id: data.user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    // Return user data and token
    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Signin function
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      return res.status(400).json({ message: profileError.message });
    }
    
    // Generate JWT token
    const token = jwt.sign({ id: data.user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    // Return user data and token
    res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        phone: profile.phone,
        avatar: profile.avatar
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
const { supabase } = require('../config/supabase');

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
    
    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.id)
      .single();
    
    if (error || !user) {
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

## Database Schema

### Profiles Table

The API uses a `profiles` table in Supabase with the following schema:

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text unique,
  phone text,
  avatar text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS (Row Level Security)
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on profiles for update
  using ( auth.uid() = id );
```

## Security Considerations

1. **Environment Variables**: 
   - Keep your `.env` file secure and never commit it to version control
   - Rotate your JWT secret and Supabase keys periodically

2. **Supabase Security**:
   - Use Row Level Security (RLS) policies in Supabase to restrict data access
   - Use the service role key only for server-side operations that require elevated privileges

3. **JWT Best Practices**:
   - Set appropriate expiration times for tokens
   - Include only necessary data in the token payload
   - Implement token refresh mechanisms for long-lived sessions

4. **Input Validation**:
   - Validate all user inputs before processing
   - Use middleware for consistent validation across endpoints

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
docker run -p 3000:3000 --env-file .env -d dermalens-auth-api
```

### Environment Variables for Production

For production deployment, ensure these environment variables are set securely:

- `NODE_ENV=production`
- `PORT=3000` (or your preferred port)
- `SUPABASE_URL=your_supabase_url`
- `SUPABASE_KEY=your_supabase_key`
- `SUPABASE_SERVICE_KEY=your_supabase_service_key`
- `JWT_SECRET=your_strong_secret_key`

## License

MIT

**Secure Authentication for Better Skin Health!**

[//]: # (Reference links)
   [node.js]: <http://nodejs.org>
   [express]: <http://expressjs.com>
   [supabase]: <https://supabase.io>
   [jwt]: <https://jwt.io/>
