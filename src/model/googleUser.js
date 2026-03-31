import mongoose, { Schema, model } from "mongoose";
import { accessTypes, RoleType } from "../utils/enum/index.js";

const googleUserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  picture: {
    type: String,
  },
  role: {
    type: String,
    enum: Object.values(RoleType),
    default: "",
    required: true,
  },
  status: {
    type: Boolean,
    required: [true, "Status is required"],
    default: false,
  },
  accessType: {
    type: String,
    required: true,
    enum: Object.values(accessTypes),
  },
  jwtToken: {
    type: String,
  },
});

const GoogleUser =
  mongoose.models.GoogleUser || model("GoogleUser", googleUserSchema);

export default GoogleUser;
