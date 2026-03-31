import HTTP from "../../constants/httpStatusCode.js";
import constantMessages from "../../constants/messageConstants.js";
import IncomeAndExpense from "../../model/income.js";
import { userSchema, userSchemaType } from "../../utils/enum/index.js";
import mongoose from "mongoose";
import { jsonOne } from "../../utils/genrelUtils.js";

//*** ADD INCOME ***//
const income = async (req, res, next) => {
  try {
    const { amount, description = "", transactionDate } = req.body;

    // CREATE INCOME TRANSACTION
    await IncomeAndExpense.create({
      amount,
      description,
      userId: req.user,
      category: "Income",
      userModel:
        req.userType === Object.values(userSchemaType)[0]
          ? Object.values(userSchema)[0]
          : Object.values(userSchema)[1],
      transactionDate: new Date(transactionDate),
    });

    return jsonOne(
      res,
      HTTP.CREATED,
      {},
      constantMessages.transaction.incomeAdded
    );
  } catch (error) {
    next(error);
  }
};

//*** ADD EXPENSE ***//
const expanse = async (req, res, next) => {
  try {
    const { amount, description = "", category, transactionDate } = req.body;

    // CREATE EXPENSE TRANSACTION
    await IncomeAndExpense.create({
      amount,
      description,
      category,
      userId: req.user,
      userModel:
        req.userType === Object.values(userSchemaType)[0]
          ? Object.values(userSchema)[0]
          : Object.values(userSchema)[1],
      transactionDate: new Date(transactionDate),
    });

    return jsonOne(
      res,
      HTTP.CREATED,
      {},
      constantMessages.transaction.expenseAdded
    );
  } catch (error) {
    next(error);
  }
};

//*** TOTAL TRANSACTION ***//
const totalTrnsaction = async (req, res, next) => {
  try {
    // Aggregate total income and total expense
    const [incomeResult, expenseResult] = await Promise.all([
      IncomeAndExpense.aggregate([
        {
          $match: {
            $and: [
              { userId: new mongoose.Types.ObjectId(req.user) },
              { category: "Income" },
              {
                transactionDate: {
                  $gte: new Date(req.query.startDate),
                  $lte: new Date(req.query.endDate),
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: "$amount" },
          },
        },
      ]),
      IncomeAndExpense.aggregate([
        {
          $match: {
            $and: [
              { userId: new mongoose.Types.ObjectId(req.user) },
              { category: { $ne: "Income" } },
              {
                transactionDate: {
                  $gte: new Date(req.query.startDate),
                  $lte: new Date(req.query.endDate),
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // Calculate total income, expense, and remaining balance
    const Income = incomeResult.length > 0 ? incomeResult[0].totalIncome : 0;
    const Expense =
      expenseResult.length > 0 ? expenseResult[0].totalExpense : 0;
    const Remaining = Income - Expense;

    return jsonOne(res, HTTP.SUCCESS, {
      Income,
      Expense,
      Remaining,
    });
  } catch (error) {
    next(error);
  }
};

//*** GRAPH DATA ***//
const graphData = async (req, res, next) => {
  try {
    const [DayIncome, DayExpense, MonthIncome, MonthExpense, ExpenseCategory] =
      await Promise.all([
        // Aggregate total income for each day
        IncomeAndExpense.aggregate([
          {
            $match: {
              $and: [
                { userId: new mongoose.Types.ObjectId(req.user) },
                { category: "Income" },
                {
                  transactionDate: {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate),
                  },
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" },
              },
              totalIncome: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              totalIncome: 1,
            },
          },
        ]),
        // Aggregate total income for each day
        IncomeAndExpense.aggregate([
          {
            $match: {
              $and: [
                { userId: new mongoose.Types.ObjectId(req.user) },
                { category: { $ne: "Income" } },
                {
                  transactionDate: {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate),
                  },
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" },
              },
              totalIncome: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              totalIncome: 1,
            },
          },
        ]),
        // Aggregate total income for each month
        IncomeAndExpense.aggregate([
          {
            $match: {
              $and: [
                { userId: new mongoose.Types.ObjectId(req.user) },
                { category: "Income" },
                {
                  transactionDate: {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate),
                  },
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$transactionDate" },
              },
              totalIncome: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              totalIncome: 1,
            },
          },
        ]),
        IncomeAndExpense.aggregate([
          {
            $match: {
              $and: [
                { userId: new mongoose.Types.ObjectId(req.user) },
                { category: { $ne: "Income" } },
                {
                  transactionDate: {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate),
                  },
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$transactionDate" },
              },
              totalIncome: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              totalIncome: 1,
            },
          },
        ]),
        // Aggregate total expense by category
        IncomeAndExpense.aggregate([
          {
            $match: {
              $and: [
                { userId: new mongoose.Types.ObjectId(req.user) },
                { category: { $ne: "Income" } },
                {
                  transactionDate: {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate),
                  },
                },
              ],
            },
          },
          {
            $group: {
              _id: "$category",
              totalExpense: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              totalExpense: 1,
            },
          },
        ]),
      ]);

    return jsonOne(res, HTTP.SUCCESS, {
      DayIncome,
      DayExpense,
      MonthIncome,
      MonthExpense,
      ExpenseCategory,
    });
  } catch (error) {
    next(error);
  }
};
export default { expanse, income, totalTrnsaction, graphData };
