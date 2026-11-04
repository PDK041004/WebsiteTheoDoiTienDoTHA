const path = require("path");
const express = require("express");
const router = express.Router();
const authController = require(path.join(__dirname, "..", "..", "controllers", "authController"));

/* ================== Đăng nhập ================== */
router.post("/", authController.handleSignIn);

module.exports = router;