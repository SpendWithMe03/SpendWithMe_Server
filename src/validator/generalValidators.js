import { body, param, query } from "express-validator";

const resourceIds = (field, type) => {
  let validationType = null;
  switch (type) {
    case "param":
      validationType = param(field);
      break;
    case "body":
      validationType = body(field);
      break;
    case "query":
      validationType = query(field);
      break;
  }

  return validationType
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
};

/**
 * Same as `resourceIds` validator above but it's not required, it's optional
 */
const optionalResourceIds = (field, type) => {
  let validationType = null;
  switch (type) {
    case "param":
      validationType = param(field);
      break;
    case "body":
      validationType = body(field);
      break;
    case "query":
      validationType = query(field);
      break;
  }

  return validationType
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isMongoId()
    .withMessage(`${field} is not valid`);
};

const isEmail = (email) => {
  let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (email.match(regexEmail)) {
    return true;
  } else {
    return false;
  }
};

// *** CHECK IS MONGODB ID ***//
const mongodbId = (field) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ID`);
};

export { resourceIds, optionalResourceIds, isEmail, mongodbId };
