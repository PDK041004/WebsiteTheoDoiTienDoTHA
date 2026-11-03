const express = require("express");
const router = express.Router();
const path = require("path");
const enforcersController = require(path.join(__dirname, "..", "..", "controllers", "enforcersController.js"));

// Danh sách chấp hành viên kèm số hồ sơ đang xử lý
router.get("/", enforcersController.getAllEnforcers);

module.exports = router;
