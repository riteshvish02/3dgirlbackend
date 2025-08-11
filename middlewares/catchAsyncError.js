exports.catchAsyncError = (func)=> (req,res,next)=> {
   Promise.resolve( func(req,res,next)).catch(next); //.catch(next) automatically passes the error to Express’s default error-handling middleware.
}

