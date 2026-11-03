const express = require("express");
const router = express.Router();
const path = require("path");
const thongbaoController = require(path.join(__dirname, "..", "..", "controllers", "thongbaoController.js"));

// Danh sách thông báo của một người (?nguoinhan=<id tài khoản>)
router.get("/", thongbaoController.getThongBao);

// Đánh dấu đã xem
router.put("/:id/da-xem", thongbaoController.markAsRead);

module.exports = router;
