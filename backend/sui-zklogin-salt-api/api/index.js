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

const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

/**
 * Generates a cryptographically secure random salt for use with Sui zkLogin
 * The salt must be a valid field element in the BN254 scalar field
 * This is required for Groth16 proof compatibility with zkLogin
 * 
 * @returns {string} A valid zkLogin salt as a decimal string
 */
function generateSalt() {
  // Use 32 bytes of randomness for greater security (256 bits)
  const buffer = crypto.randomBytes(32);
  
  // Convert to BigInt with 0x prefix for hex interpretation
  const randomBigInt = BigInt(`0x${buffer.toString('hex')}`);
  
  // Ensure the value is within the valid range for BN254 scalar field
  // by taking modulo of the field size
  const salt = randomBigInt % BN254_FIELD_MODULUS;
  
  // Return as decimal string as required by Sui zkLogin
  return salt.toString(10);
}

// Routes
app.get('/api/salt', async (req, res) => {
  try {
    const { sub, iss } = req.query;
    
    if (!sub || !iss) {
      return res.status(400).json({ error: 'Missing required query parameters: sub (user identifier) and iss (issuer)' });
    }
    
    // Basic validation for iss and sub
    if (typeof iss !== 'string' || iss.trim() === '' || typeof sub !== 'string' || sub.trim() === '') {
      return res.status(400).json({ error: 'Invalid iss or sub format' });
    }
    
    const db = await connectToDatabase();
    const collection = db.collection('user_salts');
    
    const userKey = `${iss}:${sub}`;
    const userRecord = await collection.findOne({ userKey });
    
    if (!userRecord) {
      console.log(`Salt not found for user key: ${userKey.substring(0, 15)}...`);
      return res.status(404).json({ error: 'Salt not found for this user' });
    }
    
    // Verify stored salt is still a valid BN254 field element
    try {
      const saltBigInt = BigInt(userRecord.salt);
      if (saltBigInt <= 0 || saltBigInt >= BN254_FIELD_MODULUS) {
        console.error(`Invalid salt detected for user ${userKey.substring(0, 15)}...`);
        return res.status(500).json({ error: 'Stored salt is invalid for Sui zkLogin Groth16 proofs' });
      }
    } catch (error) {
      console.error(`Salt parsing error for user ${userKey.substring(0, 15)}...`, error);
      return res.status(500).json({ error: 'Invalid salt format in database' });
    }
    
    console.log(`Successfully retrieved salt for user ${userKey.substring(0, 15)}...`);
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
    
    // Basic validation for iss and sub
    if (typeof iss !== 'string' || iss.trim() === '' || typeof sub !== 'string' || sub.trim() === '') {
      return res.status(400).json({ error: 'Invalid iss or sub format' });
    }
    
    const db = await connectToDatabase();
    const collection = db.collection('user_salts');
    
    const userKey = `${iss}:${sub}`;
    let userRecord = await collection.findOne({ userKey });
    
    if (!userRecord) {
      const salt = generateSalt();
      
      const saltBigInt = BigInt(salt);
      if (saltBigInt <= 0 || saltBigInt >= BN254_FIELD_MODULUS) {
        throw new Error('Generated salt is outside valid BN254 field range');
      }
      
      userRecord = { 
        userKey, 
        salt, 
        createdAt: new Date(),
        provider: iss,
        subjectId: sub 
      };
      
      await collection.insertOne(userRecord);
      console.log(`Created new salt for user ${userKey.substring(0, 15)}...`);
    } else {
      console.log(`Retrieved existing salt for user ${userKey.substring(0, 15)}...`);
    }
    
    return res.status(200).json({ salt: userRecord.salt });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Utility endpoint to validate if a salt is valid for zkLogin
app.post('/api/salt/validate', async (req, res) => {
  try {
    const { salt } = req.body;
    
    if (!salt) {
      return res.status(400).json({ error: 'Missing salt parameter', isValid: false });
    }
    
    try {
      // Try to parse the salt as a BigInt
      const saltBigInt = BigInt(salt);
      
      // Check if it's within the valid BN254 scalar field range
      const isValid = saltBigInt > 0 && saltBigInt < BN254_FIELD_MODULUS;
      
      return res.status(200).json({ 
        isValid,
        salt,
        message: isValid ? 
          'Salt is valid for Sui zkLogin Groth16 proofs' : 
          'Salt is outside the valid BN254 field element range'
      });
    } catch (error) {
      return res.status(400).json({ 
        isValid: false,
        salt,
        error: 'Invalid salt format. Must be a valid decimal number string'
      });
    }
  } catch (error) {
    console.error('Error validating salt:', error);
    return res.status(500).json({ error: 'Internal server error', isValid: false });
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
      salt: '/api/salt',
      validate: '/api/salt/validate'
    },
    details: 'This API generates and stores cryptographically secure salts compatible with Sui zkLogin Groth16 proofs'
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