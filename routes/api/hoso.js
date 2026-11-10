const express = require("express");
const router = express.Router();
const path = require("path");
const hosoController = require(path.join(__dirname, "..", "..", "controllers", "hosoController.js"));
const { uploadBanAn } = require(path.join(__dirname, "..", "..", "configs", "upload.js"));

// Danh sách hồ sơ / người dân gửi hồ sơ kèm bản án
router.route("/")
   .get(hosoController.getAllHoSo)
   .post(uploadBanAn, hosoController.createHoSo);

// Người dân tra cứu hồ sơ theo CCCD
router.get("/tra-cuu", hosoController.searchByCccd);

// Hồ sơ chờ công chức xác nhận
router.get("/cho-xac-nhan", hosoController.getPendingHoSo);

// Hồ sơ đã xác nhận, chưa phân công
router.get("/chua-phan-cong", hosoController.getUnassignedHoSo);

// Công chức phân công hồ sơ cho chấp hành viên
router.put("/phan-cong", hosoController.assignHoSo);

// Hồ sơ được phân công cho một chấp hành viên (?officerId=<id>)
router.get("/cua-toi", hosoController.getMyHoSo);

// Công chức xác nhận / yêu cầu bổ sung
router.put("/:id/xac-nhan", hosoController.confirmHoSo);
router.put("/:id/yeu-cau-bo-sung", hosoController.requestSupplement);

// Chấp hành viên xác minh đã nhận hồ sơ
router.put("/:id/nhan-ho-so", hosoController.receiveHoSo);

// Căn cứ được chọn khi chuyển sang giai đoạn Cưỡng chế
router.get("/can-cu-cuong-che", hosoController.getCanCuCuongChe);

// Chấp hành viên cập nhật tiến độ / chuyển giai đoạn thi hành án
router.put("/:id/tien-do", hosoController.updateTienDo);

// Chấp hành viên cập nhật nội dung, trạng thái, tài liệu hồ sơ
router.put("/:id/cap-nhat", uploadBanAn, hosoController.updateHoSo);

// Người dân gửi bổ sung bản án
router.put("/:id/bo-sung", uploadBanAn, hosoController.supplementHoSo);

module.exports = router;
