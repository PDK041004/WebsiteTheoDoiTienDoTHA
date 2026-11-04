const path = require("path")
const bcrypt = require("bcrypt");
const Account = require(path.join(__dirname, "..", "models", "Account"));

/* ================== Truy vấn tài khoản ================== */
// Toàn bộ
const getAllAccounts = async (req, res) => {
   const accounts = await Account.find().exec();
   if(!accounts) return res.status(200).json({ message: "No account was found."});
   res.status(200).json({ accounts })
}

// Một
const getAccount = async (req, res) => {
   const { userName } = req.body;

   const match = await Account.findOne({ userName }).exec();
   if(match) { res.status(200).json({ match }); }
}

/* ================== Tạo tài khoản ================== */
const createAccount = async (req, res) => {
   const { userName, phoneNumber, password, role } = req.body;
   if(!userName || !phoneNumber || !password) {
      return res.status(400).json({ message: "Username, phone number, and password are required." });
   }

   const duplicate = await Account.findOne({ userName }).exec();
   if(duplicate) { res.status(409).json({ message: "This account already exist." }); }

   try {
      const hashedPassword = await bcrypt.hash(password, 10)

      const newAccount = await Account.create({
         "userName": userName,
         "phoneNumber": phoneNumber,
         "password": hashedPassword,
         "role": role
      });

      console.log(newAccount);
      
      res.status(201).json({
         message: `Account ${userName} registered successfully!`,
         account: newAccount
      });
   } catch(err) {
      if(phoneNumber.length > 10) {
         return res.status(400).json({ message: "Phone number must be 10 digits or less." });
      }

      else {
         res.status(500).json({
            message: err.message
         });
      }
   }
};

/* ================== Cập nhật tài khoản ================== */
const updateAccount = async (req, res) => {
   const { userName, newUserName, newPhoneNumber, newPassword, newRole } = req.body;
};

module.exports = {
   getAllAccounts,
   getAccount,
   createAccount
};