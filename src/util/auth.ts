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
  console.debug("digest", digest);
  const finalSecret =
    base64js.fromByteArray(randomBytes) +
    "|" +
    base64js.fromByteArray(digest);
  console.debug("final secret", finalSecret);
  return finalSecret;
}

function wordArrayToUint8Array(wordArray: any) {
  var len = wordArray.words.length,
        u8_array = new Uint8Array(len << 2),
        offset = 0, word, i
    ;
    for (i=0; i<len; i++) {
        word = wordArray.words[i];
        u8_array[offset++] = word >> 24;
        u8_array[offset++] = (word >> 16) & 0xff;
        u8_array[offset++] = (word >> 8) & 0xff;
        u8_array[offset++] = word & 0xff;
    }
    return u8_array;
}


export function deleteCookie() {
  document.cookie = "audioserve_token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}
