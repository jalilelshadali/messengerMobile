import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";
import { Platform } from "react-native";

const SECRET_KEY_STORAGE = "e2ee_secret_key";
const PUBLIC_KEY_STORAGE = "e2ee_public_key";

// expo-secure-store has no real implementation on web (it's Keystore/Keychain
// only). The web build is used by admins, who are also regular chat users, so
// we fall back to AsyncStorage there — note this is NOT hardware-backed
// secure storage like on native; it's the best available on a browser.
const keyStore = Platform.OS === "web" ? AsyncStorage : SecureStore;

async function getStored(key) {
  return Platform.OS === "web" ? keyStore.getItem(key) : keyStore.getItemAsync(key);
}

async function setStored(key, value) {
  return Platform.OS === "web" ? keyStore.setItem(key, value) : keyStore.setItemAsync(key, value);
}

let cachedKeyPair = null;

// Returns { publicKey, secretKey } as base64 strings. Generates and persists
// a new Curve25519 identity keypair on first use; the secret key never
// leaves this device (stored in Keystore/Keychain via SecureStore on native).
export async function getOrCreateIdentityKeyPair() {
  if (cachedKeyPair) return cachedKeyPair;

  const storedSecret = await getStored(SECRET_KEY_STORAGE);
  const storedPublic = await getStored(PUBLIC_KEY_STORAGE);

  if (storedSecret && storedPublic) {
    cachedKeyPair = { publicKey: storedPublic, secretKey: storedSecret };
    return cachedKeyPair;
  }

  const keyPair = nacl.box.keyPair();
  const publicKey = encodeBase64(keyPair.publicKey);
  const secretKey = encodeBase64(keyPair.secretKey);

  await setStored(SECRET_KEY_STORAGE, secretKey);
  await setStored(PUBLIC_KEY_STORAGE, publicKey);

  cachedKeyPair = { publicKey, secretKey };
  return cachedKeyPair;
}

// Encrypts `plaintext` so only the holder of `recipientPublicKeyB64`'s
// private key can read it. Returns { ciphertext, nonce } as base64 strings.
export function encryptForRecipient(plaintext, recipientPublicKeyB64, mySecretKeyB64) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const message = decodeUTF8(plaintext);
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64);
  const mySecretKey = decodeBase64(mySecretKeyB64);

  const box = nacl.box(message, nonce, recipientPublicKey, mySecretKey);

  return {
    ciphertext: encodeBase64(box),
    nonce: encodeBase64(nonce),
  };
}

// Decrypts a message sent by the holder of `senderPublicKeyB64`. Returns the
// plaintext string, or null if decryption fails (wrong keys, corrupted data,
// or a message from before this device had a keypair).
export function decryptFromSender(ciphertextB64, nonceB64, senderPublicKeyB64, mySecretKeyB64) {
  try {
    const ciphertext = decodeBase64(ciphertextB64);
    const nonce = decodeBase64(nonceB64);
    const senderPublicKey = decodeBase64(senderPublicKeyB64);
    const mySecretKey = decodeBase64(mySecretKeyB64);

    const opened = nacl.box.open(ciphertext, nonce, senderPublicKey, mySecretKey);
    if (!opened) return null;
    return encodeUTF8(opened);
  } catch {
    return null;
  }
}
