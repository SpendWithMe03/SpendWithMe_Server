import exprees from "express";
import profileController from "../../controller/user/profile.controller.js";
import auth from "../../middleware/authMiddleware.js";

const _Router = exprees.Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

//*** GET PROFILE DATA ***//
_Router.route("/profile-data").get(auth, profileController.profileData);

//*** UPDATE PROFILE ***//
_Router.route("/update-profile").patch(auth, profileController.updateProfile);

export const router = _Router;
