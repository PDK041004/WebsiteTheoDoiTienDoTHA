const express = require("express");
const router = express.Router();
const path = require("path");
const baocaoController = require(path.join(__dirname, "..", "..", "controllers", "baocaoController.js"));

// Tiến độ các hồ sơ đã phân công (?phongban=&chv=&trangthai=&songay=)
router.get("/", baocaoController.getBaoCao);

// Thống kê theo tháng: hoàn thành, treo, giá trị thành tiền (?thang=YYYY-MM)
router.get("/thong-ke", baocaoController.getThongKe);

// Doanh thu theo khoảng thời gian, chia theo loại hồ sơ (?tu=YYYY-MM-DD&den=YYYY-MM-DD)
router.get("/doanh-thu", baocaoController.getDoanhThu);

// Doanh thu từng tháng trong năm (?nam=YYYY)
router.get("/doanh-thu/theo-thang", baocaoController.getDoanhThuTheoThang);

// Phiếu thu của hồ sơ đã kết thúc
router.route("/:id/phieu-thu")
   .get(baocaoController.getPhieuThu)
   .post(baocaoController.createPhieuThu);

module.exports = router;
