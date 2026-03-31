import jwt from "jsonwebtoken";
import HTTP from "../constants/httpStatusCode.js";
import { JWT_KEY } from "../config/config.js";
import { throwHttpError } from "./genrelUtils.js";
import User from "../model/User.js";
import GoogleUser from "../model/googleUser.js";
import { RoleType } from "./enum/index.js";

/**
 * Used to generate JWT with payload and options as parameters.
 * Payload contains the data which will be set as JWT payload.
 * Options contains JWT options
 */

const generateJWT = function (payload) {
  const defaultOptions = { expiresIn: "7d" };

  return jwt.sign(payload, JWT_KEY, Object.assign(defaultOptions));
};

/*** Validate access/refresh token */
const validateToken = function (token) {
  try {
    return jwt.verify(token, JWT_KEY);
  } catch (e) {
    return throwHttpError("invalid_token", "Invalid token", HTTP.BAD_REQUEST);
  }
};

const extractToken = function (token) {
  if (token?.startsWith("Bearer ")) {
    return token.slice(7, token.length);
  }
  return null;
};

/*** Generate Access token */
const tokenBuilder = async (data) => {
  const accessToken = generateJWT({
    id: data._id,
    role: data.role,
    tokenType: "access",
  });

  return {
    accessToken: accessToken,
    role: data.role,
    id: data._id,
  };
};

// DETEMINE THE MODEL BASED ON THE ROLE IN THE PAYLOAD AND RETURN THE MODEL
const getModelByRole = (role) => {
  switch (role) {
    case RoleType.ADMIN:
    case RoleType.SUBADMIN:
      return Admin;
    case RoleType.USER:
      return User;
    case RoleType.GOOGLEUSER:
      return GoogleUser;
    default:
      return throwHttpError(
        "unauthorized",
        constants.token.invalidAuthHeader,
        HTTP.UNAUTHORIZED
      );
  }
};

export {
  generateJWT,
  validateToken,
  extractToken,
  tokenBuilder,
  getModelByRole,
};
