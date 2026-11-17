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

const { TRANG_THAI, GIAI_DOAN, GIAI_DOAN_TIEP_THEO, CAN_CU_CUONG_CHE } = HoSo;
const CCCD_REGEX = /^\d{12}$/;
const SDT_REGEX = /^0\d{9}$/;
const CITIZEN_ROLE = 0;

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

/* ================== Trang Tra cứu: thông tin và hồ sơ của một người dân ================== */
const getHoSoNguoiDan = async (req, res) => {
   const { accountId } = req.query;
   if (!mongoose.isValidObjectId(accountId)) {
      return res.status(401).json({ code: 401, message: "Vui lòng đăng nhập" });
   }

   try {
      const account = await Account.findOne({ _id: accountId, role: CITIZEN_ROLE })
         .select("userName fullname cccd phone diachi")
         .lean();
      if (!account) {
         return res.status(401).json({ code: 401, message: "Không tìm thấy tài khoản người dân, vui lòng đăng nhập lại" });
      }

      const hoso = await HoSo.find({ nguoigui: account._id })
         .select("mahoso tennguoi cccd sdt diachi noidung loaihoso trangthai giaidoan phanhoi phanhoinguoidan lichsu files assignedTo createdAt updatedAt")
         .populate("assignedTo", "fullname userName phone")
         .sort({ createdAt: -1 })
         .lean();

      res.status(200).json({ nguoidan: account, hoso });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Người dân gửi hồ sơ ================== */
// multipart: accountId (tài khoản người dân đang đăng nhập), tennguoi, cccd, sdt, diachi, noidung, loaihoso, banan
const createHoSo = async (req, res) => {
   const { accountId, cccd, sdt, noidung, loaihoso, danhmuc } = req.body;
   const tennguoi = (req.body.tennguoi || "").trim();
   const diachi = (req.body.diachi || "").trim();
   const files = req.files || [];

   const fail = (status, message) => {
      removeUploadedFiles(files);
      return res.status(status).json({ code: status, message });
   };

   if (!mongoose.isValidObjectId(accountId)) {
      return fail(401, "Vui lòng đăng nhập để gửi hồ sơ");
   }
   if (!tennguoi || !CCCD_REGEX.test(cccd || "")) {
      return fail(400, "Vui lòng nhập họ tên và CCCD (12 chữ số)");
   }
   if (!SDT_REGEX.test(sdt || "")) {
      return fail(400, "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0");
   }
   if (!diachi) {
      return fail(400, "Vui lòng nhập địa chỉ");
   }
   if (files.length === 0) {
      return fail(400, "Vui lòng đính kèm bản án");
   }

   try {
      // Lưu lại thông tin người dân vào tài khoản để hiện ở trang Tra cứu
      const account = await Account.findOneAndUpdate(
         { _id: accountId, role: CITIZEN_ROLE },
         { $set: { fullname: tennguoi, cccd, phone: sdt, diachi } }
      );
      if (!account) {
         return fail(401, "Tài khoản không phải tài khoản người dân, vui lòng đăng nhập lại");
      }

      // Mã hồ sơ do công chức nhập khi xác nhận
      await HoSo.create({
         tennguoi,
         cccd,
         sdt,
         diachi,
         nguoigui: account._id,
         noidung,
         loaihoso,
         danhmuc,
         files: files.map(toFileInfo),
         lichsu: [{ trangthai: TRANG_THAI.CHO_XAC_NHAN, ghichu: "Người dân gửi hồ sơ" }]
      });
      res.status(201).json({
         code: 201,
         message: "Gửi hồ sơ thành công. Mã hồ sơ sẽ được cấp khi cơ quan thi hành án xác nhận, "
            + "bạn có thể theo dõi ở mục Tra cứu"
      });
   } catch (error) {
      removeUploadedFiles(files);
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Công chức xác nhận hồ sơ đủ điều kiện ================== */
// Công chức nhập mã hồ sơ (body: { mahoso }) khi xác nhận
const confirmHoSo = async (req, res) => {
   const mahoso = (req.body.mahoso || "").trim();
   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Hồ sơ không hợp lệ" });
   }
   if (!HoSo.MAHOSO_REGEX.test(mahoso)) {
      return res.status(400).json({
         code: 400,
         message: "Mã hồ sơ bắt buộc, tối đa 50 ký tự, chỉ gồm chữ, số và các ký tự / . _ - (không có dấu cách)"
      });
   }

   try {
      const trung = await HoSo.exists({ mahoso, _id: { $ne: req.params.id } });
      if (trung) {
         return res.status(409).json({ code: 409, message: `Mã hồ sơ "${mahoso}" đã tồn tại, vui lòng nhập mã khác` });
      }

      const hoso = await HoSo.findOneAndUpdate(
         { _id: req.params.id, trangthai: { $in: [TRANG_THAI.CHO_XAC_NHAN, "Chưa xử lý"] } },
         {
            $set: { mahoso, trangthai: TRANG_THAI.DA_XAC_NHAN, phanhoi: "" },
            $push: {
               lichsu: { trangthai: TRANG_THAI.DA_XAC_NHAN, ghichu: `Hồ sơ đủ điều kiện, cấp mã ${mahoso}, chờ phân công` }
            }
         },
         { returnDocument: "after" }
      );
      if (!hoso) {
         return res.status(409).json({ code: 409, message: "Hồ sơ không tồn tại hoặc không ở trạng thái chờ xác nhận" });
      }
      res.status(200).json({ code: 200, message: `Đã xác nhận hồ sơ ${hoso.mahoso}, hồ sơ đã chuyển sang phân công` });
   } catch (error) {
      // Hai công chức nhập cùng một mã cùng lúc
      if (error.code === 11000) {
         return res.status(409).json({ code: 409, message: `Mã hồ sơ "${mahoso}" đã tồn tại, vui lòng nhập mã khác` });
      }
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
      res.status(200).json({ code: 200, message: `Đã gửi yêu cầu bổ sung cho hồ sơ của ${hoso.tennguoi}` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Người dân gửi bổ sung bản án ================== */
const supplementHoSo = async (req, res) => {
   const { accountId } = req.body;
   const ghichu = (req.body.ghichu || "").trim();
   const files = req.files || [];

   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(accountId)) {
      removeUploadedFiles(files);
      return res.status(400).json({ code: 400, message: "Thông tin hồ sơ hoặc tài khoản không hợp lệ" });
   }
   if (files.length === 0 && !ghichu) {
      return res.status(400).json({ code: 400, message: "Vui lòng đính kèm file hoặc nhập nội dung bổ sung" });
   }

   try {
      // Chỉ tài khoản đã gửi hồ sơ mới được bổ sung
      const hoso = await HoSo.findOneAndUpdate(
         { _id: req.params.id, nguoigui: accountId, trangthai: TRANG_THAI.CAN_BO_SUNG },
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
         return res.status(409).json({ code: 409, message: "Không tìm thấy hồ sơ cần bổ sung của tài khoản này" });
      }
      res.status(200).json({ code: 200, message: "Đã gửi bổ sung hồ sơ, vui lòng chờ công chức xác nhận" });
   } catch (error) {
      removeUploadedFiles(files);
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Người dân gửi phản hồi cho chấp hành viên ================== */
const MAX_PHAN_HOI = 1000;

const sendPhanHoi = async (req, res) => {
   const { accountId } = req.body;
   const noidung = (req.body.noidung || "").trim();
   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(accountId)) {
      return res.status(400).json({ code: 400, message: "Thông tin hồ sơ hoặc tài khoản không hợp lệ" });
   }
   if (!noidung) {
      return res.status(400).json({ code: 400, message: "Vui lòng nhập nội dung phản hồi" });
   }
   if (noidung.length > MAX_PHAN_HOI) {
      return res.status(400).json({ code: 400, message: `Nội dung phản hồi tối đa ${MAX_PHAN_HOI} ký tự` });
   }

   try {
      const hoso = await HoSo.findOne({ _id: req.params.id, nguoigui: accountId }).select("mahoso assignedTo").lean();
      if (!hoso) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy hồ sơ của tài khoản này" });
      }
      if (!hoso.assignedTo) {
         return res.status(409).json({ code: 409, message: "Hồ sơ chưa được phân công chấp hành viên, chưa gửi phản hồi được" });
      }

      await HoSo.updateOne(
         { _id: hoso._id },
         { $push: { phanhoinguoidan: { noidung, nguoinhan: hoso.assignedTo } } }
      );
      await ThongBao.create({
         nguoinhan: hoso.assignedTo,
         hoso: hoso._id,
         loai: "phanhoi",
         tieude: "Phản hồi từ người dân",
         noidung: `Hồ sơ ${hoso.mahoso}: ${noidung.length > 100 ? noidung.slice(0, 100) + "..." : noidung}`
      });

      res.status(200).json({ code: 200, message: "Đã gửi phản hồi cho chấp hành viên phụ trách" });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== CHV trả lời phản hồi của người dân ================== */
const traLoiPhanHoi = async (req, res) => {
   const { id, phanhoiId } = req.params;
   const { officerId } = req.body;
   const noidung = (req.body.noidung || "").trim();
   if (![id, phanhoiId, officerId].every(v => mongoose.isValidObjectId(v))) {
      return res.status(400).json({ code: 400, message: "Thông tin hồ sơ, phản hồi hoặc chấp hành viên không hợp lệ" });
   }
   if (!noidung) {
      return res.status(400).json({ code: 400, message: "Vui lòng nhập nội dung trả lời" });
   }
   if (noidung.length > MAX_PHAN_HOI) {
      return res.status(400).json({ code: 400, message: `Nội dung trả lời tối đa ${MAX_PHAN_HOI} ký tự` });
   }

   try {
      // Chỉ CHV đang phụ trách hồ sơ được trả lời, mỗi phản hồi trả lời một lần
      const hoso = await HoSo.findOneAndUpdate(
         {
            _id: id,
            assignedTo: officerId,
            phanhoinguoidan: { $elemMatch: { _id: phanhoiId, traloiAt: null } }
         },
         {
            $set: {
               "phanhoinguoidan.$.traloi": noidung,
               "phanhoinguoidan.$.nguoitraloi": officerId,
               "phanhoinguoidan.$.traloiAt": new Date(),
               "phanhoinguoidan.$.daxem": false
            }
         },
         { returnDocument: "after" }
      );
      if (!hoso) {
         return res.status(409).json({ code: 409, message: "Phản hồi không tồn tại, không thuộc hồ sơ của bạn hoặc đã được trả lời" });
      }

      // Đã trả lời thì thông báo phản hồi của hồ sơ này coi như đã xem
      await ThongBao.updateMany(
         { hoso: hoso._id, nguoinhan: officerId, loai: "phanhoi" },
         { $set: { daxem: true } }
      );

      res.status(200).json({ code: 200, message: `Đã trả lời phản hồi của hồ sơ ${hoso.mahoso}` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Người dân đánh dấu đã đọc câu trả lời ================== */
const xemTraLoi = async (req, res) => {
   const { accountId } = req.body;
   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(accountId)) {
      return res.status(400).json({ code: 400, message: "Thông tin hồ sơ hoặc tài khoản không hợp lệ" });
   }

   try {
      await HoSo.updateOne(
         { _id: req.params.id, nguoigui: accountId },
         { $set: { "phanhoinguoidan.$[e].daxem": true } },
         { arrayFilters: [{ "e.traloiAt": { $ne: null }, "e.daxem": false }] }
      );
      res.status(200).json({ code: 200, message: "Đã xem" });
   } catch (error) {
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
            $set: { trangthai: TRANG_THAI.DANG_XU_LY, giaidoan: GIAI_DOAN.KHOI_DONG },
            $push: {
               lichsu: {
                  trangthai: TRANG_THAI.DANG_XU_LY,
                  giaidoan: GIAI_DOAN.KHOI_DONG,
                  ghichu: "Chấp hành viên đã nhận hồ sơ" + (ghichu ? ": " + ghichu : "")
               }
            }
         },
         { returnDocument: "after" }
      );
      if (!hoso) {
         return res.status(409).json({ code: 409, message: "Hồ sơ không thuộc về bạn hoặc đã được xác minh trước đó" });
      }

      // Thông báo phân công của hồ sơ này coi như đã xem (phản hồi của người dân vẫn giữ chưa xem)
      await ThongBao.updateMany(
         { hoso: hoso._id, nguoinhan: officerId, loai: { $ne: "phanhoi" } },
         { $set: { daxem: true } }
      );

      res.status(200).json({ code: 200, message: `Đã nhận hồ sơ ${hoso.mahoso}, hồ sơ chuyển sang xử lý` });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== CHV cập nhật tiến độ thi hành án ================== */
// Chỉ đổi giai đoạn, không đổi trạng thái hồ sơ (trạng thái đổi ở "Cập nhật hồ sơ")
// Không gửi giaidoan: ghi nhận tiến độ trong giai đoạn hiện tại
// Có giaidoan: chuyển sang giai đoạn đó (phải đúng thứ tự trong GIAI_DOAN_TIEP_THEO)
// Sang Cưỡng chế: bắt buộc gửi cancu (danh sách căn cứ) và ghichu (nội dung điều kiện)
const updateTienDo = async (req, res) => {
   const { officerId, giaidoan } = req.body;
   const ghichu = (req.body.ghichu || "").trim();
   const cancu = Array.isArray(req.body.cancu) ? [...new Set(req.body.cancu)] : [];
   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(officerId)) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ hoặc chấp hành viên không hợp lệ" });
   }
   if (!giaidoan && !ghichu) {
      return res.status(400).json({ code: 400, message: "Vui lòng nhập nội dung tiến độ" });
   }
   if (giaidoan === GIAI_DOAN.CUONG_CHE) {
      if (cancu.length === 0 || !cancu.every(c => CAN_CU_CUONG_CHE.includes(c))) {
         return res.status(400).json({ code: 400, message: "Vui lòng chọn căn cứ cưỡng chế" });
      }
      if (!ghichu) {
         return res.status(400).json({ code: 400, message: "Vui lòng nhập nội dung điều kiện dẫn tới phải cưỡng chế" });
      }
   }

   try {
      const hoso = await HoSo.findOne({ _id: req.params.id, assignedTo: officerId }).lean();
      if (!hoso) {
         return res.status(404).json({ code: 404, message: "Hồ sơ không thuộc về bạn" });
      }
      if (hoso.trangthai !== TRANG_THAI.DANG_XU_LY) {
         return res.status(409).json({
            code: 409,
            message: `Hồ sơ đang ở trạng thái "${hoso.trangthai}", chỉ cập nhật tiến độ khi hồ sơ "Đang xử lý"`
         });
      }

      // Hồ sơ nhận trước khi có chức năng tiến độ được coi là đang Khởi động
      const current = hoso.giaidoan || GIAI_DOAN.KHOI_DONG;
      if (giaidoan && !GIAI_DOAN_TIEP_THEO[current].includes(giaidoan)) {
         return res.status(409).json({
            code: 409,
            message: `Không thể chuyển từ "${current}" sang "${giaidoan}"`
         });
      }

      const newGiaiDoan = giaidoan || current;
      let noiDung = ghichu;
      if (giaidoan === GIAI_DOAN.CUONG_CHE) {
         noiDung = `Chuyển sang giai đoạn Cưỡng chế. Căn cứ: ${cancu.join("; ")}. Điều kiện: ${ghichu}`;
      } else if (giaidoan) {
         noiDung = `Chuyển sang giai đoạn ${giaidoan}` + (ghichu ? ": " + ghichu : "");
      }

      const set = { giaidoan: newGiaiDoan };
      if (giaidoan === GIAI_DOAN.CUONG_CHE) {
         set.cuongche = { cancu, noidung: ghichu, thoigian: new Date() };
      }

      // Lọc theo giai đoạn hiện tại để 2 lần cập nhật cùng lúc không chuyển sai bước
      const updated = await HoSo.findOneAndUpdate(
         {
            _id: hoso._id,
            assignedTo: officerId,
            trangthai: TRANG_THAI.DANG_XU_LY,
            giaidoan: hoso.giaidoan
         },
         {
            $set: set,
            $push: { lichsu: { trangthai: hoso.trangthai, giaidoan: newGiaiDoan, ghichu: noiDung } }
         },
         { returnDocument: "after" }
      );
      if (!updated) {
         return res.status(409).json({ code: 409, message: "Hồ sơ vừa được cập nhật ở nơi khác, vui lòng tải lại" });
      }

      res.status(200).json({
         code: 200,
         message: giaidoan
            ? `Hồ sơ ${updated.mahoso} đã chuyển sang giai đoạn ${giaidoan}`
               + (giaidoan === GIAI_DOAN.KET_THUC ? `. Vào "Cập nhật hồ sơ" để chuyển trạng thái Hoàn thành` : "")
            : `Đã ghi nhận tiến độ hồ sơ ${updated.mahoso}`
      });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== CHV cập nhật nội dung và trạng thái hồ sơ ================== */
// multipart: officerId, trangthai, noidungxuly, ghichu, file tài liệu (field "banan")
// Đang xử lý <-> Tạm dừng (bắt buộc lý do); Hoàn thành chỉ khi giai đoạn đã Kết thúc
const TRANG_THAI_CAP_NHAT = [TRANG_THAI.DANG_XU_LY, TRANG_THAI.TAM_DUNG, TRANG_THAI.HOAN_THANH];

const updateHoSo = async (req, res) => {
   const { officerId, trangthai } = req.body;
   const ghichu = (req.body.ghichu || "").trim();
   const noidungxuly = (req.body.noidungxuly || "").trim();
   const files = req.files || [];

   const fail = (status, message) => {
      removeUploadedFiles(files);
      return res.status(status).json({ code: status, message });
   };

   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(officerId)) {
      return fail(400, "Mã hồ sơ hoặc chấp hành viên không hợp lệ");
   }
   if (!TRANG_THAI_CAP_NHAT.includes(trangthai)) {
      return fail(400, "Trạng thái không hợp lệ");
   }

   try {
      const hoso = await HoSo.findOne({ _id: req.params.id, assignedTo: officerId }).lean();
      if (!hoso) {
         return fail(404, "Hồ sơ không thuộc về bạn");
      }
      if (![TRANG_THAI.DANG_XU_LY, TRANG_THAI.TAM_DUNG].includes(hoso.trangthai)) {
         return fail(409, `Hồ sơ đang ở trạng thái "${hoso.trangthai}", không cập nhật được`);
      }
      if (trangthai === TRANG_THAI.HOAN_THANH && hoso.giaidoan !== GIAI_DOAN.KET_THUC) {
         return fail(409, `Chỉ chuyển "Hoàn thành" khi tiến độ đã đến giai đoạn Kết thúc (hiện tại: ${hoso.giaidoan || GIAI_DOAN.KHOI_DONG})`);
      }

      const doiTrangThai = trangthai !== hoso.trangthai;
      if (doiTrangThai && trangthai === TRANG_THAI.TAM_DUNG && !ghichu) {
         return fail(400, "Vui lòng nhập lý do tạm dừng");
      }
      if (!doiTrangThai && noidungxuly === (hoso.noidungxuly || "") && files.length === 0 && !ghichu) {
         return fail(400, "Không có thay đổi nào để lưu");
      }

      const update = { $set: { trangthai, noidungxuly } };
      if (files.length > 0) update.$push = { tailieu: { $each: files.map(toFileInfo) } };

      const noiDung = [
         doiTrangThai ? `Chuyển trạng thái từ "${hoso.trangthai}" sang "${trangthai}"` : "Cập nhật nội dung hồ sơ",
         files.length > 0 ? `đính kèm ${files.length} tài liệu` : "",
         ghichu
      ].filter(Boolean).join(". ");
      update.$push = { ...update.$push, lichsu: { trangthai, ghichu: noiDung } };

      // Lọc theo trạng thái cũ để không ghi đè thay đổi cùng lúc ở nơi khác
      const updated = await HoSo.findOneAndUpdate(
         { _id: hoso._id, assignedTo: officerId, trangthai: hoso.trangthai, giaidoan: hoso.giaidoan },
         update,
         { returnDocument: "after" }
      );
      if (!updated) {
         return fail(409, "Hồ sơ vừa được cập nhật ở nơi khác, vui lòng tải lại");
      }

      res.status(200).json({
         code: 200,
         message: doiTrangThai
            ? `Hồ sơ ${updated.mahoso} đã chuyển sang trạng thái "${trangthai}"`
            : `Đã lưu hồ sơ ${updated.mahoso}`
      });
   } catch (error) {
      removeUploadedFiles(files);
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Danh sách căn cứ cưỡng chế ================== */
const getCanCuCuongChe = (req, res) => {
   res.status(200).json(CAN_CU_CUONG_CHE);
};

module.exports = {
   getAllHoSo,
   getPendingHoSo,
   getUnassignedHoSo,
   getHoSoNguoiDan,
   createHoSo,
   confirmHoSo,
   requestSupplement,
   supplementHoSo,
   sendPhanHoi,
   traLoiPhanHoi,
   xemTraLoi,
   assignHoSo,
   getMyHoSo,
   receiveHoSo,
   updateTienDo,
   updateHoSo,
   getCanCuCuongChe
};
