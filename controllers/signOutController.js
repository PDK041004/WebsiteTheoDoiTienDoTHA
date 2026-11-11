const Account = require("../models/Account");

/* ================== Đăng xuất ================== */
const handleSignOut = async (req, res) => {
   // Xóa cookie jwt nếu có
   const cookies = req.cookies;
   if(!cookies?.jwt) return res.status(204).json({ message: "No token to clear" });
   const refreshToken = cookies.jwt;

   // Xóa refreshToken khỏi cơ sở dữ liệu
   const account = await Account.findOne({ refreshToken }).exec();
   if(!account) {
         res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
         return res.status(200).json({ message: "No token to clear" });
      }
   
      account.refreshToken = null;
      await account.save();

      console.log(`User "${account.userName}" has signed out successfully!`);

      res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
      return res.status(200).json({ message: "Sign-out successful!" });
};

module.exports = { handleSignOut };