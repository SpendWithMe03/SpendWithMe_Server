import mongoose, { Schema, model } from "mongoose";
import {
  expenseType,
  paymentStatusType,
  splitTypes,
  userSchema,
  
} from "../utils/enum/index.js";

const groupExpenseSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    expense: {
      type: String,
      enum: Object.values(expenseType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: Object.values(userSchema),
    },
    paymentStatus: {
      type: String,
      enum: Object.values(paymentStatusType),
    },
    description: {
      type: String,
    },
    splitType: {
      type: String,
      enum: Object.values(splitTypes),
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        required: true,
      },
    ],
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timeseries: true }
);

const GROUP_EXPENSE =
  mongoose.models.GroupExpense || model("GroupExpense", groupExpenseSchema);

export default GROUP_EXPENSE;
