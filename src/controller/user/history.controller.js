import mongoose from "mongoose";
import HTTP from "../../constants/httpStatusCode.js";
import constantMessages from "../../constants/messageConstants.js";
import IncomeAndExpense from "../../model/income.js";
import { jsonOne, throwHttpError } from "../../utils/genrelUtils.js";
import { transactionDate } from "../../validator/transaction.validators.js";

//*** HISTORY ***//
const history = async (req, res, next) => {
  try {
    // PAGINATION LOGIC
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // FETCH HISTORY AND TOTAL DOCUMENTS
    const [history, totalDocuments] = await Promise.all([
      IncomeAndExpense.find({
        userId: new mongoose.Types.ObjectId(req.user),
        transactionDate: {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
      })
        .select("transactionDate amount category description")
        .skip(skip)
        .limit(limit),
      IncomeAndExpense.countDocuments({
        userId: new mongoose.Types.ObjectId(req.user),
        transactionDate: {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
      }),
    ]);

    // CHECK IF NO MORE RECORDS
    if (skip >= totalDocuments) {
      return throwHttpError(
        "bad_Request",
        constantMessages.transaction.noMoreRecords,
        HTTP.BAD_REQUEST
      );
    }

    // CALCULATE TOTAL PAGES
    const totalPages = Math.ceil(totalDocuments / limit);

    return jsonOne(res, HTTP.SUCCESS, { history, totalPages });
  } catch (error) {
    next(error);
  }
};

//*** UPDATE HISTORY ***//
const updateHistory = async (req, res, next) => {
  try {
    if (req.body.amount <= 0) {
      return throwHttpError(
        "bad_Request",
        "Amount must be greater than 0",
        HTTP.BAD_REQUEST
      );
    }

    const updateData = {
      amount: req.body.amount,
      description: req.body.description,
      transactionDate: req.body.transactionDate,
      category: req.body.category,
    };

    await IncomeAndExpense.findByIdAndUpdate(
      req.body._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.transaction.updated);
  } catch (error) {
    next(error);
  }
};

//*** DELETE HISTORY ***//
const deleteHistory = async (req, res, next) => {
  try {
    if (
      !(await IncomeAndExpense.findByIdAndDelete(
        new mongoose.Types.ObjectId(req.body._id)
      ))
    ) {
      return throwHttpError(
        "not_Found",
        constantMessages.transaction.notFound,
        HTTP.NOT_FOUND
      );
    }
    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.transaction.delete);
  } catch (error) {
    next(error);
  }
};

export default { history, updateHistory, deleteHistory };
