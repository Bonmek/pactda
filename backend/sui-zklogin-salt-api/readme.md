# sui-zklogin-salt-api

## Overview
The `sui-zklogin-salt-api` project is a serverless backend service designed to generate and retrieve unique salts for users. It utilizes a MongoDB database to store salts, ensuring that each user has a unique salt derived from their identifier and issuer.

## Project Structure
```
sui-zklogin-salt-api
├── api
│   └── salt.js          # Handles HTTP requests for generating and retrieving salts
├── lib
│   ├── database.js      # Manages MongoDB connection
│   └── crypto.js        # Contains cryptographic functions for salt generation
├── utils
│   └── validation.js     # Validates incoming requests
├── .env                  # Environment variables (e.g., MongoDB URI)
├── .gitignore            # Files and directories to ignore in Git
├── package.json          # Project metadata and dependencies
└── vercel.json           # Vercel deployment configuration
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd sui-zklogin-salt-api
   ```

2. **Install Dependencies**
   Ensure you have Node.js installed, then run:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your MongoDB connection URI:
   ```
   MONGODB_URI=<your-mongodb-uri>
   ```

4. **Deploying to Vercel**
   - Ensure you have the Vercel CLI installed. If not, you can install it using:
     ```bash
     npm install -g vercel
     ```
   - Run the following command to deploy:
     ```bash
     vercel
     ```

## Usage
- **POST /api/salt**
  - Request Body: `{ "sub": "<user-id>", "iss": "<issuer>" }`
  - Response: `{ "salt": "<unique-salt>" }`
  
- **GET /api/salt**
  - Query Parameters: `sub=<user-id>&iss=<issuer>`
  - Response: `{ "salt": "<unique-salt>" }`

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.

https://sui-zklogin-salt-dinhhbvxm-ten852456s-projects.vercel.app/