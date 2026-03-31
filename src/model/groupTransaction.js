import mongoose, { Schema, model } from "mongoose";
import { paymentType } from "../utils/enum/index.js";

const groupTransactionSchema = new Schema(
  {
    groupExpenseId: {
      type: Schema.Types.ObjectId,
      ref: "GroupExpense",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    gets: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    owes: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(paymentType),
    },
    GroupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
  },
  { timeseries: true }
);

const GROUP_TRANSACTION =
  mongoose.models.GroupTransaction ||
  model("GroupTransaction", groupTransactionSchema);

export default GROUP_TRANSACTION;
