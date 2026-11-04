const path = require("path");
const express = require("express");
const router = express.Router();
const accountsController = require(path.join(__dirname, "..", "..", "controllers", "accountsController.js"));


router.get("/", async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "taikhoan.html"));
});

/* ================== Quản lý tài khoản hệ thống ================== */
router.route("/api")
   .get(accountsController.getAllAccounts)
   .post(accountsController.createAccount);

   
//Đăng ký tài khoản
router.route("/dang-ky")
   .get(async (req, res) => {
      await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "dangky.html"));
   })

module.exports = router;