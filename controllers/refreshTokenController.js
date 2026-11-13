const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const jwt = require("jsonwebtoken");

const handleRefreshToken = async (req, res) => {
   const cookies = req.cookies;
   if(!cookies?.jwt) return res.status(401).json({ message: "Unauthorized" });
   const refreshToken = cookies.jwt;

   const account = await Account.findOne({ refreshToken }).exec();
   if(!account) return res.status(403).json({ message: "Forbidden" });

   //Kiểm tra refreshToken có hợp lệ không
   jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN,
      (err, decoded) => {
         if(err || account.userName !== decoded.userName) return res.status(403).json({ message: "Forbidden" });
         const role = Object.values(account.role);
         const accessToken = jwt.sign(
            {
               "info":{
                  "userName": decoded.userName,
                  "role": role
               }
            },
            process.env.ACCESS_TOKEN,
            { expiresIn: "5m"}
         );

         res.status(200).json({ accessToken });
      }
   );
}

module.exports = { handleRefreshToken };