import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  CredentialsKeyMissingError,
  decryptSecret,
  encryptSecret,
  isCredentialsKeyConfigured,
  packCredentials,
  unpackCredentials,
} from "./credentials";

const ENV = "OURGROCERIES_ENCRYPTION_KEY";

describe("credentials crypto", () => {
  const original = process.env[ENV];

  beforeEach(() => {
    process.env[ENV] = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV];
    else process.env[ENV] = original;
  });

  it("round-trips a UTF-8 secret", () => {
    const plain = "ümlauts & sönderzeichen — secret123";
    const blob = encryptSecret(plain);
    expect(decryptSecret(blob)).toBe(plain);
  });

  it("produces a different ciphertext per call (fresh IV)", () => {
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    expect(a.iv.equals(b.iv)).toBe(false);
  });

  it("rejects tampering of the ciphertext", () => {
    const blob = encryptSecret("payload");
    const tampered = Buffer.from(blob.ciphertext);
    tampered[0] ^= 0xff;
    expect(() => decryptSecret({ ...blob, ciphertext: tampered })).toThrow();
  });

  it("rejects tampering of the auth tag", () => {
    const blob = encryptSecret("payload");
    const tampered = Buffer.from(blob.authTag);
    tampered[0] ^= 0xff;
    expect(() => decryptSecret({ ...blob, authTag: tampered })).toThrow();
  });

  it("throws when the key env var is missing", () => {
    delete process.env[ENV];
    expect(isCredentialsKeyConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(CredentialsKeyMissingError);
  });

  it("throws when the key has the wrong byte length", () => {
    process.env[ENV] = Buffer.from("too-short").toString("base64");
    expect(() => encryptSecret("x")).toThrow(CredentialsKeyMissingError);
  });

  it("packs and unpacks username + password", () => {
    const packed = packCredentials("alice@example.com", "p@ssw:rd|with/specials");
    const { username, password } = unpackCredentials(packed);
    expect(username).toBe("alice@example.com");
    expect(password).toBe("p@ssw:rd|with/specials");
  });
});
