import exprees from "express";
import budgetController from "../../controller/user/budget.controller.js";
import auth from "../../middleware/authMiddleware.js";
import validate from "../../middleware/validationMiddleware.js";
import { expenseType, splitTypes } from "../../utils/enum/index.js";
import { allString } from "../../validator/auth.validators.js";
import { enums, reguler2 } from "../../validator/enum.validators.js";
import {
  mongodbId,
  optionalResourceIds,
} from "../../validator/generalValidators.js";
import {
  amount,
  transactionDate,
} from "../../validator/transaction.validators.js";

const _Router = exprees.Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

_Router
  .route("/new-budget")
  .post(
    auth,
    validate([
      enums("category", expenseType),
      allString("month"),
      amount("AllocatedBudget"),
    ]),
    budgetController.budget
  );

_Router
  .route("/update-budget")
  .patch(
    auth,
    validate([
      enums("category", expenseType),
      allString("month"),
      amount("AllocatedBudget"),
    ]),
    budgetController.updateBudget
  );

_Router
  .route("/all-budget-history")
  .post(auth, validate([allString("month")]), budgetController.allBudget);

export const router = _Router;
