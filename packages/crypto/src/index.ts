// Crypto utilities for ORBIT Notes (E2EE)

// ====================
// Key Derivation
// ====================

/**
 * Derive a master key from a password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate a random salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

// ====================
// Encryption/Decryption
// ====================

/**
 * Encrypt data with AES-GCM
 */
export async function encrypt(data: Uint8Array, key: CryptoKey): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data as BufferSource
  )

  return {
    ciphertext: new Uint8Array(encrypted),
    iv,
  }
}

/**
 * Decrypt data with AES-GCM
 */
export async function decrypt(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: encrypted.iv as BufferSource,
    },
    key,
    encrypted.ciphertext as BufferSource
  )

  return new Uint8Array(decrypted)
}

export interface EncryptedData {
  ciphertext: Uint8Array
  iv: Uint8Array
}

// ====================
// Key Management
// ====================

/**
 * Generate a random encryption key
 */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Export a key to raw format
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(exported as ArrayBuffer)
}

/**
 * Import a key from raw format
 */
export async function importKey(keyData: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', keyData as BufferSource, { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ])
}

// ====================
// Recovery Phrase (BIP39-style)
// ====================

// Simplified wordlist (subset of BIP39)
const WORDLIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  // ... (in production, use full BIP39 wordlist)
]

/**
 * Generate a 12-word recovery phrase
 */
export function generateRecoveryPhrase(entropy: Uint8Array): string[] {
  const words: string[] = []
  for (let i = 0; i < 12; i++) {
    const index = entropy[i] % WORDLIST.length
    words.push(WORDLIST[index])
  }
  return words
}

/**
 * Convert recovery phrase to entropy
 */
export function recoveryPhraseToEntropy(phrase: string[]): Uint8Array {
  const entropy = new Uint8Array(12)
  for (let i = 0; i < phrase.length; i++) {
    const index = WORDLIST.indexOf(phrase[i])
    if (index === -1) {
      throw new Error(`Invalid word in recovery phrase: ${phrase[i]}`)
    }
    entropy[i] = index
  }
  return entropy
}

// ====================
// Hashing
// ====================

/**
 * Hash data with SHA-256
 */
export async function hash(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return new Uint8Array(hashBuffer)
}

/**
 * Generate HMAC signature
 */
export async function hmac(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign('HMAC', key, data as BufferSource)
  return new Uint8Array(signature)
}

// ====================
// Utilities
// ====================

/**
 * Convert Uint8Array to base64
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

/**
 * Convert base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
