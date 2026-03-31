import mongoose, { Schema, SchemaType, model } from "mongoose";
import { userSchema } from "../utils/enum/index.js";

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  groupCode: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  groupMembers: [
    {
      type: Schema.Types.ObjectId,
    },
  ],
  groupCreator: {
    type: Schema.Types.ObjectId,
    refPatch: "userModel",
    required: true,
  },
  userModel: {
    type: String,
    enum: Object.values(userSchema),
  },
});

const GROUP = mongoose.models.Group || model("Group", groupSchema);

export default GROUP;
