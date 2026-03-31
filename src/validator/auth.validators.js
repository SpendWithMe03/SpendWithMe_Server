import { body } from "express-validator";
import { otpType } from "../utils/enum/index.js";

// *** EMAIL ADDRESS ***//
const emailAddress = () => {
  return body("email")
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage("Email address is required")
    .bail()
    .isLength({
      min: 3,
      max: 100,
    })
    .withMessage("Email address must be between 3 and 100 characters")
    .bail()
    .isEmail()
    .withMessage("Email address is not valid")
    .customSanitizer((email) => {
      return email.toLowerCase();
    });
};

// *** PASSWORD ***//
const password = (field) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isLength({
      min: 8,
      max: 100,
    })
    .withMessage(`${field} must be between 8 and 100 characters`);
};

// *** OTP ***//
const otp = () => {
  return body("otp")
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage("OTP is required")
    .bail()
    .isLength({
      min: 6,
      max: 6,
    })
    .withMessage("OTP must be 6 characters")
    .bail()
    .isNumeric()
    .withMessage("OTP must be numeric");
};

// *** CATEGORY ***//
const category = () => {
  return body("category")
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage("Category is required")
    .bail()
    .isIn(Object.values(otpType))
    .withMessage("Invalid category");
};

// *** TOKEN ***//
const token = (field) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isJWT()
    .withMessage(`${field} is not valid`);
};

//*** STRINGS ***//
const allString = (field) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isString()
    .withMessage(`${field} must be a string`);
};

export { emailAddress, password, otp, category, token, allString };
