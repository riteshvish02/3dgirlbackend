const { generatedError } = require("./error");
const {catchAsyncError} = require("./catchAsyncError")
module.exports = {
   generatedError : generatedError,
   catchAsyncError : catchAsyncError,

}