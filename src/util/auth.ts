import base64js from "base64-js";
import sha256 from 'sha256';

export async function encodeSecret(secret: string) {
  let secretBytes = new TextEncoder().encode(secret);
  let randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  let concatedBytes = new Uint8Array(secretBytes.length + randomBytes.length);
  concatedBytes.set(secretBytes);
  concatedBytes.set(randomBytes, secretBytes.length);
  let digestPromise;
  if (!window.crypto.subtle) {
    console.warn(
      "Crypto subtle is not available - insecure context or old browser. Using JS crypto.");
    digestPromise = new Promise((resolve, reject) => {
      const hash = sha256(concatedBytes, { asBytes: true });
      resolve(hash);
    });
  } else {
    digestPromise = window.crypto.subtle.digest("SHA-256", concatedBytes)
      .then(hash => new Uint8Array(hash));
  }
  const digest = await digestPromise;
  const finalSecret =
    base64js.fromByteArray(randomBytes) +
    "|" +
    base64js.fromByteArray(digest);
  return finalSecret;
}

export function deleteCookie() {
  document.cookie = "audioserve_token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}
