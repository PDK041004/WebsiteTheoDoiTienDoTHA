const path = require("path");
const express = require("express");
const router = express.Router();
const adminBaoCaoController = require(path.join(__dirname, "..", "..", "controllers", "adminBaoCaoController"));

// Trang báo cáo (dành cho admin)
router.get("/", (req, res) => {
   res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "baocao.html"));
});

// Dữ liệu hồ sơ theo tháng
router.get("/api", adminBaoCaoController.getHoSoTheoThang);

module.exports = router;