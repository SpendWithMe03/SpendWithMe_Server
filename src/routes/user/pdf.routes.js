import exprees from "express";
import pdf from "../../controller/user/pdf.controller.js";
import auth from "../../middleware/authMiddleware.js";
import validate from "../../middleware/validationMiddleware.js";
import { allString } from "../../validator/auth.validators.js";
import { mongodbId } from "../../validator/generalValidators.js";
import { amount } from "../../validator/transaction.validators.js";

const _Router = exprees.Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

_Router
  .route("/generate-pdf")
  .post(auth, validate([allString("month"), amount("year")]), pdf.generatePDF);

_Router
  .route("/generate-group-pdf")
  .post(
    auth,
    validate([mongodbId("groupId"), allString("month"), amount("year")]),
    pdf.generateGroupPDF
  );

export const router = _Router;
