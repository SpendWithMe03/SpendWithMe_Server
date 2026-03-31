import mongoose, { Schema, model } from "mongoose";
import { expenseType, userSchema, userSchemaType } from "../utils/enum/index.js";

const budgetTransactionSchema = new Schema({
  category: {
    type: String,
    required: true,
    enum: Object.values(expenseType),
  },
  userId: {
    type: Schema.Types.ObjectId,
    refPatch: "userModel",
    required: true,
  },
  userModel: {
    type: String,
    enum: Object.values(userSchema),
  },
  month: {
    type: Date,
    required: true,
  },
  AllocatedBudget: {
    type: Number,
    required: true,
  },
});

const BudgetTransaction =
  mongoose.models.BudgetTransaction ||
  model("BudgetTransaction", budgetTransactionSchema);

export default BudgetTransaction;
