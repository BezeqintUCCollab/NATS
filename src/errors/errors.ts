import { Result, ValidationError } from "express-validator";

export const validErrors = (errors:Result<ValidationError>) => {

    if (!errors.isEmpty()) {
        const msg = errors.array().map((err:any) => err.msg);
        const error:any = new Error(msg.join('\n'));
        error.data = errors.array();
        error.statusCode = 422
        throw error;
    }
}

export const nextError = (error:any, next:any) => {
    if (!error.statusCode) {
        error.statusCode = 500;
    }
    next(error);
    //I added for the tests to return the error we received so we can check that we did get the correct error
    return error
}