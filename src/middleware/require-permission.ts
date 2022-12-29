import { NextFunction, Response } from "express";
import * as errors from "@bzqportal/common";
import axios from "axios";
import demoResponse from "./demo-response";

const requirePermission = (requiredPermissions = "") => {
  return async (req: any, res: Response, next: NextFunction) => {
    let response: any = {};
    try {
      if (process.env.NODE_ENV && (process.env.NODE_ENV === "testSqlite" || process.env.NODE_ENV === "localTestMssql")) {
        // test_env
        response = demoResponse;
      } else if (process.env.KUBERNETES_ENV_KEY && process.env.KUBERNETES_ENV_KEY === "yes") {
         // pod - kubernetes
        response = await axios.post("http://auth-srv:8085/requirepermission", { params: { permission: requiredPermissions, user: req.user } });
      } else {
        //local - dev_env
        response = await axios.post("http://localhost:8085/requirepermission", { params: { permission: requiredPermissions, user: req.user } }); 
      }
      if (response.status && response.status !== 200) {
        const error: any = new Error("No Permission");
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
};

export default requirePermission;
