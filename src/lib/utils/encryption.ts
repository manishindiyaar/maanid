import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'bladex-webhook-encryption-key-32chars';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts sensitive credential data
 * 
 * @param credentials Object containing credentials to encrypt
 * @returns Object with encrypted sensitive fields
 */
export function encryptCredentials(credentials: any): any {
  if (!credentials) return null;
  
  try {
    // Create a copy of the credentials object
    const result = { ...credentials };
    
    // Encrypt sensitive fields
    if (result.supabase_anon_key) {
      result.supabase_anon_key = encrypt(result.supabase_anon_key);
    }
    
    if (result.supabase_service_role_key) {
      result.supabase_service_role_key = encrypt(result.supabase_service_role_key);
    }
    
    // Mark the object as encrypted
    result._encrypted = true;
    result._encrypted_at = new Date().toISOString();
    
    return result;
  } catch (error) {
    console.error('Error encrypting credentials:', error);
    return credentials; // Return original on error
  }
}

/**
 * Decrypts sensitive credential data
 * 
 * @param encryptedCredentials Object containing encrypted credentials
 * @returns Object with decrypted sensitive fields
 */
export function decryptCredentials(encryptedCredentials: any): any {
  // If no credentials or not marked as encrypted, return as is
  if (!encryptedCredentials) {
    return null;
  }
  
  // If not marked as encrypted, return as is
  if (!encryptedCredentials._encrypted) {
    return encryptedCredentials;
  }
  
  try {
    // Create a copy of the credentials object
    const result = { ...encryptedCredentials };
    
    // Decrypt sensitive fields with safety checks
    if (result.supabase_anon_key) {
      try {
        // Check if it's in the expected format before decrypting
        if (typeof result.supabase_anon_key === 'string' && result.supabase_anon_key.includes(':')) {
          result.supabase_anon_key = decrypt(result.supabase_anon_key);
        } else {
          console.warn('supabase_anon_key not in expected encrypted format, using as is');
        }
      } catch (fieldError) {
        console.warn('Failed to decrypt supabase_anon_key, using as is:', fieldError);
      }
    }
    
    // Handle database_key field if it exists (map it to supabase_anon_key)
    if (result.database_key && !result.supabase_anon_key) {
      try {
        if (typeof result.database_key === 'string' && result.database_key.includes(':')) {
          result.supabase_anon_key = decrypt(result.database_key);
        } else {
          console.warn('database_key not in expected encrypted format, using as is');
          result.supabase_anon_key = result.database_key;
        }
      } catch (fieldError) {
        console.warn('Failed to decrypt database_key, using as is:', fieldError);
        result.supabase_anon_key = result.database_key;
      }
    }
    
    // Handle database_url field if it exists (map it to supabase_url)
    if (result.database_url && !result.supabase_url) {
      result.supabase_url = result.database_url;
    }
    
    if (result.supabase_service_role_key) {
      try {
        // Check if it's in the expected format before decrypting
        if (typeof result.supabase_service_role_key === 'string' && result.supabase_service_role_key.includes(':')) {
          result.supabase_service_role_key = decrypt(result.supabase_service_role_key);
        } else {
          console.warn('supabase_service_role_key not in expected encrypted format, using as is');
        }
      } catch (fieldError) {
        console.warn('Failed to decrypt supabase_service_role_key, using as is:', fieldError);
      }
    }
    
    // Remove encryption markers
    delete result._encrypted;
    result._decrypted_at = new Date().toISOString();
    
    return result;
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    
    // If there's an error in decryption, return the original credentials
    // This is safer than returning null, as it allows the process to continue
    return encryptedCredentials;
  }
}

/**
 * Encrypt a string using AES-256-CBC
 */
function encrypt(text: string): string {
  // Create an initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create a cipher using the encryption key and iv
  const cipher = crypto.createCipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), 
    iv
  );
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return iv + encrypted (iv is needed for decryption)
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-CBC
 */
function decrypt(text: string): string {
  // Split the iv and encrypted text
  const parts = text.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  // Create a decipher using the encryption key and iv
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), 
    iv
  );
  
  // Decrypt the text
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
} 