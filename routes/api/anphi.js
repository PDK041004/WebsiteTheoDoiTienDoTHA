const express = require("express");
const router = express.Router();
const path = require("path");
const anphiController = require(path.join(__dirname, "..", "..", "controllers", "anphiController.js"));

// Bảng án phí theo loại hồ sơ
router.route("/")
   .get(anphiController.getAnPhi)
   .post(anphiController.createAnPhi);

// Thêm các mức án phí mẫu còn thiếu
router.post("/mau", anphiController.createMau);

router.route("/:id")
   .put(anphiController.updateAnPhi)
   .delete(anphiController.deleteAnPhi);

module.exports = router;
