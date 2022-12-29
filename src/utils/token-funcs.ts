import jwt from 'jsonwebtoken';
require('dotenv').config();

export const generateAccessToken = (dataToStore: any) => {
  return jwt.sign(dataToStore, process.env.ACCESS_TOKEN_SECRET as string, {expiresIn: '100m', algorithm: 'HS512'});
};

export const generateRefreshToken = (dataToStore: any) => {
  return jwt.sign(dataToStore, process.env.REFRESH_TOKEN_SECRET as string, {expiresIn: '30d', algorithm: 'HS512'});
};

export const generateResetToken = (dataToStore: any) => {
  return jwt.sign(dataToStore, process.env.RESET_TOKEN_SECRET as string, {algorithm: 'HS512'});
};

export const verifyResetToken = (token: any) => {
  return jwt.verify(token, process.env.RESET_TOKEN_SECRET as string, {algorithms: ['HS512']}, (err: any, user: any) => {
    if (err) {
      err.statusCode = 403;
      return {
        type: 'error',
        err: err,
      };
    }
    return {
      type: 'success',
      username: user.username,
      email: user.email,
    };
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, {algorithms: ['HS512']}, (err: any, user: any) => {
    if (err) {
      err.statusCode = 403;
      return {
        type: 'error',
        err: err,
      };
    }
    return {
      type: 'success',
      username: user.username,
      userId: user.userId,
      lastName: user.lastName,
      firstName: user.firstName,
      email: user.email,
      tenant: user.tenant,
      role: user.role,
      team: user.team,
      permissions: user.permissions,
    };
  });
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string, {algorithms: ['HS512']}, (err: any, user: any) => {
    if (err) {
      err.statusCode = 403;
      return {
        type: 'error',
        err: err,
      };
    }
    return {
      type: 'success',
      username: user.username,
      userId: user.userId,
      lastName: user.lastName,
      firstName: user.firstName,
      email: user.email,
      tenant: user.tenant,
      role: user.role,
      team: user.team,
      permissions: user.permissions,
    };
  });
};
