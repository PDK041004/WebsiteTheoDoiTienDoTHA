const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));

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
         return res.status(204).json({ message: "No token to clear" });
      }
   
      account.refeshToken = null;
      await account.save();

      res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
      return res.status(204).json({ message: "Logged out successfully" });
};

module.exports = { handleSignOut };