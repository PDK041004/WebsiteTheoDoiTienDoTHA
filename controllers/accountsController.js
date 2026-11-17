const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const bcrypt = require("bcrypt");
const { match } = require("assert");

/* ================== Truy vấn tài khoản ================== */
// Toàn bộ
const getAllAccounts = async (req, res) => {
   const accounts = await Account.find().exec();
   if(!accounts) return res.status(200).json({ message: "No account was found."});
   return res.status(200).json({ accounts })
}

// Một
const getAccount = async (req, res) => {
   const { userName } = req.body;

   const match = await Account.findOne({ userName }).exec();
   if(match) { return res.status(200).json({ match }); }
}

/* ================== Tạo tài khoản ================== */
const createAccount = async (req, res) => {
   const { userName, phoneNumber, password, role } = req.body;
   if(!userName || !phoneNumber || !password) {
      return res.status(400).json({ message: "Username, phone number, and password are required." });
   }

   const duplicate = await Account.findOne({ userName }).exec();
   if(duplicate) { return res.status(409).json({ message: "This account already exist." }); }

   try {
      const hashedPassword = await bcrypt.hash(password, 10)

      const newAccount = await Account.create({
         "userName": userName,
         "phoneNumber": phoneNumber,
         "password": hashedPassword,
         "role": role
      });

      console.log(newAccount);
      
      return res.status(201).json({
         message: `Account "${userName}" registered successfully!`,
         account: newAccount
      });
   } catch(err) {
      if(phoneNumber.length > 10) {
         return res.status(400).json({ message: "Phone number must be 10 digits or less." });
      }
      else {
         return res.status(500).json({
            message: err.message
         });
      }
   }
};

/* ================== Cập nhật tài khoản ================== */
const updateAccount = async (req, res) => {
   const { _id, userName, phoneNumber, role } = req.body;
   if(!_id) return res.status(400).json({ message: "No ID was given." });

   try {
      await Account.updateOne({ _id }, { userName, phoneNumber, role }).exec();

      res.status(200).json({ message: "Account information updated successfully!" });
   } catch(error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Thay đổi mật khẩu ================== */
const changePassword = async (req, res) => {
   const { _id, oldPassword, newPassword } = req.body;
   if(!_id) return res.status(400).json({ message: "No ID was given." });

   const account = await Account.findOne({ _id }).exec();
   if(!account) return res.status(401).json({ message: "This acccount cannot be found." });

   const match = await bcrypt.compare(oldPassword, account.password);
   if(match) {
      await Account.updateOne({ _id }, { password: newPassword }).exec();

      res.status(200).json({ message: "Account password updated successfully!" });
   } else return res.status(401).json({ message: "Incorrect password." });
};

/* ================== Xóa tài khoản ================== */
const deleteAccount = async (req, res) => {
   const { _id } = req.body;
   if(!_id) return res.status(400).json({ message: "No ID was given." });

   const account = await Account.findOne({ _id }).exec();
   if(!account) return res.status(401).json({ message: "This acccount cannot be found." });

   try {
      await Account.deleteOne({ _id }).exec();
      res.status(200).json({ message: "Account deleted successfully." });
   } catch(error) {
      res.status(500).json({ message: error.message });
   }
}

module.exports = {
   getAllAccounts,
   getAccount,
   createAccount,
   updateAccount,
   deleteAccount
};