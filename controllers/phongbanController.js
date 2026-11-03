const path = require("path");
const mongoose = require("mongoose");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const PhongBan = require(path.join(__dirname, "..", "models", "PhongBan"));

// Chỉ chấp hành viên (1) và công chức (2) được xếp vào phòng ban
const STAFF_ROLES = [1, 2];

const invalidId = (res) => res.status(400).json({ code: 400, message: "Mã không hợp lệ" });

/* ================== Danh sách phòng ban kèm nhân viên ================== */
const getAllPhongBan = async (req, res) => {
   try {
      const phongban = await PhongBan.find().sort({ maphong: 1 }).lean();
      const members = await Account.find({ phongban: { $ne: null }, role: { $in: STAFF_ROLES } })
         .select("userName fullname phone role phongban")
         .lean();

      res.status(200).json(phongban.map(pb => ({
         ...pb,
         members: members
            .filter(m => String(m.phongban) === String(pb._id))
            .map(m => ({ ...m, username: m.userName, fullname: m.fullname || m.userName }))
      })));
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Danh sách nhân viên có thể xếp phòng ================== */
const getStaff = async (req, res) => {
   try {
      const staff = await Account.find({ role: { $in: STAFF_ROLES } })
         .select("userName fullname role phongban")
         .populate("phongban", "tenphong")
         .lean();
      res.status(200).json(staff.map(s => ({ ...s, username: s.userName, fullname: s.fullname || s.userName })));
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Thêm phòng ban ================== */
const createPhongBan = async (req, res) => {
   const maphong = (req.body.maphong || "").trim();
   const tenphong = (req.body.tenphong || "").trim();
   if (!maphong || !tenphong) {
      return res.status(400).json({ code: 400, message: "Vui lòng nhập mã và tên phòng ban" });
   }

   try {
      const duplicate = await PhongBan.findOne({ maphong }).lean();
      if (duplicate) {
         return res.status(409).json({ code: 409, message: `Mã phòng ban ${maphong} đã tồn tại` });
      }

      await PhongBan.create({ maphong, tenphong, mota: req.body.mota });
      res.status(201).json({ code: 201, message: `Đã thêm phòng ban ${tenphong}` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Sửa phòng ban ================== */
const updatePhongBan = async (req, res) => {
   const maphong = (req.body.maphong || "").trim();
   const tenphong = (req.body.tenphong || "").trim();
   if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
   if (!maphong || !tenphong) {
      return res.status(400).json({ code: 400, message: "Vui lòng nhập mã và tên phòng ban" });
   }

   try {
      const duplicate = await PhongBan.findOne({ maphong, _id: { $ne: req.params.id } }).lean();
      if (duplicate) {
         return res.status(409).json({ code: 409, message: `Mã phòng ban ${maphong} đã tồn tại` });
      }

      const phongban = await PhongBan.findByIdAndUpdate(
         req.params.id,
         { $set: { maphong, tenphong, mota: req.body.mota || "" } },
         { returnDocument: "after" }
      );
      if (!phongban) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy phòng ban" });
      }
      res.status(200).json({ code: 200, message: `Đã cập nhật phòng ban ${tenphong}` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Xóa phòng ban ================== */
const deletePhongBan = async (req, res) => {
   if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);

   try {
      // Không xóa phòng còn nhân viên để tránh mất thông tin bố trí nhân sự
      const memberCount = await Account.countDocuments({ phongban: req.params.id });
      if (memberCount > 0) {
         return res.status(409).json({
            code: 409,
            message: `Phòng ban còn ${memberCount} nhân viên, vui lòng chuyển hoặc gỡ nhân viên trước khi xóa`
         });
      }

      const phongban = await PhongBan.findByIdAndDelete(req.params.id);
      if (!phongban) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy phòng ban" });
      }
      res.status(200).json({ code: 200, message: `Đã xóa phòng ban ${phongban.tenphong}` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Thêm nhân viên vào phòng (chuyển phòng nếu đang ở phòng khác) ================== */
const addMember = async (req, res) => {
   const { accountId } = req.body;
   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(accountId)) return invalidId(res);

   try {
      const phongban = await PhongBan.findById(req.params.id).lean();
      if (!phongban) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy phòng ban" });
      }

      const account = await Account.findOneAndUpdate(
         { _id: accountId, role: { $in: STAFF_ROLES } },
         { $set: { phongban: phongban._id } },
         { returnDocument: "after" }
      );
      if (!account) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy chấp hành viên / công chức" });
      }

      // Chuyển sang phòng khác thì không còn là trưởng phòng cũ
      await PhongBan.updateMany(
         { truongphong: account._id, _id: { $ne: phongban._id } },
         { $set: { truongphong: null } }
      );

      res.status(200).json({
         code: 200,
         message: `Đã thêm ${account.fullname || account.userName} vào ${phongban.tenphong}`
      });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Gỡ nhân viên khỏi phòng ================== */
const removeMember = async (req, res) => {
   const { id, accountId } = req.params;
   if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(accountId)) return invalidId(res);

   try {
      const account = await Account.findOneAndUpdate(
         { _id: accountId, phongban: id },
         { $set: { phongban: null } },
         { returnDocument: "after" }
      );
      if (!account) {
         return res.status(404).json({ code: 404, message: "Nhân viên không thuộc phòng ban này" });
      }

      await PhongBan.updateOne({ _id: id, truongphong: accountId }, { $set: { truongphong: null } });

      res.status(200).json({ code: 200, message: `Đã gỡ ${account.fullname || account.userName} khỏi phòng ban` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Chọn / bỏ trưởng phòng ================== */
const setTruongPhong = async (req, res) => {
   const { accountId } = req.body;
   if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
   if (accountId !== null && !mongoose.isValidObjectId(accountId)) return invalidId(res);

   try {
      const phongban = await PhongBan.findById(req.params.id);
      if (!phongban) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy phòng ban" });
      }

      if (accountId === null) {
         phongban.truongphong = null;
         await phongban.save();
         return res.status(200).json({ code: 200, message: `Đã bỏ trưởng phòng của ${phongban.tenphong}` });
      }

      const account = await Account.findOne({ _id: accountId, phongban: phongban._id }).lean();
      if (!account) {
         return res.status(409).json({ code: 409, message: "Trưởng phòng phải là nhân viên thuộc phòng ban này" });
      }

      phongban.truongphong = account._id;
      await phongban.save();
      res.status(200).json({
         code: 200,
         message: `Đã chọn ${account.fullname || account.userName} làm trưởng phòng ${phongban.tenphong}`
      });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

module.exports = {
   getAllPhongBan,
   getStaff,
   createPhongBan,
   updatePhongBan,
   deletePhongBan,
   addMember,
   removeMember,
   setTruongPhong
};
