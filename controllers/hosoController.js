const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const HoSo = require(path.join(__dirname, "..", "models", "HoSo"));
const ThongBao = require(path.join(__dirname, "..", "models", "ThongBao"));
const { toFileInfo } = require(path.join(__dirname, "..", "configs", "upload"));
const {
   ENFORCER_ROLE,
   MAX_HOSO_PER_ENFORCER,
   countActiveHoSo
} = require(path.join(__dirname, "enforcersController"));

const { TRANG_THAI } = HoSo;
const CCCD_REGEX = /^\d{12}$/;

// Xóa file vừa upload khi yêu cầu không hợp lệ
const removeUploadedFiles = (files = []) => {
   files.forEach(f => fs.unlink(f.path, () => {}));
};

/* ================== Danh sách hồ sơ ================== */
const getAllHoSo = async (req, res) => {
   try {
      const hoso = await HoSo.find()
         .populate("assignedTo", "userName fullname")
         .sort({ createdAt: -1 })
         .lean();
      res.status(200).json(hoso);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Hồ sơ chờ công chức xác nhận ================== */
const getPendingHoSo = async (req, res) => {
   try {
      const hoso = await HoSo.find({ trangthai: { $in: [TRANG_THAI.CHO_XAC_NHAN, "Chưa xử lý"] } })
         .sort({ updatedAt: 1 })
         .lean();
      res.status(200).json(hoso);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Hồ sơ đã xác nhận, chưa phân công ================== */
const getUnassignedHoSo = async (req, res) => {
   try {
      const hoso = await HoSo.find({ assignedTo: null, trangthai: TRANG_THAI.DA_XAC_NHAN })
         .sort({ createdAt: 1 })
         .lean();
      res.status(200).json(hoso);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Người dân tra cứu hồ sơ theo CCCD ================== */
const searchByCccd = async (req, res) => {
   const { cccd } = req.query;
   if (!CCCD_REGEX.test(cccd || "")) {
      return res.status(400).json({ code: 400, message: "CCCD phải gồm 12 chữ số" });
   }

   try {
      const hoso = await HoSo.find({ cccd })
         .select("mahoso tennguoi loaihoso trangthai phanhoi lichsu files createdAt updatedAt")
         .sort({ createdAt: -1 })
         .lean();
      res.status(200).json(hoso);
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Người dân gửi hồ sơ ================== */
const createHoSo = async (req, res) => {
   const { tennguoi, cccd, noidung, loaihoso, danhmuc } = req.body;
   const files = req.files || [];

   if (!tennguoi || !CCCD_REGEX.test(cccd || "")) {
      removeUploadedFiles(files);
      return res.status(400).json({ code: 400, message: "Vui lòng nhập họ tên và CCCD (12 chữ số)" });
   }
   if (files.length === 0) {
      return res.status(400).json({ code: 400, message: "Vui lòng đính kèm bản án" });
   }

   try {
      const hoso = await HoSo.create({
         mahoso: "HS" + Date.now(),
         tennguoi,
         cccd,
         noidung,
         loaihoso,
         danhmuc,
         files: files.map(toFileInfo),
         lichsu: [{ trangthai: TRANG_THAI.CHO_XAC_NHAN, ghichu: "Người dân gửi hồ sơ" }]
      });
      res.status(201).json({
         code: 201,
         message: `Gửi hồ sơ thành công. Mã hồ sơ của bạn: ${hoso.mahoso}`,
         mahoso: hoso.mahoso
      });
   } catch (error) {
      removeUploadedFiles(files);
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Công chức xác nhận hồ sơ đủ điều kiện ================== */
const confirmHoSo = async (req, res) => {
   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ không hợp lệ" });
   }

   try {
      const hoso = await HoSo.findOneAndUpdate(
         { _id: req.params.id, trangthai: { $in: [TRANG_THAI.CHO_XAC_NHAN, "Chưa xử lý"] } },
         {
            $set: { trangthai: TRANG_THAI.DA_XAC_NHAN, phanhoi: "" },
            $push: { lichsu: { trangthai: TRANG_THAI.DA_XAC_NHAN, ghichu: "Hồ sơ đủ điều kiện, chờ phân công" } }
         },
         { returnDocument: "after" }
      );
      if (!hoso) {
         return res.status(409).json({ code: 409, message: "Hồ sơ không tồn tại hoặc không ở trạng thái chờ xác nhận" });
      }
      res.status(200).json({ code: 200, message: `Đã xác nhận hồ sơ ${hoso.mahoso}, hồ sơ đã chuyển sang phân công` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Công chức yêu cầu người dân bổ sung ================== */
const requestSupplement = async (req, res) => {
   const phanhoi = (req.body.phanhoi || "").trim();
   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ không hợp lệ" });
   }
   if (!phanhoi) {
      return res.status(400).json({ code: 400, message: "Vui lòng nhập nội dung bản án còn thiếu" });
   }

   try {
      const hoso = await HoSo.findOneAndUpdate(
         { _id: req.params.id, trangthai: { $in: [TRANG_THAI.CHO_XAC_NHAN, "Chưa xử lý"] } },
         {
            $set: { trangthai: TRANG_THAI.CAN_BO_SUNG, phanhoi },
            $push: { lichsu: { trangthai: TRANG_THAI.CAN_BO_SUNG, ghichu: phanhoi } }
         },
         { returnDocument: "after" }
      );
      if (!hoso) {
         return res.status(409).json({ code: 409, message: "Hồ sơ không tồn tại hoặc không ở trạng thái chờ xác nhận" });
      }
      res.status(200).json({ code: 200, message: `Đã gửi yêu cầu bổ sung cho hồ sơ ${hoso.mahoso}` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Người dân gửi bổ sung bản án ================== */
const supplementHoSo = async (req, res) => {
   const { cccd } = req.body;
   const ghichu = (req.body.ghichu || "").trim();
   const files = req.files || [];

   if (!mongoose.isValidObjectId(req.params.id) || !CCCD_REGEX.test(cccd || "")) {
      removeUploadedFiles(files);
      return res.status(400).json({ code: 400, message: "Thông tin hồ sơ hoặc CCCD không hợp lệ" });
   }
   if (files.length === 0 && !ghichu) {
      return res.status(400).json({ code: 400, message: "Vui lòng đính kèm file hoặc nhập nội dung bổ sung" });
   }

   try {
      // CCCD phải khớp để người khác không bổ sung vào hồ sơ không phải của mình
      const hoso = await HoSo.findOneAndUpdate(
         { _id: req.params.id, cccd, trangthai: TRANG_THAI.CAN_BO_SUNG },
         {
            $set: { trangthai: TRANG_THAI.CHO_XAC_NHAN },
            $push: {
               files: { $each: files.map(toFileInfo) },
               lichsu: { trangthai: TRANG_THAI.CHO_XAC_NHAN, ghichu: "Người dân đã bổ sung" + (ghichu ? ": " + ghichu : "") }
            }
         },
         { returnDocument: "after" }
      );
      if (!hoso) {
         removeUploadedFiles(files);
         return res.status(409).json({ code: 409, message: "Không tìm thấy hồ sơ cần bổ sung với CCCD này" });
      }
      res.status(200).json({ code: 200, message: `Đã gửi bổ sung cho hồ sơ ${hoso.mahoso}, vui lòng chờ công chức xác nhận` });
   } catch (error) {
      removeUploadedFiles(files);
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Phân công hồ sơ cho CHV ================== */
const assignHoSo = async (req, res) => {
   const { hosoIds, officerId } = req.body;

   if (!Array.isArray(hosoIds) || hosoIds.length === 0) {
      return res.status(400).json({ code: 400, message: "Chưa chọn hồ sơ nào" });
   }
   if (!mongoose.isValidObjectId(officerId) || !hosoIds.every(id => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ hoặc chấp hành viên không hợp lệ" });
   }

   try {
      const officer = await Account.findOne({ _id: officerId, role: ENFORCER_ROLE }).lean();
      if (!officer) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy chấp hành viên" });
      }

      // Chỉ phân công những hồ sơ đã xác nhận và chưa có người xử lý
      const uniqueIds = [...new Set(hosoIds)];
      const pendingFilter = { _id: { $in: uniqueIds }, assignedTo: null, trangthai: TRANG_THAI.DA_XAC_NHAN };
      const pendingCount = await HoSo.countDocuments(pendingFilter);
      if (pendingCount === 0) {
         return res.status(409).json({ code: 409, message: "Các hồ sơ đã chọn đã được phân công hoặc chưa được xác nhận" });
      }

      const counts = await countActiveHoSo([officer._id]);
      const current = counts.get(String(officer._id)) || 0;
      const remaining = MAX_HOSO_PER_ENFORCER - current;
      if (pendingCount > remaining) {
         return res.status(409).json({
            code: 409,
            message: `Chấp hành viên ${officer.fullname || officer.userName} đang xử lý ${current}/${MAX_HOSO_PER_ENFORCER} hồ sơ, `
               + `chỉ còn nhận thêm được ${Math.max(remaining, 0)} hồ sơ (bạn chọn ${pendingCount}).`
         });
      }

      const officerName = officer.fullname || officer.userName;
      const assignedAt = new Date();
      const result = await HoSo.updateMany(pendingFilter, {
         $set: { assignedTo: officer._id, assignedAt, trangthai: TRANG_THAI.DA_PHAN_CONG },
         $push: { lichsu: { trangthai: TRANG_THAI.DA_PHAN_CONG, ghichu: `Phân công cho chấp hành viên ${officerName}` } }
      });

      // Gửi thông báo cho chấp hành viên, mỗi hồ sơ một thông báo
      const assigned = await HoSo.find({ _id: { $in: uniqueIds }, assignedTo: officer._id, assignedAt })
         .select("mahoso tennguoi loaihoso")
         .lean();
      await ThongBao.insertMany(assigned.map(hs => ({
         nguoinhan: officer._id,
         hoso: hs._id,
         tieude: "Bản án cần xử lý",
         noidung: `Hồ sơ ${hs.mahoso} - ${hs.tennguoi}${hs.loaihoso ? ` (${hs.loaihoso})` : ""}`
      })));

      res.status(200).json({
         code: 200,
         message: `Đã phân công ${result.modifiedCount} hồ sơ cho ${officerName}`,
         assignedCount: current + result.modifiedCount,
         limit: MAX_HOSO_PER_ENFORCER
      });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Hồ sơ được phân công cho một CHV ================== */
const getMyHoSo = async (req, res) => {
   const { officerId } = req.query;
   if (!mongoose.isValidObjectId(officerId)) {
      return res.status(400).json({ code: 400, message: "Mã chấp hành viên không hợp lệ" });
   }

   try {
      const hoso = await HoSo.find({ assignedTo: officerId }).sort({ assignedAt: -1 }).lean();
      res.status(200).json(hoso);
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== CHV xác minh đã nhận hồ sơ ================== */
const receiveHoSo = async (req, res) => {
   const { officerId } = req.body;
   const ghichu = (req.body.ghichu || "").trim();
   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(officerId)) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ hoặc chấp hành viên không hợp lệ" });
   }

   try {
      const hoso = await HoSo.findOneAndUpdate(
         { _id: req.params.id, assignedTo: officerId, trangthai: TRANG_THAI.DA_PHAN_CONG },
         {
            $set: { trangthai: TRANG_THAI.DANG_XU_LY },
            $push: {
               lichsu: {
                  trangthai: TRANG_THAI.DANG_XU_LY,
                  ghichu: "Chấp hành viên đã nhận hồ sơ" + (ghichu ? ": " + ghichu : "")
               }
            }
         },
         { returnDocument: "after" }
      );
      if (!hoso) {
         return res.status(409).json({ code: 409, message: "Hồ sơ không thuộc về bạn hoặc đã được xác minh trước đó" });
      }

      // Thông báo của hồ sơ này coi như đã xem
      await ThongBao.updateMany({ hoso: hoso._id, nguoinhan: officerId }, { $set: { daxem: true } });

      res.status(200).json({ code: 200, message: `Đã nhận hồ sơ ${hoso.mahoso}, hồ sơ chuyển sang xử lý` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

module.exports = {
   getAllHoSo,
   getPendingHoSo,
   getUnassignedHoSo,
   searchByCccd,
   createHoSo,
   confirmHoSo,
   requestSupplement,
   supplementHoSo,
   assignHoSo,
   getMyHoSo,
   receiveHoSo
};
