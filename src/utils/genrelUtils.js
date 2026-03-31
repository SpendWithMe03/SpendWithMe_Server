import HttpError from "../interface/httpError.js";

const jsonOne = async function (res, statusCode, data, message = "") {
  return res.status(statusCode).json({
    data,
    message: message,
    status: true,
  });
};

const setCookie = (res, key, data) => {
  const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  res.cookie(key, data, {
    httpOnly: true, // Prevents access via JavaScript (security)
    secure: true, // Only send over HTTPS (ensure backend uses HTTPS)
    sameSite: "None", // Required for cross-site cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    expires: expirationDate, // Expiration date
    domain: ".spend-with-me-client.vercel.app", // FRONTEND domain
  });
};

const removeCookie = (res, key) => {
  res.cookie(key, "", {
    httpOnly: true,
    expires: new Date(0),
    secure: true,
    sameSite: "Strict",
    domain: ".spend-with-me-client.vercel.app",
  });
};

const throwHttpError = (title, message, code) => {
  throw new HttpError({ title, message, code });
};

const throwHttpErrorWithHeader = (title, message, code, res) => {
  res.setHeader("X-Error-Message", message); // Add the error message to the headers
  throw new HttpError({ title, message, code });
};

export {
  throwHttpError,
  jsonOne,
  setCookie,
  removeCookie,
  throwHttpErrorWithHeader,
};
