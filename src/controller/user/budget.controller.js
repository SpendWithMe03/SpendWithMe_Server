import mongoose from "mongoose";
import HTTP from "../../constants/httpStatusCode.js";
import constantMessages from "../../constants/messageConstants.js";
import BudgetTransaction from "../../model/budgetTransaction.js";
import IncomeAndExpense from "../../model/income.js";
import {
  expenseType,
  userSchema,
  userSchemaType,
} from "../../utils/enum/index.js";
import { jsonOne, throwHttpError } from "../../utils/genrelUtils.js";

//*** CREATE BUDGET GROUP ***//
const budget = async (req, res, next) => {
  try {
    const { category, month, AllocatedBudget } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user);

    // Extract "YYYY-MM" format from the provided date
    const monthPattern = new Date(month).toISOString().slice(5, 7); // Format as "YYYY-MM"

    // Check if a budget is already allocated for the given month and user
    const existingBudget = await BudgetTransaction.findOne({
      userId,
      category,
      $expr: {
        $eq: [
          { $dateToString: { format: "%m", date: "$month" } }, // Convert `month` field to "YYYY-MM"
          monthPattern, // Compare with the provided "YYYY-MM"
        ],
      },
    }).lean();

    if (existingBudget) {
      return throwHttpError(
        "conflict",
        constantMessages.budget.alreadyAllocated,
        HTTP.CONFLICT
      );
    }

    // Determine the correct user schema model
    const userSchemaModels = Object.values(userSchema);

    // Create new budget transaction
    const newBudget = await BudgetTransaction.create({
      category,
      userId,
      userModel:
        req.userType === Object.values(userSchemaType)[0]
          ? userSchemaModels[0]
          : userSchemaModels[1],
      month: new Date(month), // Save the full date in its original format
      AllocatedBudget,
    });

    return jsonOne(
      res,
      HTTP.SUCCESS,
      { budget: newBudget },
      constantMessages.budget.created
    );
  } catch (error) {
    next(error);
  }
};

//*** UPDATE BUDGET GROUP ***//
const updateBudget = async (req, res, next) => {
  try {
    const { category, month, AllocatedBudget } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user); // Convert once and reuse

    const monthPattern = new Date(month).toISOString().slice(5, 7); // Format as "YYYY-MM"

    // Check if the budget exists for the given user, month, and category
    const existingBudget = await BudgetTransaction.findOne({
      userId,
      $expr: {
        $eq: [
          { $dateToString: { format: "%m", date: "$month" } }, // Convert `month` field to "YYYY-MM"
          monthPattern, // Compare with the provided "YYYY-MM"
        ],
      },
      category,
    });

    if (!existingBudget) {
      return throwHttpError(
        "not_found",
        constantMessages.budget.notFound, // Add this message to your constants
        HTTP.NOT_FOUND
      );
    }

    // Update the budget
    existingBudget.AllocatedBudget = AllocatedBudget;
    await existingBudget.save();

    return jsonOne(
      res,
      HTTP.SUCCESS,
      {},
      constantMessages.budget.updated // Add this message to your constants
    );
  } catch (error) {
    next(error);
  }
};

//*** GET ALL BUDGET GROUP ***//
// const allBudget = async (req, res, next) => {
//   try {
//     const { month } = req.body;
//     const userId = new mongoose.Types.ObjectId(req.user); // Convert once and reuse

//     // Get all possible categories from expenseType
//     const allCategories = Object.values(expenseType);

//     // Extract the month from the provided date
//     const monthPattern = new Date(month).toISOString().slice(5, 7); // Extract the month (e.g., "03")

//     // Fetch all budget transactions for the given user and month (ignoring the year)
//     const budgets = await BudgetTransaction.find({
//       userId,
//       $expr: {
//         $eq: [
//           { $dateToString: { format: "%m", date: "$month" } }, // Extract only the month (e.g., "03")
//           monthPattern, // Compare with the provided month
//         ],
//       },
//     }).lean();

//     // Map budgets by category for quick lookup, excluding "Income"
//     const budgetMap = budgets.reduce((map, budget) => {
//       if (budget.category !== "Income") {
//         // Exclude "Income" category
//         map[budget.category] = budget;
//       }
//       return map;
//     }, {});

//     // Calculate spent, remaining, and status for each category
//     let totalBudget = 0;
//     let totalSpent = 0;

//     const budgetDetails = await Promise.all(
//       allCategories
//         .filter((category) => category !== "Income") // Exclude "Income" category
//         .map(async (category) => {
//           const budget = budgetMap[category] || { AllocatedBudget: 0 }; // Default to AllocatedBudget = 0 if category not found

//           // Fetch total spent for the specific category
//           const totalSpentForCategory = await IncomeAndExpense.aggregate([
//             {
//               $match: {
//                 userId,
//                 category, // Match the specific category
//                 $expr: {
//                   $eq: [
//                     {
//                       $dateToString: { format: "%m", date: "$transactionDate" },
//                     }, // Extract only the month (e.g., "03")
//                     monthPattern, // Compare with the provided month
//                   ],
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 totalSpent: { $sum: "$amount" },
//               },
//             },
//           ]);

//           const spent =
//             totalSpentForCategory.length > 0
//               ? totalSpentForCategory[0].totalSpent
//               : 0;
//           const remaining = budget.AllocatedBudget - spent;
//           const status =
//             budget.AllocatedBudget > 0
//               ? Math.round((spent / budget.AllocatedBudget) * 100)
//               : 0;

//           // Update totals
//           totalBudget += budget.AllocatedBudget;
//           totalSpent += spent;

//           return {
//             category,
//             Allocated: budget.AllocatedBudget.toLocaleString(),
//             Spent: spent.toLocaleString(),
//             Remaining: remaining.toLocaleString(),
//             Status: status,
//           };
//         })
//     );

//     // Calculate remaining and usage percentage
//     const remaining = totalBudget - totalSpent;
//     const usagePercentage =
//       totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

//     // Prepare summary data
//     const summary = {
//       TotalBudget: totalBudget.toLocaleString(),
//       Remaining: remaining.toLocaleString(),
//       Spent: totalSpent.toLocaleString(),
//       UsagePercentage: usagePercentage,
//     };

//     return jsonOne(
//       res,
//       HTTP.SUCCESS,
//       { summary, budgetDetails },
//       constantMessages.budget.fetched // Add this message to your constants
//     );
//   } catch (error) {
//     next(error);
//   }
// };

// const allBudget = async (req, res, next) => {
//   try {
//     const { month } = req.body;
//     const userId = new mongoose.Types.ObjectId(req.user); // Convert once and reuse

//     // Extract the month from the provided date
//     const monthPattern = new Date(month).toISOString().slice(5, 7); // Extract the month (e.g., "03")

//     // Fetch all categories that exist in IncomeAndExpense for the given user and month
//     const existingCategories = await IncomeAndExpense.distinct("category", {
//       userId,
//       $expr: {
//         $eq: [
//           { $dateToString: { format: "%m", date: "$transactionDate" } }, // Extract only the month (e.g., "03")
//           monthPattern, // Compare with the provided month
//         ],
//       },
//     });

//     // Exclude the "Income" category
//     const filteredCategories = existingCategories.filter(
//       (category) => category !== "Income"
//     );

//     // Fetch all budget transactions for the given user and month (ignoring the year)
//     const budgets = await BudgetTransaction.find({
//       userId,
//       category: { $in: filteredCategories }, // Include only filtered categories
//       $expr: {
//         $eq: [
//           { $dateToString: { format: "%m", date: "$month" } }, // Extract only the month (e.g., "03")
//           monthPattern, // Compare with the provided month
//         ],
//       },
//     }).lean();

//     // Map budgets by category for quick lookup
//     const budgetMap = budgets.reduce((map, budget) => {
//       map[budget.category] = budget;
//       return map;
//     }, {});

//     // Calculate spent, remaining, and status for each category
//     let totalBudget = 0;
//     let totalSpent = 0;

//     const budgetDetails = await Promise.all(
//       filteredCategories.map(async (category) => {
//         const budget = budgetMap[category] || { AllocatedBudget: 0 }; // Default to AllocatedBudget = 0 if category not found

//         // Fetch total spent for the specific category
//         const totalSpentForCategory = await IncomeAndExpense.aggregate([
//           {
//             $match: {
//               userId,
//               category, // Match the specific category
//               $expr: {
//                 $eq: [
//                   {
//                     $dateToString: { format: "%m", date: "$transactionDate" },
//                   }, // Extract only the month (e.g., "03")
//                   monthPattern, // Compare with the provided month
//                 ],
//               },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               totalSpent: { $sum: "$amount" },
//             },
//           },
//         ]);

//         const spent =
//           totalSpentForCategory.length > 0
//             ? totalSpentForCategory[0].totalSpent
//             : 0;
//         const remaining = budget.AllocatedBudget - spent;
//         const status =
//           budget.AllocatedBudget > 0
//             ? Math.round((spent / budget.AllocatedBudget) * 100)
//             : 0;

//         // Update totals
//         totalBudget += budget.AllocatedBudget;
//         totalSpent += spent;

//         return {
//           category,
//           Allocated: budget.AllocatedBudget.toLocaleString(),
//           Spent: spent.toLocaleString(),
//           Remaining: remaining.toLocaleString(),
//           Status: status,
//         };
//       })
//     );

//     // Calculate remaining and usage percentage
//     const remaining = totalBudget - totalSpent;
//     const usagePercentage =
//       totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

//     // Prepare summary data
//     const summary = {
//       TotalBudget: totalBudget.toLocaleString(),
//       Remaining: remaining.toLocaleString(),
//       Spent: totalSpent.toLocaleString(),
//       UsagePercentage: usagePercentage,
//     };

//     return jsonOne(
//       res,
//       HTTP.SUCCESS,
//       { summary, budgetDetails },
//       constantMessages.budget.fetched // Add this message to your constants
//     );
//   } catch (error) {
//     next(error);
//   }
// };

const allBudget = async (req, res, next) => {
  try {
    const { month } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user); // Convert once and reuse

    // Extract the month from the provided date
    const monthPattern = new Date(month).toISOString().slice(5, 7); // Extract the month (e.g., "03")

    // Fetch all categories that exist in IncomeAndExpense for the given user and month
    const existingCategories = await IncomeAndExpense.distinct("category", {
      userId,
      $expr: {
        $eq: [
          { $dateToString: { format: "%m", date: "$transactionDate" } }, // Extract only the month (e.g., "03")
          monthPattern, // Compare with the provided month
        ],
      },
    });

    // Fetch all budget transactions for the given user and month (ignoring the year)
    const budgets = await BudgetTransaction.find({
      userId,
      $expr: {
        $eq: [
          { $dateToString: { format: "%m", date: "$month" } }, // Extract only the month (e.g., "03")
          monthPattern, // Compare with the provided month
        ],
      },
    }).lean();

    // Combine categories from IncomeAndExpense and budgets
    const allCategories = new Set([
      ...existingCategories,
      ...budgets.map((budget) => budget.category),
    ]);

    // Exclude the "Income" category
    const filteredCategories = Array.from(allCategories).filter(
      (category) => category !== "Income"
    );

    // Map budgets by category for quick lookup
    const budgetMap = budgets.reduce((map, budget) => {
      map[budget.category] = budget;
      return map;
    }, {});

    // Calculate spent, remaining, and status for each category
    let totalBudget = 0;
    let totalSpent = 0;

    const budgetDetails = await Promise.all(
      filteredCategories.map(async (category) => {
        const budget = budgetMap[category] || { AllocatedBudget: 0 }; // Default to AllocatedBudget = 0 if category not found

        // Fetch total spent for the specific category
        const totalSpentForCategory = await IncomeAndExpense.aggregate([
          {
            $match: {
              userId,
              category, // Match the specific category
              $expr: {
                $eq: [
                  {
                    $dateToString: { format: "%m", date: "$transactionDate" },
                  }, // Extract only the month (e.g., "03")
                  monthPattern, // Compare with the provided month
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: "$amount" },
            },
          },
        ]);

        const spent =
          totalSpentForCategory.length > 0
            ? totalSpentForCategory[0].totalSpent
            : 0;
        const remaining = budget.AllocatedBudget - spent;
        const status =
          budget.AllocatedBudget > 0
            ? Math.round((spent / budget.AllocatedBudget) * 100)
            : 0;

        // Update totals
        totalBudget += budget.AllocatedBudget;
        totalSpent += spent;

        return {
          category,
          Allocated: budget.AllocatedBudget.toLocaleString(),
          Spent: spent.toLocaleString(),
          Remaining: remaining.toLocaleString(),
          Status: status,
        };
      })
    );

    // Calculate remaining and usage percentage
    const remaining = totalBudget - totalSpent;
    const usagePercentage =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Prepare summary data
    const summary = {
      TotalBudget: totalBudget.toLocaleString(),
      Remaining: remaining.toLocaleString(),
      Spent: totalSpent.toLocaleString(),
      UsagePercentage: usagePercentage,
    };

    return jsonOne(
      res,
      HTTP.SUCCESS,
      { summary, budgetDetails },
      constantMessages.budget.fetched // Add this message to your constants
    );
  } catch (error) {
    next(error);
  }
};
export default { budget, updateBudget, allBudget };
