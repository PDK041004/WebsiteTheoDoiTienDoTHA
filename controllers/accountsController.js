const path = require("path")
const Account = require(path.join(__dirname, "..", "models", "Account"));
const bcrypt = require("bcrypt");
const crypto = require("crypto");
async function sendSms(phone, text) {
   console.log(`[SMS gửi tới ${phone}] ${text}`);
}

/* ================== Show form ================== */
const getRegisterForm = async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "views", "dangky.html"));
}

/* ================== Register ================== */
const registerAccount = async (req, res) => {
   const { username, password, phone, fullname } = req.body;
if (!username || !password || !/^0\d{9}$/.test(phone || "")) {
   return res.status(400).json({
      code: 400,
      message: "Thiếu thông tin hoặc số điện thoại không hợp lệ"
   });
}

   const duplicateAccount = await Account.findOne({ userName: username }).exec();
   if (duplicateAccount) {
      return res.status(409).json({
         code: 409,
         message: "This account already exist"});
   }

   try {
      const hashedPassword = await bcrypt.hash(password, 10)

      const newAccount = await Account.create({
   "userName": username,
   "password": hashedPassword,
   "phone": phone,
   "fullname": fullname
});

      console.log(newAccount);
      
      res.status(201).json({
         code: 201,
         message: `Account ${username} register successfully!`
      });
   } catch (err) {
      res.status(500).json({
         code: 500,
         message: err.message
      });
   }
};


/* ================== Login ================== */
const login = async (req, res) => {
   // Validate request body
   const { username, password } = req.body;
   if (!username || !password) {
      return res.status(400).json({
         code: 400,
         message: "Username and password are required"
      });
   }

   try {
      // Find the account by username
      const account = await Account.findOne({ userName: username }).exec();
      if (!account) {
         return res.status(404).json({ message: "Account not found" });
      }

      // Compare the provided password with the hashed password
      const isMatch = await bcrypt.compare(password, account.password);
      if (!isMatch) {
         return res.status(401).json({ message: "Invalid password" });
      }

      if (!account.phone) {
         return res.status(403).json({ message: "Tài khoản chưa có số điện thoại" });
      }
      const otp = crypto.randomInt(100000, 1000000).toString();
      account.otp = await bcrypt.hash(otp, 10);
      account.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      account.otpAttempts = 0;
      await account.save();
      await sendSms(account.phone, `Ma OTP cua ban la ${otp}. Het han sau 5 phut.`);

      res.status(200).json({
         message: "Đã gửi mã OTP về số " + "*******" + account.phone.slice(-3),
         needOtp: true
      });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};
const verifyOtp = async (req, res) => {
   const { username, otp } = req.body;
   if (!username || !otp) {
      return res.status(400).json({ message: "Thiếu tên đăng nhập hoặc OTP" });
   }
   try {
      const account = await Account.findOne({ userName: username }).exec();
      if (!account || !account.otp) {
         return res.status(400).json({ message: "Chưa yêu cầu OTP" });
      }
      if (account.otpAttempts >= 5) {
         return res.status(429).json({ message: "Nhập sai quá 5 lần, hãy đăng nhập lại" });
      }
      if (account.otpExpires < new Date()) {
         return res.status(401).json({ message: "OTP đã hết hạn" });
      }
      const ok = await bcrypt.compare(String(otp), account.otp);
      if (!ok) {
         account.otpAttempts += 1;
         await account.save();
         return res.status(401).json({ message: "OTP không đúng" });
      }
      account.otp = null;
      account.otpExpires = null;
      account.otpAttempts = 0;
      await account.save();
      res.status(200).json({ message: "Đăng nhập thành công", role: account.role });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};
module.exports = {
   getRegisterForm,
   registerAccount,
   login,
   verifyOtp
};