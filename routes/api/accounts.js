const path = require("path");
const express = require("express");
const router = express.Router();
const accountsController = require(path.join(__dirname, "..", "..", "controllers", "accountsController"));
const registerController = require(path.join(__dirname, "..", "..", "controllers", "registerController"));

// Trang quản lý tài khoản
router.get("/", async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "taikhoan.html"));
});

/* ================== Quản lý tài khoản hệ thống ================== */
router.route("/api")
   .get(accountsController.getAllAccounts)
   .post(accountsController.createAccount);

router.route("/api/:id")
   .put(accountsController.updateAccount)
   .delete(accountsController.deleteAccount);
/* ================== Đăng ký công khai (có xác thực OTP) ================== */
router.post("/dang-ky/gui-otp", registerController.sendRegisterOTP);
router.post("/dang-ky/xac-nhan", registerController.verifyRegisterOTP);
// Trang đăng ký tài khoản
router.get("/dang-ky", async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "dangky.html"));
});

module.exports = router;