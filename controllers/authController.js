const Account = require("../models/Account");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* ================== Đăng nhập ================== */
const handleSignIn = async (req, res) => {
   const { userName, password } = req.body;
   if (!userName || !password) {
      return res.status(400).json({ "message": "Username and password are required." });
   }

   const account = await Account.findOne({ userName }).exec();
      if(!account) return res.status(401).json({ "message": "Invalid password or account." });
   
      const match = await bcrypt.compare(password, account.password);
      if(match) {
         const accessToken = jwt.sign(
            { "userName": account.userName },
            process.env.ACCESS_TOKEN,
            { expiresIn: "5m" }
         );

         const refreshToken = jwt.sign(
            { "userName": account.userName },
            process.env.REFRESH_TOKEN,
            { expiresIn: "1d" }
         );

         account.refreshToken = refreshToken;
         await account.save();

         res.cookie("jwt", refreshToken, { httpOnly: true, sameSite: "None", /*secure: true,*/ maxAge: 24 * 60 * 60 * 1000 });

         console.log(`User "${userName}" has signed in successfully!`);

         res.status(200).json({ accessToken: accessToken, message: "Sign-in successful!", role: account.role });
      } else return res.status(401).json({ message: "Invalid password or account." });
};

module.exports = { handleSignIn };