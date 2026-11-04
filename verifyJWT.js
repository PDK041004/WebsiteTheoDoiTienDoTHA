require("dotenv").config();
const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
   const authHeader = req.headers["authorization"];
   if(!authHeader) return res.status(401).json({ message: "Unauthorized access" });

   const token = authHeader.split(" ")[1]; // Assuming the token is passed as "Bearer <token>"
   jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if(err) return res.status(403).json({ message: "Invalid token" });
      req.user = decoded.userName; // Assuming the payload contains a 'username' field
      next();
   });
};

module.exports = verifyJWT;