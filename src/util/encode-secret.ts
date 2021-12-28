import base64js from "base64-js";

export async function encodeSecret(secret: string) {
  let secretBytes = new TextEncoder().encode(secret);
  let randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  let concatedBytes = new Uint8Array(secretBytes.length + randomBytes.length);
  concatedBytes.set(secretBytes);
  concatedBytes.set(randomBytes, secretBytes.length);
  if (!window.crypto.subtle) {
    throw new Error("Crypto subtle not supported");
  } else {
    const digest = await window.crypto.subtle.digest("SHA-256", concatedBytes);
    const secret =
      base64js.fromByteArray(randomBytes) +
      "|" +
      base64js.fromByteArray(new Uint8Array(digest));
    return secret;
  }
}
