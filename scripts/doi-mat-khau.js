// Đặt lại mật khẩu cho một tài khoản
// Cách dùng: node scripts/doi-mat-khau.js "<tên đăng nhập>" "<mật khẩu mới>"
require("dotenv").config({ quiet: true });
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Account = require(path.join(__dirname, "..", "models", "Account"));

const [userName, newPassword] = process.argv.slice(2);

const run = async () => {
   if (!userName || !newPassword) {
      console.log('Cách dùng: node scripts/doi-mat-khau.js "<tên đăng nhập>" "<mật khẩu mới>"');
      process.exit(1);
   }

   await mongoose.connect(process.env.MONGODB_URI, { dbName: "CSDL-THA" });

   const hashedPassword = await bcrypt.hash(newPassword, 10);
   const account = await Account.findOneAndUpdate(
      { userName: userName.normalize("NFC") },
      { $set: { password: hashedPassword } }
   );

   if (!account) {
      const all = await Account.find().select("userName").lean();
      console.log(`Không tìm thấy tài khoản "${userName}". Các tài khoản hiện có:`);
      all.forEach(a => console.log(" -", a.userName));
      process.exit(1);
   }

   console.log(`Đã đặt lại mật khẩu cho "${account.userName}" (role ${account.role}).`);
   process.exit(0);
};

run().catch(err => {
   console.error("Lỗi:", err.message);
   process.exit(1);
});
