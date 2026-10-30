import exprees from "express";
import { allString } from "../../validator/auth.validators.js";
import validate from "../../middleware/validationMiddleware.js";
import { aiController } from "../../controller/user/index.js";
import auth from "../../middleware/authMiddleware.js";

const _Router = exprees.Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

/*** GENERAL CHAT ROUTE ***/
_Router
  .route("/general_chat")
  .post(
    auth,
    validate([allString("description")]),
    aiController.general_qustion,
  );

_Router
  .route("/test_model")
  .post(
    auth,
    // validate([allString("description")]),
    aiController.testModel,
  );

export const router = _Router;
