const path = require("path");
const mongoose = require("mongoose");
const AnPhi = require(path.join(__dirname, "..", "models", "AnPhi"));

// Kiểm tra dữ liệu gửi lên khi thêm / sửa một mức án phí
const readBody = (body) => {
   const loaihoso = (body.loaihoso || "").trim();
   const mucanphi = Number(body.mucanphi);
   const ghichu = (body.ghichu || "").trim();
   if (!loaihoso) return { error: "Vui lòng nhập loại hồ sơ" };
   if (body.mucanphi === "" || !Number.isFinite(mucanphi) || mucanphi < 0) {
      return { error: "Mức án phí phải là số không âm" };
   }
   return { data: { loaihoso, mucanphi, ghichu } };
};

/* ================== Bảng án phí ================== */
const getAnPhi = async (req, res) => {
   try {
      const list = await AnPhi.find().sort({ loaihoso: 1 }).lean();
      res.status(200).json(list);
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Thêm mức án phí ================== */
const createAnPhi = async (req, res) => {
   const { data, error } = readBody(req.body);
   if (error) return res.status(400).json({ code: 400, message: error });

   try {
      await AnPhi.create(data);
      res.status(201).json({ code: 201, message: `Đã thêm án phí cho loại "${data.loaihoso}"` });
   } catch (err) {
      if (err.code === 11000) {
         return res.status(409).json({ code: 409, message: `Loại "${data.loaihoso}" đã có trong bảng án phí` });
      }
      res.status(500).json({ code: 500, message: err.message });
   }
};

/* ================== Sửa mức án phí ================== */
const updateAnPhi = async (req, res) => {
   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Mã không hợp lệ" });
   }
   const { data, error } = readBody(req.body);
   if (error) return res.status(400).json({ code: 400, message: error });

   try {
      const anphi = await AnPhi.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: "after" });
      if (!anphi) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy mức án phí" });
      }
      res.status(200).json({ code: 200, message: `Đã cập nhật án phí loại "${anphi.loaihoso}"` });
   } catch (err) {
      if (err.code === 11000) {
         return res.status(409).json({ code: 409, message: `Loại "${data.loaihoso}" đã có trong bảng án phí` });
      }
      res.status(500).json({ code: 500, message: err.message });
   }
};

/* ================== Xóa mức án phí ================== */
const deleteAnPhi = async (req, res) => {
   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Mã không hợp lệ" });
   }

   try {
      const anphi = await AnPhi.findByIdAndDelete(req.params.id);
      if (!anphi) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy mức án phí" });
      }
      res.status(200).json({ code: 200, message: `Đã xóa án phí loại "${anphi.loaihoso}"` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Tạo bảng án phí mẫu (chỉ thêm loại chưa có) ================== */
const createMau = async (req, res) => {
   try {
      const existing = new Set((await AnPhi.find().select("loaihoso").lean()).map(a => a.loaihoso));
      const moi = AnPhi.AN_PHI_MAU.filter(a => !existing.has(a.loaihoso));
      if (moi.length > 0) await AnPhi.insertMany(moi);
      res.status(200).json({
         code: 200,
         message: moi.length > 0 ? `Đã thêm ${moi.length} mức án phí mẫu` : "Bảng án phí đã có đủ các loại mẫu"
      });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

module.exports = {
   getAnPhi,
   createAnPhi,
   updateAnPhi,
   deleteAnPhi,
   createMau
};
