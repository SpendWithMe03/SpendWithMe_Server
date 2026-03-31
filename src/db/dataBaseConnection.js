import mongoose from "mongoose";
import { DATA_BASE_URL } from "../config/config.js";

// CONNECT TO MONGODB DATABASE
const connectDB = async () => {
  return await mongoose.connect(DATA_BASE_URL);
};

export default connectDB;
