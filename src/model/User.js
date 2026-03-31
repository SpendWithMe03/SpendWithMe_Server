import mongoose, { Schema, model } from "mongoose";
import argon2 from "argon2";
import { accessTypes, RoleType } from "../utils/enum/index.js";

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required"],
  },
  password: {
    type: String,
    select: false,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters long"],
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
  jwtToken: {
    type: String,
  },
  accessType: {
    type: String,
    required: true,
    enum: Object.values(accessTypes),
  },
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await argon2.hash(this.password);
  next();
});

const User = mongoose.models.User || model("User", UserSchema);

export default User;
