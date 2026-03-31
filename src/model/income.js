import mongoose, { Schema, model } from "mongoose";
import { expenseType, userSchema } from "../utils/enum/index.js";

const incomeAndExpenseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "userModel",
    },
    userModel: {
      type: String,
      required: true,
      enum: Object.values(userSchema),
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(expenseType),
    },
    transactionDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const IncomeAndExpense =
  mongoose.models.Income || model("IncomeAndExpense", incomeAndExpenseSchema);

export default IncomeAndExpense;
