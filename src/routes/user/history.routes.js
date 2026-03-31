import exprees from "express";
import historyController from "../../controller/user/history.controller.js";
import auth from "../../middleware/authMiddleware.js";
import validate from "../../middleware/validationMiddleware.js";
import { mongodbId, resourceIds } from "../../validator/generalValidators.js";

const _Router = exprees.Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

//*** GET TRANSACTIONS HISTORY ***//
_Router
  .route("/all-history")
  .get(
    auth,
    validate([
      resourceIds("startDate", "query"),
      resourceIds("endDate", "query"),
    ]),
    historyController.history
  );

//*** UPDATE TRANSACTION HISTORY ***//
_Router
  .route("/update-history")
  .patch(auth, validate([mongodbId("_id")]), historyController.updateHistory);

_Router
  .route("/delete-history")
  .put(auth, validate([mongodbId("_id")]), historyController.deleteHistory);
export const router = _Router;
