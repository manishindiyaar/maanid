/**
 * Environment configuration utility
 * Centralizes loading of environment variables for the AI orchestration system
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Find the .env.local file, starting from the current directory and moving up until found
function findEnvFile() {
  // Possible locations for the .env.local file
  const possiblePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'nextjs-frontend', '.env.local'),
    path.resolve(process.cwd(), '..', '.env.local'),
    path.resolve(__dirname, '..', '..', '..', '..', '.env.local')
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`Found .env.local at: ${envPath}`);
      return envPath;
    }
  }
  
  // If no file found, default to the current directory
  console.log('No .env.local file found, using default path');
  return path.resolve(process.cwd(), '.env.local');
}

// Load environment variables
const envPath = findEnvFile();
dotenv.config({ path: envPath });

// Debug environment variables
console.log('Environment variables loaded:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Set (hidden)' : 'Not set');

// Required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY'
];

// Check if all required variables are set
function checkRequiredVars() {
  console.log('Checking environment variables:');
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  } else {
    console.log('✅ All required environment variables are set');
    return true;
  }
}

// Export configuration
module.exports = {
  envPath,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  checkRequiredVars
}; 