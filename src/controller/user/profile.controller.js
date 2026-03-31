import mongoose from "mongoose";
import HTTP from "../../constants/httpStatusCode.js";
import constantMessages from "../../constants/messageConstants.js";
import { getModelByRole } from "../../utils/authUtils.js";
import { jsonOne } from "../../utils/genrelUtils.js";

//*** PROFILE DATA ***//
const profileData = async (req, res, next) => {
  try {
    // GET MODEL BY ROLE TYPE
    const Model = getModelByRole(req.userType);

    const userData = await Model.findById(
      new mongoose.Types.ObjectId(req.user)
    ).select("name email");

    return jsonOne(res, HTTP.SUCCESS, userData);
  } catch (error) {
    next(error);
  }
};

//** UPDATE PROFILE **//
const updateProfile = async (req, res, next) => {
  try {
    const Model = getModelByRole(req.userType);

    await Model.findByIdAndUpdate(
      new mongoose.Types.ObjectId(req.user),
      { $set: { name: req.body.name } },
      { new: true, runValidators: true }
    );

    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.profile.updated);
  } catch (error) {
    next(error);
  }
};

export default { profileData, updateProfile };
