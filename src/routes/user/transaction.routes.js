import exprees from "express";
import transactionController from "../../controller/user/transaction.controller.js";
import validate from "../../middleware/validationMiddleware.js";
import { expenseT } from "../../validator/enum.validators.js";
import {
  amount,
  transactionDate,
} from "../../validator/transaction.validators.js";
import { resourceIds } from "../../validator/generalValidators.js";
import auth from "../../middleware/authMiddleware.js";

const _Router = exprees.Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

//*** INCOME ROUTE ***//
_Router
  .route("/income")
  .post(
    auth,
    validate([amount("amount"), transactionDate("transactionDate")]),
    transactionController.income
  );

//*** EXPENSE ROUTE ***//
_Router
  .route("/expense")
  .post(
    auth,
    validate([
      amount("amount"),
      expenseT(),
      transactionDate("transactionDate"),
    ]),
    transactionController.expanse
  );

//*** GET ALL TRNSACTION ***//
_Router
  .route("/totaltransaction")
  .get(
    auth,
    validate([
      resourceIds("startDate", "query"),
      resourceIds("endDate", "query"),
    ]),
    transactionController.totalTrnsaction
  );

//*** GET ALL GRAPH DATA ***//
_Router
  .route("/graph")
  .get(
    auth,
    validate([
      resourceIds("startDate", "query"),
      resourceIds("endDate", "query"),
    ]),
    transactionController.graphData
  );

export const router = _Router;
