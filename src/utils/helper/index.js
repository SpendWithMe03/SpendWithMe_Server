import { OAuth2Client } from "google-auth-library";
import { CLIENT_URL, GOOGLE_CLIENT_ID } from "../../config/config.js";
import Token from "../../model/token.js";
import crypto from "crypto";
import { tokenStatus } from "../enum/index.js";
import User from "../../model/User.js";
import GoogleUser from "../../model/googleUser.js";
import { throwHttpError } from "../genrelUtils.js";

// CREATE GOOGLE CLIENT OBJECT FOR AUTHENTICATION AND AUTHORIZATION OF GOOGLE SIGNUP AND LOGIN
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

//*** CREATE RANDOM TOKEN ***//
const createRandomToken = (length = 64) => {
  return crypto.randomBytes(length).toString("hex");
};

//*** CREATE GROUP CODE ***//
const createGroupCode = (length = 6) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

//*** CREATE VERIFICATION TOKEN ***//
const createVerificationToken = async (email, type, next) => {
  try {
    // Generate a random token
    const token = createRandomToken();

    // Calculate the expiration date
    const expiresIn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save the token to the ForgotPassword model
    await Token.create({
      token,
      type,
      status: Object.values(tokenStatus)[0],
      expiresIn,
      email,
    });

    return token;
  } catch (error) {
    next(error);
  }
};

//*** VERIFY VERIFICATION TOKEN ***//
const verifyVerificationToken = async (token, next) => {
  try {
    const verificationToken = await Token.findOne({
      token,
      status: Object.values(tokenStatus)[0],
    });

    // CHECK IF THE TOKEN IS VALID OR EXPIRED
    if (!verificationToken || verificationToken.expiresIn < new Date()) {
      return null;
    }

    // UPDATE THE STATUS OF THE TOKEN TO DELETED
    await Token.findByIdAndUpdate(
      { _id: verificationToken._id },
      { status: Object.values(tokenStatus)[1] },
      { new: true, runValidators: true }
    );

    return verificationToken.email;
  } catch (error) {
    next(error);
  }
};

//*** CREATE LINK FOR VERIFICATION ***
const createLink = (token, type) => {
  return `${CLIENT_URL}/${type}?token=${token}`;
};

const getModelByRole = async (_id) => {
  if (await User.findById(_id)) {
    return "User";
  } else {
    return "GoogleUser";
  }
};

export {
  client,
  getModelByRole,
  createVerificationToken,
  verifyVerificationToken,
  createLink,
  createGroupCode,
};
