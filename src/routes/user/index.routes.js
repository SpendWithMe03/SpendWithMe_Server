import { Router } from "express";
import { router as AuthRouter } from "./auth.routes.js";
import { router as TransactionRouter } from "./transaction.routes.js";
import { router as HistoryRouter } from "./history.routes.js";
import { router as ProfileRouter } from "./profile.routes.js";
import { router as GroupRouter } from "./group.routes.js";
import { router as BudgetRouter } from "./budget.routes.js";
import {router as PdfRouter} from "./pdf.routes.js"

const _Router = Router({
  strict: true,
  mergeParams: true,
  caseSensitive: true,
});

_Router.use(function (req, res, next) {
  res.setHeader("Api-Version", "v1");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

/** Health-check*/
_Router.route("/v1/health-check").get(function (req, res) {
  return res.status(200).json({ healthy: true, version: "v1" });
});

// THIS ALL ROUTER FOR --ADMIN //
_Router.use("/auth", AuthRouter);
_Router.use("/profile", ProfileRouter);
_Router.use("/group", GroupRouter);
_Router.use("/history", HistoryRouter);
_Router.use("/transaction", TransactionRouter);
_Router.use("/budget", BudgetRouter);
_Router.use("/pdf", PdfRouter);

export const router = _Router;
