//const crypto = require('crypto');
import crypto from 'crypto';
require('dotenv').config();

const algorithm = 'aes-256-cbc';
const key: any = process.env.UCCX_ENCRYPTION_KEY;
const IV_LENGTH = 16;

export const encrypt = (password: string) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(password);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decrypt = (password: string) => {
  const [iv, encryptedText] = password.split(':').map((part) => Buffer.from(part, 'hex'));
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
