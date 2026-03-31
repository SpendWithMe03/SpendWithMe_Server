import { body } from "express-validator";
import { expenseType } from "../utils/enum/index.js";

//*** EXPENSE TYPE ***//
const expenseT = () => {
  return body("category")
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage("Category is required")
    .bail()
    .isIn(Object.values(expenseType))
    .withMessage("Invalid category");
};

const reguler = (field) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail();
};

const reguler2 = (field) => {
  return body(field).notEmpty().withMessage(`${field} is required`);
};

// *** ALL ENUM VALIDATORS ***//
const enums = (field, eum) => {
  return body(field)
    .trim()
    .escape()
    .exists()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isIn(Object.values(eum))
    .withMessage(`${field} must be ${Object.values(eum)}`);
};

export { expenseT, enums, reguler , reguler2};
