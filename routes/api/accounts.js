const express = require("express");
const router = express.Router();
const path = require("path");
const accountsController = require(path.join(__dirname, "..", "..", "controllers", "accountsController.js"));

// Đăng ký tài khoản
router.route("/register")
   .get(accountsController.getRegisterForm)
   .post(accountsController.registerAccount);

// Đăng nhập
router.route("/")
   .post(accountsController.login);

module.exports = router;