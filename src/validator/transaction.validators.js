import { body } from "express-validator";

//*** AMOUNT ***//
const amount = (field) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isNumeric()
    .withMessage(`${field} must be numeric`)
    .isLength({ min: 1 })
    .withMessage(`${field} must be greater than 0`);
};

//*** TRANSACTION DATE ***//
const transactionDate = (field) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} Date is required`)
    .bail()
    .isString()
    .withMessage(`${field} must be string`);
};
export { amount, transactionDate };
