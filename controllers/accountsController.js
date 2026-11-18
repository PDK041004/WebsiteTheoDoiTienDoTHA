const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const bcrypt = require("bcrypt");

// Không bao giờ trả mật khẩu, OTP, token về trình duyệt
const SAFE_FIELDS = "-password -otp -otpExpiry -otpAttempts -refreshToken";
const PHONE_REGEX = /^0\d{9}$/;

/* ================== Truy vấn tài khoản ================== */
// Toàn bộ
const getAllAccounts = async (req, res) => {
   try {
      const accounts = await Account.find().select(SAFE_FIELDS).sort({ createdAt: 1 }).exec();
      return res.status(200).json({ accounts });
   } catch(err) {
      return res.status(500).json({ message: err.message });
   }
};

// Một
const getAccount = async (req, res) => {
   try {
      const { userName } = req.query;
      if(!userName) return res.status(400).json({ message: "Username is required." });
      const match = await Account.findOne({ userName }).select(SAFE_FIELDS).exec();
      if(!match) return res.status(404).json({ message: "Account not found." });
      return res.status(200).json({ match });
   } catch(err) {
      return res.status(500).json({ message: err.message });
   }
};

/* ================== Tạo tài khoản ================== */
const createAccount = async (req, res) => {
   const { userName, phoneNumber, password, fullname, role } = req.body;
   if(!userName || !phoneNumber || !password) {
      return res.status(400).json({ message: "Username, phone number, and password are required." });
   }
   if(!PHONE_REGEX.test(phoneNumber)) {
      return res.status(400).json({ message: "Phone number must be 10 digits and start with 0." });
   }

   try {
      const duplicate = await Account.findOne({ userName }).exec();
      if(duplicate) return res.status(409).json({ message: "This account already exist." });

      const phoneUsed = await Account.findOne({ phoneNumber }).exec();
      if(phoneUsed) return res.status(409).json({ message: "This phone number is already used." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAccount = await Account.create({
         userName,
         phoneNumber,
         password: hashedPassword,
         fullname: fullname || "",
         role: Number(role) || 0
      });

      return res.status(201).json({
         message: `Account ${userName} registered successfully!`,
         account: { _id: newAccount._id, userName: newAccount.userName }
      });
   } catch(err) {
      return res.status(500).json({ message: err.message });
   }
};

/* ================== Cập nhật tài khoản ================== */
const updateAccount = async (req, res) => {
   const { id } = req.params;
   const { fullname, phoneNumber, role, password } = req.body;

   try {
      const account = await Account.findById(id).exec();
      if(!account) return res.status(404).json({ message: "Account not found." });

      if(phoneNumber !== undefined && phoneNumber !== account.phoneNumber) {
         if(!PHONE_REGEX.test(phoneNumber)) {
            return res.status(400).json({ message: "Phone number must be 10 digits and start with 0." });
         }
         const phoneUsed = await Account.findOne({ phoneNumber }).exec();
         if(phoneUsed) return res.status(409).json({ message: "This phone number is already used." });
         account.phoneNumber = phoneNumber;
      }
      if(fullname !== undefined) account.fullname = fullname;
      if(role !== undefined) account.role = Number(role);
      if(password) account.password = await bcrypt.hash(password, 10);

      await account.save();
      return res.status(200).json({ message: "Account updated successfully!" });
   } catch(err) {
      return res.status(500).json({ message: err.message });
   }
};

/* ================== Xóa tài khoản ================== */
const deleteAccount = async (req, res) => {
   try {
      const deleted = await Account.findByIdAndDelete(req.params.id).exec();
      if(!deleted) return res.status(404).json({ message: "Account not found." });
      return res.status(200).json({ message: "Account deleted successfully!" });
   } catch(err) {
      return res.status(500).json({ message: err.message });
   }
};

module.exports = {
   getAllAccounts,
   getAccount,
   createAccount,
   updateAccount,
   deleteAccount
};