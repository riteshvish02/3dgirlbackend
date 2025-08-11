const { ErrorResponse, SuccessResponse } = require("../utils/common");
const { StatusCodes } = require("http-status-codes");

exports.generatedError = (err, req, res, next) => {
  console.log(err);
  
  if (err.code === 11000) {
    err.message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err.statusCode = StatusCodes.BAD_REQUEST;
  }

  // Wrong MongoDB ID error
  if (err.name === "CastError") {
    err.message = `Resource not found. Invalid: ${err.path}`;
    err.statusCode = StatusCodes.NOT_FOUND;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    err.message = messages.join(", ");
    err.statusCode = StatusCodes.BAD_REQUEST;
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    err.message = "Invalid token. Please log in again.";
    err.statusCode = StatusCodes.UNAUTHORIZED;
  }

  // JWT expired error
  if (err.name === "TokenExpiredError") {
    err.message = "Your token has expired. Please log in again.";
    err.statusCode = StatusCodes.UNAUTHORIZED;
  }
  ErrorResponse.error = err;
  ErrorResponse.message = err.message;
  res.status(err.statusCode || 500).json({
    ErrorResponse,
  });
  next();
};
