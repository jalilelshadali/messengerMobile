// tweetnacl has no random source in React Native / Hermes ("Error: no PRNG"),
// which breaks EVERYTHING crypto: E2EE identity keys, PIN key derivation,
// secretbox nonces. expo-crypto provides a synchronous CSPRNG that works in
// Expo Go and standalone builds alike. Wire it into nacl once, before any
// nacl.randomBytes / keyPair / secretbox call runs.
//
// This module MUST be imported first in index.js (before ./App).

import { getRandomBytes } from "expo-crypto";
import nacl from "tweetnacl";

nacl.setPRNG((x, n) => {
  const bytes = getRandomBytes(n);
  for (let i = 0; i < n; i += 1) x[i] = bytes[i];
});
