import dotenv from "dotenv";
import { info } from "../library/Logging.js";

dotenv.config({
  path: ".env",
});
info(`Running on ENV = ${process.env.NODE_ENV}`);

//*** LOCAL CONFIGURATION ***//
const PORT = Number(process.env.PORT);
const JWT_KEY = process.env.JWT_KEY;
const CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY;
const NODE_ENV = process.env.NODE_ENV;
const IV = process.env.IV;

//*** ADMIN CONFIGURATION ***//
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME;
const ADMIN_KEY = process.env.ADMIN_KEY;

//*** GOOGLE CONFIGURATION ***//
const  GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

//*** DATABASE CONFIGURATION ***//
const MONGO_URL = process.env.MONGO_URL;
const DATA_BASE_URL = process.env.DATA_BASE_URL;

//*** SMTP CONFIGURATION ***//
const SMTP_MAIL = process.env.SMTP_MAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

//*** ORIGIN CONFIGURATION ***//
const CLIENT_URL = process.env.CLIENT_URL;
const FORNTEND_URL = process.env.FORNTEND_URL;

export {
  PORT,
  JWT_KEY,
  CRYPTO_SECRET_KEY,
  NODE_ENV,
  IV,
  ADMIN_KEY,
  MONGO_URL,
  DATA_BASE_URL,
  SMTP_MAIL,
  FORNTEND_URL,
  ADMIN_NAME,
  GOOGLE_CLIENT_ID,
  SMTP_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CLIENT_URL,
};
