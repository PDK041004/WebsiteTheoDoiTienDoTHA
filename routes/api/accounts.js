const path = require("path");
const express = require("express");
const router = express.Router();
const accountsController = require(path.join(__dirname, "..", "..", "controllers", "accountsController"));

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

// Trang đăng ký tài khoản
router.get("/dang-ky", async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "dangky.html"));
});

module.exports = router;