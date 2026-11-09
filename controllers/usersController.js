const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const bcrypt = require("bcrypt");

const roleToNumber = {
   "Admin": 3,
   "Công chức": 2,
   "Chấp hành viên": 1,
   "Người dân": 0
};
const numberToRole = ["Người dân", "Chấp hành viên", "Công chức", "Admin"];

/* ================== Danh sách tài khoản ================== */
const getAllAccounts = async (req, res) => {
   try {
      const accounts = await Account.find().select("-password").exec();
      const result = accounts.map(a => ({
         id: a._id,
         username: a.userName,
         fullname: a.fullname,
         phone: a.phone,
         role: numberToRole[a.role] ?? "Người dân"
      }));
      res.status(200).json(result);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Thêm tài khoản ================== */
const addAccount = async (req, res) => {
   const { username, password, fullname, phone, role } = req.body;
   if (!username || !password) {
      return res.status(400).json({ message: "Thiếu tên đăng nhập hoặc mật khẩu" });
   }

   const duplicate = await Account.findOne({ userName:username }).exec();
   if (duplicate) {
      return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });
   }

   try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await Account.create({
   userName: username,
   password: hashedPassword,
   fullname,
   phone,
   role: roleToNumber[role] ?? 0
});
      res.status(201).send("Thêm thành công");
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Sửa tài khoản ================== */
const updateAccount = async (req, res) => {
   const { fullname, phone, role } = req.body;
try {
   await Account.findByIdAndUpdate(req.params.id, {
      fullname,
      phone,
      role: roleToNumber[role] ?? 0
   }).exec();
      res.send("Đã cập nhật");
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Xóa tài khoản ================== */
const deleteAccount = async (req, res) => {
   try {
      await Account.findByIdAndDelete(req.params.id).exec();
      res.send("Đã xóa");
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

module.exports = { getAllAccounts, addAccount, updateAccount, deleteAccount };