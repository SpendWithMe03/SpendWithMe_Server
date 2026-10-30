import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import {
  GEMINI_API_KEY,
  CLIENT_URL,
  GOOGLE_CLIENT_ID,
  EMBEDDING_MODEL_NAME,
} from "../../config/config.js";
import User from "../../model/User.js";
import Token from "../../model/token.js";
import { expenseType, tokenStatus } from "../enum/index.js";
import mongoose from "mongoose";
import IncomeAndExpense from "../../model/income.js";

// CREATE GOOGLE GENAI OBJECT FOR AI FUNCTIONALITY
const AI = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

// CREATE GOOGLE CLIENT OBJECT FOR AUTHENTICATION AND AUTHORIZATION OF GOOGLE SIGNUP AND LOGIN
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

//*** CREATE RANDOM TOKEN ***//
const createRandomToken = (length = 64) => {
  return crypto.randomBytes(length).toString("hex");
};

//*** CREATE GROUP CODE ***//
const createGroupCode = (length = 6) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

//*** CREATE VERIFICATION TOKEN ***//
const createVerificationToken = async (email, type, next) => {
  try {
    // Generate a random token
    const token = createRandomToken();

    // Calculate the expiration date
    const expiresIn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save the token to the ForgotPassword model
    await Token.create({
      token,
      type,
      status: Object.values(tokenStatus)[0],
      expiresIn,
      email,
    });

    return token;
  } catch (error) {
    next(error);
  }
};

//*** VERIFY VERIFICATION TOKEN ***//
const verifyVerificationToken = async (token, next) => {
  try {
    const verificationToken = await Token.findOne({
      token,
      status: Object.values(tokenStatus)[0],
    });

    // CHECK IF THE TOKEN IS VALID OR EXPIRED
    if (!verificationToken || verificationToken.expiresIn < new Date()) {
      return null;
    }

    // UPDATE THE STATUS OF THE TOKEN TO DELETED
    await Token.findByIdAndUpdate(
      { _id: verificationToken._id },
      { status: Object.values(tokenStatus)[1] },
      { new: true, runValidators: true },
    );

    return verificationToken.email;
  } catch (error) {
    next(error);
  }
};

//*** CREATE LINK FOR VERIFICATION ***
const createLink = (token, type) => {
  return `${CLIENT_URL}/${type}?token=${token}`;
};

const getModelByRole = async (_id) => {
  if (await User.findById(_id)) {
    return "User";
  } else {
    return "GoogleUser";
  }
};

// CONVERT STRING TO VALID DATE OBJECT
function parseDate(value) {
  if (typeof value !== "string") return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

async function generateEmbedding(text) {
  const result = await AI.models.embedContent({
    model: EMBEDDING_MODEL_NAME,
    contents: text,
    config: {
      outputDimensionality: 768,
      title: "Expense Tracker Data",
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  return result.embeddings[0].values;
}

// GENERATE DATABASE QUERY FOR EXPENSES BASED ON USER INPUT
async function queryExpenses(args, authenticatedUserId) {
  const {
    mode,
    startDate,
    endDate,
    category,
    minAmount,
    maxAmount,
    groupBy,
    sortBy,
    sortOrder,
    limit,
  } = args;

  // 1. Validate query mode.
  if (!["summary", "transactions"].includes(mode)) {
    return { error: "Unsupported query mode." };
  }

  // 2. Validate category against your actual categories.
  const allowedCategories = Object.values(expenseType).filter(
    (category) => category !== "Income",
  );

  if (
    category !== undefined &&
    (typeof category !== "string" || !allowedCategories.includes(category))
  ) {
    return {
      error: "Invalid category.",
      allowedCategories,
    };
  }

  // 3. Validate amounts.
  if (
    minAmount !== undefined &&
    (typeof minAmount !== "number" ||
      !Number.isFinite(minAmount) ||
      minAmount < 0)
  ) {
    return { error: "Invalid minimum amount." };
  }

  if (
    maxAmount !== undefined &&
    (typeof maxAmount !== "number" ||
      !Number.isFinite(maxAmount) ||
      maxAmount < 0)
  ) {
    return { error: "Invalid maximum amount." };
  }

  if (
    minAmount !== undefined &&
    maxAmount !== undefined &&
    minAmount > maxAmount
  ) {
    return { error: "Minimum amount cannot exceed maximum amount." };
  }

  // 4. Validate dates.
  const start = startDate === undefined ? null : parseDate(startDate);
  const end = endDate === undefined ? null : parseDate(endDate);

  if ((startDate !== undefined && !start) || (endDate !== undefined && !end)) {
    return {
      error: "Invalid date. Use YYYY-MM-DD format.",
    };
  }

  if (start && end && start >= end) {
    return { error: "End date must be after start date." };
  }

  // 5. Validate grouping and sorting.
  if (
    groupBy !== undefined &&
    !["category", "month", "none"].includes(groupBy)
  ) {
    return { error: "Unsupported grouping." };
  }

  if (sortBy !== undefined && !["transactionDate", "amount"].includes(sortBy)) {
    return { error: "Unsupported sort field." };
  }

  if (sortOrder !== undefined && !["asc", "desc"].includes(sortOrder)) {
    return { error: "Unsupported sort order." };
  }

  // 6. Convert authenticated user ID to ObjectId.
  if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
    return { error: "Invalid authenticated user ID." };
  }

  const userId = new mongoose.Types.ObjectId(authenticatedUserId);

  // 7. Build a secure MongoDB filter.
  // Always use the authenticated user's ID.
  const filter = { userId };

  if (start || end) {
    filter.transactionDate = {};

    if (start) {
      filter.transactionDate.$gte = start;
    }

    // End date is exclusive.
    if (end) {
      filter.transactionDate.$lt = end;
    }
  }

  if (category) {
    filter.category = category;
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    filter.amount = {};

    if (minAmount !== undefined) {
      filter.amount.$gte = minAmount;
    }

    if (maxAmount !== undefined) {
      filter.amount.$lte = maxAmount;
    }
  }

  // 8. Return matching transactions.
  if (mode === "transactions") {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const direction = sortOrder === "asc" ? 1 : -1;
    const field = sortBy || "transactionDate";

    const transactions = await IncomeAndExpense.find(filter)
      .sort({ [field]: direction, _id: -1 })
      .limit(safeLimit)
      .select("amount description category transactionDate")
      .lean();

    return {
      type: "transactions",
      count: transactions.length,
      transactions,
    };
  }

  // 9. Calculate totals using MongoDB aggregation.
  const grouping = groupBy || "category";

  let groupId;

  if (grouping === "category") {
    groupId = "$category";
  } else if (grouping === "month") {
    groupId = {
      $dateToString: {
        format: "%Y-%m",
        date: "$transactionDate",
      },
    };
  } else {
    groupId = null;
  }

  const results = await IncomeAndExpense.aggregate([
    { $match: filter },
    {
      $group: {
        _id: groupId,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 100 },
  ]);

  if (grouping === "none") {
    return {
      type: "summary",
      total: results[0]?.total ?? 0,
      count: results[0]?.count ?? 0,
    };
  }

  return {
    type: "summary",
    groupedBy: grouping,
    results,
  };
}

// QUERY INCOME BASED ON USER INPUT
async function queryIncome(args, authenticatedUserId) {
  const {
    mode = "summary",
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy = "transactionDate",
    sortOrder = "desc",
    limit = 50,
  } = args;

  // Validate authenticated user ID
  if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
    throw new Error("Invalid user ID");
  }

  // Only allow supported query options
  if (!["summary", "transactions"].includes(mode)) {
    throw new Error("Invalid query mode");
  }

  if (!["transactionDate", "amount"].includes(sortBy)) {
    throw new Error("Invalid sort field");
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    throw new Error("Invalid sort order");
  }

  // Always restrict results to the logged-in user
  const filter = {
    userId: new mongoose.Types.ObjectId(authenticatedUserId),
    category: "Income",
  };

  // Filter by start date
  if (startDate) {
    const start = new Date(startDate);

    if (Number.isNaN(start.getTime())) {
      throw new Error("Invalid start date");
    }

    filter.transactionDate = {
      ...filter.transactionDate,
      $gte: start,
    };
  }

  // Filter by end date (inclusive calendar date)
  if (endDate) {
    const end = new Date(endDate);

    if (Number.isNaN(end.getTime())) {
      throw new Error("Invalid end date");
    }

    // If the input is YYYY-MM-DD, include the entire day
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      end.setUTCDate(end.getUTCDate() + 1);
    }

    filter.transactionDate = {
      ...filter.transactionDate,
      $lt: end,
    };
  }

  // Filter by amount
  if (minAmount !== undefined) {
    if (typeof minAmount !== "number" || minAmount < 0) {
      throw new Error("Invalid minimum amount");
    }

    filter.amount = {
      ...filter.amount,
      $gte: minAmount,
    };
  }

  if (maxAmount !== undefined) {
    if (typeof maxAmount !== "number" || maxAmount < 0) {
      throw new Error("Invalid maximum amount");
    }

    filter.amount = {
      ...filter.amount,
      $lte: maxAmount,
    };
  }

  if (
    minAmount !== undefined &&
    maxAmount !== undefined &&
    minAmount > maxAmount
  ) {
    throw new Error("Minimum amount cannot exceed maximum amount");
  }

  // Return income summary
  if (mode === "summary") {
    const [summary] = await IncomeAndExpense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          averageIncome: { $avg: "$amount" },
          highestIncome: { $max: "$amount" },
          lowestIncome: { $min: "$amount" },
        },
      },
    ]);

    return {
      type: "income_summary",
      totalIncome: summary?.totalIncome ?? 0,
      totalTransactions: summary?.totalTransactions ?? 0,
      averageIncome: summary?.averageIncome ?? 0,
      highestIncome: summary?.highestIncome ?? 0,
      lowestIncome: summary?.lowestIncome ?? 0,
    };
  }

  // Return individual income transactions
  const safeLimit = Math.min(
    Math.max(Number.isInteger(limit) ? limit : 50, 1),
    100,
  );

  const transactions = await IncomeAndExpense.find(filter)
    .sort({
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    })
    .limit(safeLimit)
    .select("amount description category transactionDate")
    .lean();

  return {
    type: "income_transactions",
    count: transactions.length,
    transactions,
  };
}

// Describe the generic tool to Gemini.
const tools = [
  {
    functionDeclarations: [
      {
        name: "queryExpenses",
        description: `
          Query the authenticated user's expense records.

          Use mode summary for spending totals, category
          breakdowns, comparisons, budgets, and saving advice.

          Use mode transactions for matching transaction details.

          Choose date boundaries, category filters, amount filters,
          grouping, sorting, and result limit based on the question.

          Date format is YYYY-MM-DD. The end date is exclusive.
          Omit dates to query all available history.

          For questions about reducing spending, normally analyze
          the most recent three complete months or another
          relevant period supported by the user's question.

          Call this tool when personal expense information is needed.
          Do not call it for unrelated general questions.
        `,
        parameters: {
          type: Type.OBJECT,
          properties: {
            mode: {
              type: Type.STRING,
              enum: ["summary", "transactions"],
              description: "Whether to calculate totals or list records.",
            },
            startDate: {
              type: Type.STRING,
              description: "Optional inclusive start date, YYYY-MM-DD.",
            },
            endDate: {
              type: Type.STRING,
              description: "Optional exclusive end date, YYYY-MM-DD.",
            },
            category: {
              type: Type.STRING,
              description: "Optional exact expense category.",
            },
            minAmount: {
              type: Type.NUMBER,
              description: "Optional minimum transaction amount.",
            },
            maxAmount: {
              type: Type.NUMBER,
              description: "Optional maximum transaction amount.",
            },
            groupBy: {
              type: Type.STRING,
              enum: ["category", "month", "none"],
              description: "How to group summary results.",
            },
            sortBy: {
              type: Type.STRING,
              enum: ["date", "amount"],
              description: "Transaction sorting field.",
            },
            sortOrder: {
              type: Type.STRING,
              enum: ["asc", "desc"],
              description: "Ascending or descending sort order.",
            },
            limit: {
              type: Type.INTEGER,
              description: "Maximum number of transactions, up to 50.",
            },
          },
          required: ["mode"],
        },
      },
    ],
  },
];

export {
  AI,
  client,
  tools,
  queryExpenses,
  generateEmbedding,
  queryIncome,
  createGroupCode,
  parseDate,
  createLink,
  createVerificationToken,
  getModelByRole,
  verifyVerificationToken,
};
