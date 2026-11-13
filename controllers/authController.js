const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator")
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
         // const accessToken = jwt.sign(
         //    { "userName": account.userName },
         //    process.env.ACCESS_TOKEN,
         //    { expiresIn: "5m" }
         // );

         // const refreshToken = jwt.sign(
         //    { "userName": account.userName },
         //    process.env.REFRESH_TOKEN,
         //    { expiresIn: "1d" }
         // );

         // account.refreshToken = refreshToken;
         // await account.save();

         // res.cookie("jwt", refreshToken, { httpOnly: true, sameSite: "None", secure: true, maxAge: 24 * 60 * 60 * 1000 });

         // console.log(`User "${userName}" has signed in successfully!`);

         // res.status(200).json({ accessToken: accessToken, message: "Sign-in successful!", role: account.role });

/* ================== Ứng dụng OTP ================== */
         const otp = await otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
         });
         account.otp = await bcrypt.hash(otp, 10);
         account.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
         account.otpAttempts = 0;
         await account.save();

         console.log(`User "${userName}"'s OTP: ${otp}`);

         res.status(200).json({
            message: `An OTP has been sent to your phone number (*******${account.phoneNumber.slice(-3)})`,
            role: account.role,
            requireOTP: true
         });
      } else return res.status(401).json({ message: "Invalid password or account." });
};

const verifyOTP = async (req, res) => {
   const { userName, otp } = req.body;
   if(!userName || !otp) return res.status(401).json({ message: "Missing required fields."});

   try {
      const account = await Account.findOne({ userName }).exec();

      if (account.otpExpires < new Date()) {
         return res.status(401).json({ message: "OTP expired." });
      }

      const match = await bcrypt.compare(String(otp), account.otp);
      if(!match) {
         account.otpAttempts += 1;
         await account.save();
         return res.status(401).json({ message: "OTP is incorrect." });
      }

      account.otp = null;
      account.otpExpiry = null;
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

      res.cookie("jwt", refreshToken, { httpOnly: true, sameSite: "None", secure: true, maxAge: 24 * 60 * 60 * 1000 });

      console.log(`User "${userName}" has signed in successfully!`);

      res.status(200).json({ accessToken: accessToken, message: "Sign-in successful!", role: account.role });
   } catch(error) {
      res.status(500).json({ message: error.message });
   }
}

module.exports = {
   handleSignIn,
   verifyOTP
};