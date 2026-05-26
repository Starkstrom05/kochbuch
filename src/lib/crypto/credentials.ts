import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const ENV_VAR = "OURGROCERIES_ENCRYPTION_KEY";

export class CredentialsKeyMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialsKeyMissingError";
  }
}

export type EncryptedBlob = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
};

function loadKey(): Buffer {
  const raw = process.env[ENV_VAR];
  if (!raw || raw.length === 0) {
    throw new CredentialsKeyMissingError(
      `${ENV_VAR} ist nicht gesetzt. Generieren mit: openssl rand -base64 32`,
    );
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new CredentialsKeyMissingError(`${ENV_VAR} ist kein gueltiges Base64.`);
  }
  if (key.length !== KEY_BYTES) {
    throw new CredentialsKeyMissingError(
      `${ENV_VAR} muss 32 Bytes (Base64) sein, erhalten: ${key.length}.`,
    );
  }
  return key;
}

export function isCredentialsKeyConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): EncryptedBlob {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv) as CipherGCM;
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

export function decryptSecret(blob: EncryptedBlob): string {
  const key = loadKey();
  const decipher = createDecipheriv(ALGO, key, blob.iv) as DecipherGCM;
  decipher.setAuthTag(blob.authTag);
  const plain = Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

const SEPARATOR = "";

export function packCredentials(username: string, password: string): string {
  if (username.includes(SEPARATOR) || password.includes(SEPARATOR)) {
    throw new Error("Credentials duerfen das US-Trennzeichen nicht enthalten.");
  }
  return `${username}${SEPARATOR}${password}`;
}

export function unpackCredentials(packed: string): {
  username: string;
  password: string;
} {
  const idx = packed.indexOf(SEPARATOR);
  if (idx < 0) {
    throw new Error("Gepackte Credentials enthalten kein Trennzeichen.");
  }
  return {
    username: packed.slice(0, idx),
    password: packed.slice(idx + 1),
  };
}
