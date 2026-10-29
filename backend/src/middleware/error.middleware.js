const errorHandler = (err , req ,res , next) =>{

    console.error(err.stack || err.message || err);

    if(res.headersSent){
        return next(err);
    }

    const statusCode =Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
    ? err.statusCode
    : 500;

    res.status(statusCode).json({
        status:"error",
        message:
        statusCode === 500
        ? "Internal server error"
        : err.message || "Request failed"
    });
}
export default errorHandler;