const path = require("path");
const express = require("express");
const router = express.Router();
const controller = require(path.join(__dirname, "..", "..", "controllers", "adminPhieuThuController"));
const views = path.join(__dirname, "..", "..", "views");

/* ================== Lập phiếu thu ================== */
router.get("/phieu-thu", (req, res) => res.status(200).sendFile(path.join(views, "lapphieuthu.html")));
router.get("/phieu-thu/api", controller.getHoSoChoLapPhieu);
router.post("/phieu-thu/api/:id", controller.createPhieuThu);

/* ================== Báo cáo doanh thu ================== */
router.get("/doanh-thu", (req, res) => res.status(200).sendFile(path.join(views, "doanhthu.html")));
router.get("/doanh-thu/api", controller.getDoanhThu);

module.exports = router;