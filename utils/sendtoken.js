const {SuccessResponse,ErrorResponse} = require("../utils/common")
exports.sendtoken =  async function(user,statusCode,res) {
   const {accessToken, refreshToken } = await user.getjwttoken()
   user.refreshToken = refreshToken;
   await user.save();
   SuccessResponse.data = {user,accessToken , refreshToken}
   res.status(statusCode).json(
    {
        SuccessResponse,
    }
   )
}

