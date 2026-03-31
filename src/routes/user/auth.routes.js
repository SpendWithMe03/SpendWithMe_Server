import exprees from "express";
import authController from "../../controller/user/auth.controller.js";
import validate from "../../middleware/validationMiddleware.js";
import {
  emailAddress,
  allString,
  password,
  token,
} from "../../validator/auth.validators.js";

const _Router = exprees.Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

/*** SIGNUP ROUTE ***/
_Router
  .route("/signup")
  .post(
    validate([emailAddress(), password("password"), allString("name")]),
    authController.signup
  );

/*** LOGIN ROUTE ***/
_Router
  .route("/login")
  .post(validate([emailAddress(), password("password")]), authController.login);

/*** GOOGLE SIGNUP ROUTE ***/
_Router
  .route("/google-signup")
  .post(validate([allString("token")]), authController.googleSignup);

/*** FORGET PASSWORD ROUTE ***/
_Router
  .route("/forgot-password")
  .post(validate([emailAddress()]), authController.forgetPassword);

_Router
  .route("/signup-verification")
  .post(validate([allString("token")]), authController.signupVerification);

/*** CHANGE PASSWORD ROUTE ***/
_Router
  .route("/change-password")
  .patch(
    validate([allString("token"), password("password")]),
    authController.changePassword
  );

export const router = _Router;
