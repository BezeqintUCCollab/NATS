import { RequestHandler } from "express";
import * as errors from "@bzqportal/common";
import * as tokenHandler from "../util/token-funcs";
import axios from "axios";
import demoResponse from "./demo-response";

interface ErrorWithStatus extends Error {
  statusCode: Number;
  msg: string;
}

const isAuthRequest: RequestHandler = async (req: any, res, next) => {
  let response: any = {};
  try {
    if (process.env.KUBERNETES_ENV_KEY && process.env.KUBERNETES_ENV_KEY === "yes") {
      // pod - kubernetes
      response = await axios.post("http://auth-srv:8085/isauthenticated", { params: { authorezation: req.headers.authorization } });
    } else if (process.env.NODE_ENV && (process.env.NODE_ENV == "testSqlite" || process.env.NODE_ENV == "localTestMssql")) {
      //test_env
      const authHeader = req.body.params.authorezation;
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        const verificationResult: any = tokenHandler.verifyAccessToken(token);
        if (verificationResult.type === "error") {
          verificationResult.err.statusCode = 401;
          next(verificationResult.err);
        }
        response = demoResponse;
      } else {
        const error = new Error("No token found") as ErrorWithStatus;
        //msg added for tests
        error.msg = "No token found.";
        error.statusCode = 401;
        next(error);
      }
    } else {
      //local-dev_env
      response = await axios.post("http://localhost:8085/isauthenticated", { params: { authorezation: req.headers.authorization } });
    }

    if (response.status && response.status !== 200) {
      const error: any = new Error("No token found");
      error.statusCode = 401;
      next(error);
    }
    req.user = response.data.user;
    next();
  } catch (error) {
    errors.nextError(error, next);
    //I added for the tests to return the error we received so we can check that we did get the correct error
    next(error);
    return error;
  }
};

export default isAuthRequest;
