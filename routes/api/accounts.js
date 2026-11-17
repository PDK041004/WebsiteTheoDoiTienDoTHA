const path = require("path");
const express = require("express");
const router = express.Router();
const accountsController = require(path.join(__dirname, "..", "..", "controllers", "accountsController"));

// Trang quản ký tài khoản
router.get("/", async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "taikhoan.html"));
});

// Trang đăng ký tài khoản
router.get("/dang-ky", async (req, res) => {
      await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "dangky.html"));
   })

/* ================== Quản lý tài khoản hệ thống ================== */
router.route("/api")
   .get(accountsController.getAllAccounts)
   .post(accountsController.createAccount)
   .put(accountsController.updateAccount)
   .delete(accountsController.deleteAccount);

module.exports = router;