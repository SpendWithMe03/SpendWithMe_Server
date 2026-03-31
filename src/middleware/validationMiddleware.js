import { validationResult } from "express-validator";
import HTTP from "../constants/httpStatusCode.js";

const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      await validation.run(req);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = errors.array()[0]; // Get the first error
        if (error.path === "admin_node_session") {
          // If the error is related to authorization, return 401 status code
          return res.status(HTTP.UNAUTHORIZED).json({
            title: error.path,
            message: error.msg,
            code: HTTP.UNAUTHORIZED,
            status: false,
          });
        } else {
          // For other errors, return the usual 422 status code
          return res.status(HTTP.UNPROCESSABLE_ENTITY).json({
            title: error.path,
            message: error.msg,
            code: HTTP.UNPROCESSABLE_ENTITY,
            status: false,
          });
        }
      }
    }
    return next(); // If all validations pass, continue to the next middleware
  };
};
export default validate;
