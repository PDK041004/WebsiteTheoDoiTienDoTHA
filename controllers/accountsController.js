const path = require("path")
const Account = require(path.join(__dirname, "..", "models", "Account"));
const bcrypt = require("bcrypt");

/* ================== Show form ================== */
const getRegisterForm = async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "views", "dangky.html"));
}

/* ================== Register ================== */
const registerAccount = async (req, res) => {
   const { username, password } = req.body;
   if (!username || !password) {
      return res.status(400).json({
         code: 400,
         message: "Username and password are required"
      });
   }

   const duplicateAccount = await Account.findOne({ username: username }).exec();
   if (duplicateAccount) {
      res.status(409).json({
         code: 409,
         message: "This account already exist"});
   }

   try {
      const hashedPassword = await bcrypt.hash(password, 10)

      const newAccount = await Account.create({
         "username": username,
         "password": hashedPassword
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
      const account = await Account.findOne({ username: username }).exec();
      if (!account) {
         return res.status(404).json({ message: "Account not found" });
      }

      // Compare the provided password with the hashed password
      const isMatch = await bcrypt.compare(password, account.password);
      if (!isMatch) {
         return res.status(401).json({ message: "Invalid password" });
      }

      res.status(200).json({ message: "Login successful", role: account.role });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

module.exports = {
   getRegisterForm,
   registerAccount,
   login
};