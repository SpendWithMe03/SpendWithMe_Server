import exprees from "express";
import groupController from "../../controller/user/group.controller.js";
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

//** CREATE NEW GROUP **//
_Router
  .route("/new-group")
  .post(auth, validate([allString("name")]), groupController.createGroup);

//** GET ALL GROUP **//
_Router.route("/all-group").get(auth, groupController.getAllGroup);

//** ADD MEMBER IN GROUP **//
_Router
  .route("/add-member")
  .patch(
    auth,
    validate([allString("groupCode")]),
    groupController.addMemberInGroup
  );

_Router
  .route("/add-group-expense")
  .post(
    auth,
    validate([
      mongodbId("groupId"),
      enums("expense", expenseType),
      amount("amount"),
      mongodbId("paidBy"),
      enums("splitType", splitTypes),
      reguler2("members"),
      transactionDate("date"),
    ]),
    groupController.groupExpense
  );

_Router
  .route("/all-group-expense/:groupId")
  .get(
    auth,
    validate([optionalResourceIds("groupId", "param")]),
    groupController.getAllGroupExpense
  );

_Router
  .route("/expense-details/:expenseId")
  .get(
    auth,
    validate([optionalResourceIds("expenseId", "param")]),
    groupController.expenseDitails
  );

_Router
  .route("/all-group-member/:groupId")
  .get(
    auth,
    validate([optionalResourceIds("groupId", "param")]),
    groupController.allGroupMember
  );

_Router
  .route("/all-settlement-member/:groupId")
  .get(
    auth,
    validate([optionalResourceIds("groupId", "param")]),
    groupController.settlementMemberData
  );

_Router
  .route("/settle-up")
  .post(
    auth,
    validate([reguler2("transactionId")]),
    groupController.settlement
  );

_Router
  .route("/member-expense/:groupId")
  .get(
    auth,
    validate([optionalResourceIds("groupId", "param")]),
    groupController.memberExpense
  );

_Router
  .route("/delete-group-expense")
  .post(
    auth,
    validate([mongodbId("expenseId")]),
    groupController.deleteExpense
  );

_Router
  .route("/leave-group")
  .patch(auth, validate([mongodbId("groupId")]), groupController.leaveGroup);

export const router = _Router;
