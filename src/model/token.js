import mongoose, { Schema, model } from "mongoose";
import { otpType, tokenStatus } from "../utils/enum/index.js";

const tokenSchema = new Schema({
  token: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(otpType),
  },
  status: {
    type: String,
    enum: Object.values(tokenStatus),
  },
  expiresIn: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
});

const Token = mongoose.models.Token || model("Token", tokenSchema);

export default Token;
