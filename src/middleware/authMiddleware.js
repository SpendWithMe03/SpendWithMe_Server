import { extractToken, validateToken } from "../utils/authUtils.js";
import constants from "../constants/messageConstants.js";
import { removeCookie, throwHttpError } from "../utils/genrelUtils.js";
import HttpError from "../interface/httpError.js";
import HTTP from "../constants/httpStatusCode.js";
import { RoleType } from "../utils/enum/index.js";
import User from "../model/User.js";
import GoogleUser from "../model/googleUser.js";

const auth = async function (req, res, next) {
  try {
    let node_session = extractToken(req.headers.authorization);

    if (node_session.startsWith('"') && node_session.endsWith('"')) {
      node_session = node_session.slice(1, -1); // Remove the first and last character (quotes)
    }

    // Determine which cookie to check based on the request baseUrl
    let token;
    if (req.baseUrl.startsWith("/api/v1/admin")) {
      token = node_session;
    } else {
      token = node_session;
    }

    if (!token) {
      return throwHttpError(
        "unauthorized",
        constants.token.invalidAuthHeader,
        HTTP.UNAUTHORIZED
      );
    }
    // Validate the token and get the payload
    const payload = validateToken(token);

    // Check if the token type is 'access'
    if (payload["tokenType"] !== "access") {
      return throwHttpError(
        "unauthorized",
        constants.authentication.incorrectPasswordOrEmail,
        HTTP.UNAUTHORIZED
      );
    }

    // Determine the user model based on the role in the payload
    const Model = getModelByRole(payload["role"]);

    // Check if the user exists and is active
    const userExists = await Model.findById(payload["id"]);

    if (userExists.accessType === "blocked") {
      return throwHttpError(
        "unauthorized",
        constants.admin.deactivate,
        HTTP.UNAUTHORIZED
      );
    }

    if (!userExists) {
      return throwHttpError(
        "not_found",
        constants.user.notFound,
        HTTP.UNAUTHORIZED
      );
    }

    // Check if the user is deactivated
    if (!userExists.status) {
      return throwHttpError(
        "inactive_user",
        constants.admin.deactivate,
        HTTP.UNAUTHORIZED
      );
    }

    // Check if the user is deactivated
    // if (userExists.status === AccountStatus.DELETED) {
    //   return throwHttpError(
    //     "inactive_user",
    //     constants.admin.deactivate,
    //     HTTP.UNAUTHORIZED
    //   );
    // }

    // Check if the currentLoginToken is null or blank
    if (!userExists.jwtToken) {
      return throwHttpError(
        "unauthorized",
        constants.token.invalidAuthHeader,
        HTTP.UNAUTHORIZED
      );
    }

    if (userExists.jwtToken !== token) {
      return throwHttpError(
        "unauthorized",
        constants.loginAgain,
        HTTP.UNAUTHORIZED
      );
    }

    // Check if the user Role is match with  payload[role]
    if (userExists.role !== payload["role"]) {
      return throwHttpError(
        "unauthorized",
        constants.role.changeRole,
        HTTP.UNAUTHORIZED
      );
    }

    // Store payload and Model in the request for later use
    // req.tokenPayload = payload;
    // req.Model = Model;
    req.user = payload["id"];
    req.userType = payload["role"];

    next();
  } catch (e) {
    removeCookie(res, "admin_node_session");
    if (e.opts?.title === "invalid_token") {
      // Invalid token error
      next(
        new HttpError({
          title: "invalid_token",
          message: constants.token.invalidAuthHeader,
          code: HTTP.UNAUTHORIZED,
        })
      );
    } else {
      next(e);
    }
  }
};

// Helper function to get the user model based on role
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

export default auth;
