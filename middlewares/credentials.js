const path = require("path");
const allowedOrigins = require(path.join(__dirname, "..", "configs", "allowedOrigins"));

const credentials = (req, res, next) => {
    const origin = req.headers.origin;
    if(allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Credentials", true);
    }
    next();
}

module.exports = credentials;