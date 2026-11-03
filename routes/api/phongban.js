const express = require("express");
const router = express.Router();
const path = require("path");
const phongbanController = require(path.join(__dirname, "..", "..", "controllers", "phongbanController.js"));

// Danh sách / thêm phòng ban
router.route("/")
   .get(phongbanController.getAllPhongBan)
   .post(phongbanController.createPhongBan);

// Chấp hành viên, công chức có thể xếp vào phòng ban
router.get("/nhan-vien", phongbanController.getStaff);

// Sửa / xóa phòng ban
router.route("/:id")
   .put(phongbanController.updatePhongBan)
   .delete(phongbanController.deletePhongBan);

// Thêm / gỡ nhân viên
router.post("/:id/nhan-vien", phongbanController.addMember);
router.delete("/:id/nhan-vien/:accountId", phongbanController.removeMember);

// Chọn / bỏ trưởng phòng
router.put("/:id/truong-phong", phongbanController.setTruongPhong);

module.exports = router;
