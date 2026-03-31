import argon2 from "argon2";
import { GOOGLE_CLIENT_ID } from "../../config/config.js";
import HTTP from "../../constants/httpStatusCode.js";
import constantMessages from "../../constants/messageConstants.js";
import GoogleUser from "../../model/googleUser.js";
import User from "../../model/User.js";
import sendMail from "../../service/sendmail.js";
import { tokenBuilder } from "../../utils/authUtils.js";
import { accessTypes, otpType, RoleType } from "../../utils/enum/index.js";
import { jsonOne, setCookie, throwHttpError } from "../../utils/genrelUtils.js";
import {
  client,
  createLink,
  createVerificationToken,
  verifyVerificationToken,
} from "../../utils/helper/index.js";

//*** USER SIGNUP ***//
const signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // CHECK IF USER ALREADY EXISTS OR NOT
    if (await User.findOne({ email })) {
      return throwHttpError(
        "bad_request",
        constantMessages.user.alredyExists,
        HTTP.BAD_REQUEST
      );
    }

    // CREATE NEW USER
    await User.create({
      email,
      password,
      role: Object.values(RoleType)[2],
      name,
      accessType: Object.values(accessTypes)[0],
      status: false,
    });

    const token = await createVerificationToken(
      email,
      Object.values(otpType)[0],
      next
    );

    // SEND OTP TO EMAIL
    sendMail(
      createLink(token, "emailverification"),
      email,
      "signup",
      undefined,
      next
    );

    return jsonOne(
      res,
      HTTP.CREATED,
      {},
      constantMessages.user.verificationMailL
    );
  } catch (error) {
    next(error);
  }
};

//*** SIGNUP VERIFICATION ***//
const signupVerification = async (req, res, next) => {
  try {
    const { token } = req.body;

    const email = await verifyVerificationToken(token, next);

    // CHECK IF USER EXISTS OR NOT
    if (!(await User.findOne({ email }))) {
      return throwHttpError(
        "bad_Request",
        "Token is expired",
        HTTP.BAD_REQUEST
      );
    }

    await User.findOneAndUpdate({ email }, { status: true });

    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.user.emailVerified);
  } catch (error) {
    next(error);
  }
};

//*** USER LOGIN ***//
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    // CHECK IF USER EXISTS OR NOT
    if (!user) {
      return throwHttpError(
        "bad_request",
        constantMessages.user.invalidCredentials,
        HTTP.BAD_REQUEST
      );
    }

    if (user.accessType === Object.values(accessTypes)[1]) {
      return throwHttpError(
        "bad_request",
        constantMessages.admin.deactivate,
        HTTP.BAD_REQUEST
      );
    }

    // CHECK IF PASSWORD IS CORRECT OR NOT
    if (!(await argon2.verify(user.password, password))) {
      return throwHttpError(
        "bad_request",
        constantMessages.user.invalidCredentials,
        HTTP.BAD_REQUEST
      );
    }

    // CHECK IF USER IS NOT VERIFIED THEN SEND OTP TO EMAIL FOR VERIFICATION
    if (!user.status) {
      const token = await createVerificationToken(
        email,
        Object.values(otpType)[2],
        next
      );

      // SEND OTP TO EMAIL
      sendMail(
        createLink(token, "emailverification"),
        email,
        "emailverification",
        undefined,
        next
      );

      return jsonOne(
        res,
        HTTP.FORBIDDEN,
        {},
        constantMessages.user.emailNotVerified
      );
    }

    // GENERATE JWT TOKEN
    const token = tokenBuilder(user);

    await User.findOneAndUpdate(
      { email, _id: user._id },
      { jwtToken: (await token).accessToken },
      { new: true, runValidators: true }
    );

    // SET JWT TOKEN IN COOKIE
    setCookie(res, "user_token", (await token).accessToken);

    return jsonOne(
      res,
      HTTP.SUCCESS,
      { token: (await token).accessToken },
      constantMessages.user.loginSuccess
    );
  } catch (error) {
    next(error);
  }
};

//*** GOOGLE SIGNUP ***//
const googleSignup = async (req, res, next) => {
  try {
    const { token } = req.body;

    // VERIFY GOOGLE TOKEN AND GET USER DATA
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    // GET USER DATA FROM GOOGLE TOKEN
    const { name, email, picture, email_verified } = ticket.getPayload();

    // CHECK IF USER ALREADY EXISTS OR NOT IN DATABASE FOR GOOGLE SIGNUP
    const user = await User.findOne({ email });

    const googleUser = await GoogleUser.findOne({ email });

    if (user) {
      return throwHttpError(
        "bad_request",
        constantMessages.user.alredyRegistered,
        HTTP.BAD_REQUEST
      );
    }

    if (googleUser) {
      if (googleUser.accessType === Object.values(accessTypes)[1]) {
        return throwHttpError(
          "bad_request",
          constantMessages.admin.deactivate,
          HTTP.BAD_REQUEST
        );
      }

      // GENERATE JWT TOKEN
      const userToken = tokenBuilder(googleUser);

      // UPDATE JWT TOKEN IN DATABASE FOR USER LOGIN
      await GoogleUser.findByIdAndUpdate(
        {
          _id: googleUser._id,
          email: googleUser.email,
        },
        {
          jwtToken: (await userToken).accessToken,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      // SET JWT TOKEN IN COOKIE
      setCookie(res, "user_token", (await userToken).accessToken);

      return jsonOne(
        res,
        HTTP.SUCCESS,
        { token: (await userToken).accessToken },
        constantMessages.user.loginSuccess
      );
    }

    if (!email_verified) {
      return throwHttpError(
        "bad_request",
        constantMessages.user.notVerified,
        HTTP.BAD_REQUEST
      );
    }

    // CREATE NEW USER FOR GOOGLE SIGNUP AND GENERATE JWT TOKEN
    const googleUserData = await GoogleUser.create({
      name,
      email,
      picture,
      status: true,
      accessType: Object.values(accessTypes)[0],
      role: Object.values(RoleType)[3],
    });

    // GENERATE JWT TOKEN
    const userToken = tokenBuilder(googleUserData);

    await GoogleUser.findByIdAndUpdate(
      { _id: googleUserData._id },
      { jwtToken: (await userToken).accessToken },
      { new: true, runValidators: true }
    );

    // SET JWT TOKEN IN COOKIE
    setCookie(res, "user_token", (await userToken).accessToken);

    return jsonOne(
      res,
      HTTP.SUCCESS,
      { token: (await userToken).accessToken },
      constantMessages.user.registered
    );
  } catch (error) {
    next(error);
  }
};

//*** FORGET PASSWORD ***//
const forgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email,
      status: true,
      accessType: Object.values(accessTypes)[0],
    });

    // CHECK IF USER EXISTS OR NOT
    if (await GoogleUser.findOne({ email })) {
      return throwHttpError(
        "bad_request",
        constantMessages.user.withGoogle,
        HTTP.BAD_REQUEST
      );
    }

    if (!user) {
      return throwHttpError(
        "bad_request",
        constantMessages.user.notRegistered,
        HTTP.BAD_REQUEST
      );
    }

    const token = await createVerificationToken(
      email,
      Object.values(otpType)[1],
      next
    );

    // SEND OTP TO EMAIL
    sendMail(
      createLink(token, "newpassword"),
      email,
      "forgotpassword",
      undefined,
      next
    );

    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.user.resetPassword);
  } catch (error) {
    next(error);
  }
};

//*** CHANGE PASSWORD ***//
const changePassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const email = await verifyVerificationToken(token, next);

    // CHECK IF USER EXISTS OR NOT IF NOT THEN THROW ERROR
    if (!(await User.findOne({ email }))) {
      return throwHttpError(
        "bad_Request",
        "Token is expired",
        HTTP.BAD_REQUEST
      );
    }

    // HASH NEW PASSWORD AND UPDATE IN DATABASE
    const hashPassword = await argon2.hash(password);

    await User.findOneAndUpdate({ email }, { password: hashPassword });

    return jsonOne(
      res,
      HTTP.SUCCESS,
      {},
      constantMessages.user.passwordChangeSuccess
    );
  } catch (error) {
    next(error);
  }
};

export default {
  signup,
  login,
  googleSignup,
  changePassword,
  forgetPassword,
  signupVerification,
};
