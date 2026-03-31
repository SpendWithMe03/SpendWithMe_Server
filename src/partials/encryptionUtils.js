import cryptoJS from "crypto-js";
import { CRYPTO_SECRET_KEY, IV } from "../config/config.js";
import { error } from "../library/Logging.js";
import { extractToken } from "../utils/authUtils.js";

function encodeData(data) {
  try {
    const plainData = JSON.stringify(data);
    const cipherData = cryptoJS.AES.encrypt(
      plainData,
      CRYPTO_SECRET_KEY
    ).toString();
    return cipherData;
  } catch {
    return "";
  }
}

function decodeData(data) {
  try {
    const bytes = cryptoJS.AES.decrypt(data, CRYPTO_SECRET_KEY);
    const plainData = JSON.parse(bytes.toString(cryptoJS.enc.Utf8));
    return plainData;
  } catch {
    return {};
  }
}

function encodeResData(body, req, res) {
  try {
    const plainData = JSON.stringify(body);
    const cipherData = cryptoJS.AES.encrypt(
      plainData,
      cryptoJS.enc.Utf8.parse(CRYPTO_SECRET_KEY),
      {
        iv: cryptoJS.enc.Hex.parse(IV),
      }
    ).toString();
    return cipherData;
  } catch (e) {
    error(e);
    return {};
  }
}

const decodeToken = (encryptedToken) => {
  try {
    const bytes = cryptoJS.AES.decrypt(
      encryptedToken,
      cryptoJS.enc.Utf8.parse(CRYPTO_SECRET_KEY),
      {
        iv: cryptoJS.enc.Hex.parse(IV),
      }
    );
    return bytes.toString(cryptoJS.enc.Utf8); // Return the decoded token
  } catch (error) {
    return encryptedToken; // Return original value if decryption fails
  }
};

const decodeReqData = (req, res, next) => {
  try {
    // 1️⃣ Decrypt Authorization Header (if encrypted)
    const authHeader = req.headers["authorization"];

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const encryptedToken = authHeader.split(" ")[1]; // Extract the token
      const decodedToken = decodeToken(encryptedToken); // Decrypt the token
      req.headers["authorization"] = `Bearer ${decodedToken}`; // Replace with decrypted token
    }

    // Decrypt the data
    if (!req.body || !req.body.data) {
      next();
    } else {
      const bytes = cryptoJS.AES.decrypt(
        req.body.data,
        cryptoJS.enc.Utf8.parse(CRYPTO_SECRET_KEY),
        {
          iv: cryptoJS.enc.Hex.parse(IV),
        }
      );
      // Convert the decrypted bytes back to a UTF-8 string
      const plainData = JSON.parse(bytes.toString(cryptoJS.enc.Utf8));
      req.body = plainData;
      next();
    }
  } catch (error) {
    console.error("Decryption Error:", error);
    throw new Error("Decryption failed.");
  }
};
export { encodeData, decodeData, encodeResData, decodeReqData };
