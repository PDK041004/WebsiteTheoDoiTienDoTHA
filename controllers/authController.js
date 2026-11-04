const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* ================== Đăng nhập ================== */
const handleSignIn = async (req, res) => {
   const { userName, password } = req.body;
   if (!userName || !password) {
      return res.status(400).json({ message: "Username and password are required." });
   }

   const account = await Account.findOne({ userName }).exec();
      if(!account) return res.status(401).json({ message: "Invalid password or account." });
   
      const match = await bcrypt.compare(password, account.password);
      if(match) {
         const accessToken = jwt.sign(
            { "username": account.userName },
            process.env.ACCESS_TOKEN,
            { expiresIn: "5m" }
         );

         const refreshToken = jwt.sign(
            { "username": account.userName },
            process.env.REFRESH_TOKEN,
            { expiresIn: "1d" }
         );

         account.refreshToken = refreshToken;
         await account.save();

         res.cookie("jwt", refreshToken, { httpOnly: true, sameSite: "None", /*secure: true,*/ maxAge: 24 * 60 * 60 * 1000 });

         res.json({ accessToken });

         console.log(`User "${userName}" logged in successfully!`);
      } else return res.status(401).json({ message: "Invalid password or account." });
};

module.exports = { handleSignIn };