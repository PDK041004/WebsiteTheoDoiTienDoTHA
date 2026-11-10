const express = require("express");
const router = express.Router();
const path = require("path");
const baocaoController = require(path.join(__dirname, "..", "..", "controllers", "baocaoController.js"));

// Tiến độ các hồ sơ đã phân công (?phongban=&chv=&trangthai=)
router.get("/", baocaoController.getBaoCao);

// Thống kê theo tháng: hoàn thành, treo, giá trị thành tiền (?thang=YYYY-MM)
router.get("/thong-ke", baocaoController.getThongKe);

// Biểu phí thi hành án dùng để tính phiếu thu
router.get("/bieu-phi", baocaoController.getBieuPhi);

// Phiếu thu của hồ sơ đã kết thúc
router.route("/:id/phieu-thu")
   .get(baocaoController.getPhieuThu)
   .post(baocaoController.createPhieuThu);

module.exports = router;
