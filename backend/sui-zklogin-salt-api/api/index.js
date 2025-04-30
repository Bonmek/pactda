const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');

// Load environment variables
require('dotenv').config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const client = await MongoClient.connect(process.env.MONGODB_URI,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tlsAllowInvalidCertificates: true
  });
  const db = client.db('sui-zklogin');
  cachedDb = db;
  return db;
}

// BN254 scalar field modulus (r)
// This is the order of the scalar field for the BN254 curve.
const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

// Generate a cryptographically secure random salt within the BN254 field
function generateSalt() {
  // Generate 16 random bytes (128 bits) for entropy.
  const buffer = crypto.randomBytes(16);
  // Convert the random bytes to a BigInt.
  const randomBigInt = BigInt(`0x${buffer.toString('hex')}`);
  // Reduce the BigInt modulo the field modulus.
  // This ensures the salt is within the valid range [0, BN254_FIELD_MODULUS - 1].
  const salt = randomBigInt % BN254_FIELD_MODULUS;
  // Return the salt as a base-10 string.
  return salt.toString();
}

// Routes
app.get('/api/salt', async (req, res) => {
  try {
    const { sub, iss } = req.query;
    
    if (!sub || !iss) {
      return res.status(400).json({ error: 'Missing required query parameters: sub (user identifier) and iss (issuer)' });
    }
    
    const db = await connectToDatabase();
    const collection = db.collection('user_salts');
    
    const userKey = `${iss}:${sub}`;
    const userRecord = await collection.findOne({ userKey });
    
    if (!userRecord) {
      return res.status(404).json({ error: 'Salt not found for this user' });
    }
    
    return res.status(200).json({ salt: userRecord.salt });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/salt', async (req, res) => {
  try {
    const { sub, iss } = req.body;
    
    if (!sub || !iss) {
      return res.status(400).json({ error: 'Missing required fields: sub (user identifier) and iss (issuer)' });
    }
    
    const db = await connectToDatabase();
    const collection = db.collection('user_salts');
    
    const userKey = `${iss}:${sub}`;
    let userRecord = await collection.findOne({ userKey });
    
    if (!userRecord) {
      const salt = generateSalt();
      userRecord = { userKey, salt, createdAt: new Date() };
      await collection.insertOne(userRecord);
    }
    
    return res.status(200).json({ salt: userRecord.salt });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Salt API is running' });
});

// Also add a root route for easy testing
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the Salt API for Sui zkLogin',
    endpoints: {
      health: '/api/health',
      salt: '/api/salt'
    }
  });
});

// If running directly (not on Vercel), listen on port
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`Salt endpoint: http://localhost:${PORT}/api/salt`);
  });
}

// Export the Express app as a serverless function
module.exports = app;