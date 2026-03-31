import cookieParser from "cookie-parser";
import express from "express";
import { createServer } from "http";
import { FORNTEND_URL, PORT } from "./src/config/config.js";
import connectDB from "./src/db/dataBaseConnection.js";
import HttpError from "./src/interface/httpError.js";
import { error, info } from "./src/library/Logging.js";
import {
  decodeReqData,
  encodeResData,
} from "./src/partials/encryptionUtils.js";
import { router as userRoutes } from "./src/routes/user/index.routes.js";

const app = express();

// CONNECT DATABASE AND START SERVER
connectDB()
  .then(() => {
    info("Database connected successfully");
    startServer();
  })
  .catch((err) => {
    error(`Unable to connect to MongoDB`);
    error(err);
    process.exit(1);
  });

const startServer = async () => {
  // MIDDELWARE FOR LOGGING REQUESTS AND RESPONSES
  app.use((req, res, next) => {
    info(
      `Incoming -> Method: [${req.method}] - Url: [${req.url}] - IP: [${
        req.socket.remoteAddress
      }] - Time: [${new Date()}]`
    );

    res.on("finish", () => {
      info(
        `Finish -> Method: [${req.method}] - Url: [${req.url}] - IP: [${
          req.socket.remoteAddress
        }] - Time: [${new Date()}] - Status: [${res.statusCode}]`
      );
    });
    next();
  });
  // MIDDLEWARE FOR PARSING COOKIES AND JSON DATA
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));
  const server = createServer(app);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = FORNTEND_URL.split(",");
    if (allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }

    res.header(
      "Access-Control-Allow-Headers",
      "Origin,X-Requested-with,Content-Type,Accept,Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Expose custom headers to the frontend
    res.header("Access-Control-Expose-Headers", "X-Error-Message");

    if (req.method == "OPTIONS") {
      res.header("Access-Control-Allow-Methods", "PUT,POST,PATCH,DELETE,GET");
      return res.status(200).json({});
    }
    next();
  });

  // DECODE THE REQUEST BODY FOR EVERY REQUEST
  app.use(decodeReqData);

  // // ENCODE THE RESPONSE BODY FOR EVERY RESPONSE
  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
      const encryptedData = encodeResData(body, req, res);
      originalJson.call(res, encryptedData);
    };
    next();
  });

  app.use("/api/v1/user", userRoutes);

  // HealthCheck
  app.get("/ping", (req, res) => res.status(200).json({ message: "ping" }));
  // Handle 404 errors
  /**Router Error handling*/
  app.use((req, res, next) => {
    const err = new Error("not found");
    error(err);
    return res.status(404).json({ message: err.message });
  });

  // Handle errors thrown by controllers
  /** Handle all errors thrown by controllers and log to MongoDB */
  app.use(async function (err, req, res, next) {
    // Log the error using errorHandler module
    error(err);

    try {
      if (err instanceof HttpError) {
        return err.sendError(res);
      } else {
        return res.status(500).json({
          error: {
            title: "general_error",
            detail: "An error occurred, Please retry again later",
            code: 500,
          },
        });
      }
    } catch (error) {
      return res.status(500).json({
        error: {
          title: "general_error",
          detail: "An error occurred, Please retry again later",
          code: 500,
        },
      });
    }
  });

  // START HTTP SERVER
  server.listen(PORT, () => {
    info(`Server is running on http://localhost:${PORT}`);
  });
};
