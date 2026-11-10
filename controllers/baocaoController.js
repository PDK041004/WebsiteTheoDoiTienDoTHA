const path = require("path");
const mongoose = require("mongoose");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const HoSo = require(path.join(__dirname, "..", "models", "HoSo"));
const PhieuThu = require(path.join(__dirname, "..", "models", "PhieuThu"));
require(path.join(__dirname, "..", "models", "PhongBan")); // Đăng ký model để populate phòng ban
const { ENFORCER_ROLE } = require(path.join(__dirname, "enforcersController"));

const { TRANG_THAI, GIAI_DOAN } = HoSo;
const NO_PHONGBAN = "none";
const HINH_THUC = ["Tiền mặt", "Chuyển khoản"];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ================== Báo cáo tiến độ hồ sơ đã phân công ================== */
// ?phongban=<id|none>&chv=<tên chấp hành viên>&trangthai=<trạng thái>
const getBaoCao = async (req, res) => {
   const { phongban, trangthai } = req.query;
   const chv = (req.query.chv || "").trim();
   if (phongban && phongban !== NO_PHONGBAN && !mongoose.isValidObjectId(phongban)) {
      return res.status(400).json({ code: 400, message: "Phòng ban không hợp lệ" });
   }

   try {
      const filter = { assignedTo: { $ne: null } };
      if (trangthai) filter.trangthai = trangthai;

      // Lọc theo phòng ban / tên chấp hành viên: tìm chấp hành viên phù hợp trước
      if (phongban || chv) {
         const accountFilter = { role: ENFORCER_ROLE };
         if (phongban) accountFilter.phongban = phongban === NO_PHONGBAN ? null : phongban;
         if (chv) {
            const regex = new RegExp(escapeRegex(chv), "i");
            accountFilter.$or = [{ fullname: regex }, { userName: regex }];
         }
         const officers = await Account.find(accountFilter).select("_id").lean();
         filter.assignedTo = { $in: officers.map(o => o._id) };
      }

      const hoso = await HoSo.find(filter)
         .populate({
            path: "assignedTo",
            select: "userName fullname phone phongban",
            populate: { path: "phongban", select: "tenphong" }
         })
         .sort({ assignedAt: -1 })
         .lean();

      const phieuthu = await PhieuThu.find({ hoso: { $in: hoso.map(hs => hs._id) } })
         .select("hoso sophieu phithihanhan createdAt")
         .lean();
      const phieuthuMap = new Map(phieuthu.map(p => [String(p.hoso), p]));

      res.status(200).json(hoso.map(hs => ({ ...hs, phieuthu: phieuthuMap.get(String(hs._id)) || null })));
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Thống kê theo tháng ================== */
// ?thang=YYYY-MM (mặc định tháng hiện tại)
// - Hoàn thành: hồ sơ chuyển "Hoàn thành" trong tháng, kèm giá trị phiếu thu của từng hồ sơ
// - Treo: hồ sơ đã phân công tới cuối tháng nhưng tới cuối tháng vẫn chưa hoàn thành
const getThongKe = async (req, res) => {
   const now = new Date();
   const thang = req.query.thang || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
   const match = /^(\d{4})-(\d{2})$/.exec(thang);
   if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
      return res.status(400).json({ code: 400, message: "Tháng không hợp lệ (định dạng YYYY-MM)" });
   }
   const start = new Date(Number(match[1]), Number(match[2]) - 1, 1);
   const end = new Date(Number(match[1]), Number(match[2]), 1);

   const populateOfficer = {
      path: "assignedTo",
      select: "userName fullname phongban",
      populate: { path: "phongban", select: "tenphong" }
   };
   const selectFields = "mahoso tennguoi loaihoso trangthai giaidoan assignedTo assignedAt lichsu";

   try {
      const completed = await HoSo.find({
         lichsu: { $elemMatch: { trangthai: TRANG_THAI.HOAN_THANH, thoigian: { $gte: start, $lt: end } } }
      }).select(selectFields).populate(populateOfficer).lean();

      const pending = await HoSo.find({
         assignedAt: { $ne: null, $lt: end },
         lichsu: { $not: { $elemMatch: { trangthai: TRANG_THAI.HOAN_THANH, thoigian: { $lt: end } } } }
      }).select(selectFields).populate(populateOfficer).sort({ assignedAt: 1 }).lean();

      const phieuthu = await PhieuThu.find({ hoso: { $in: completed.map(hs => hs._id) } })
         .select("hoso sophieu sotienthucnhan phithihanhan")
         .lean();
      const phieuthuMap = new Map(phieuthu.map(p => [String(p.hoso), p]));

      const hoanThanhAt = (hs) => hs.lichsu.find(l => l.trangthai === TRANG_THAI.HOAN_THANH).thoigian;
      const toRow = ({ lichsu, ...hs }) => hs;

      const hoanthanh = completed
         .map(hs => ({ ...toRow(hs), hoanthanhAt: hoanThanhAt(hs), phieuthu: phieuthuMap.get(String(hs._id)) || null }))
         .sort((a, b) => a.hoanthanhAt - b.hoanthanhAt);
      const treo = pending.map(toRow);

      res.status(200).json({
         thang,
         hoanthanh,
         treo,
         tong: {
            hoanthanh: hoanthanh.length,
            treo: treo.length,
            tamdung: treo.filter(hs => hs.trangthai === TRANG_THAI.TAM_DUNG).length,
            chuaLapPhieu: hoanthanh.filter(hs => !hs.phieuthu).length,
            giatri: hoanthanh.reduce((sum, hs) => sum + (hs.phieuthu ? hs.phieuthu.sotienthucnhan : 0), 0),
            phi: hoanthanh.reduce((sum, hs) => sum + (hs.phieuthu ? hs.phieuthu.phithihanhan : 0), 0)
         }
      });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Biểu phí thi hành án ================== */
const getBieuPhi = (req, res) => {
   res.status(200).json(PhieuThu.BIEU_PHI.map(bac => ({ ...bac, den: Number.isFinite(bac.den) ? bac.den : null })));
};

/* ================== Lập phiếu thu cho hồ sơ đã hoàn thành ================== */
const createPhieuThu = async (req, res) => {
   const { accountId, hinhthuc } = req.body;
   const sotienthucnhan = Number(req.body.sotienthucnhan);
   const noidung = (req.body.noidung || "").trim();
   const nguoinop = (req.body.nguoinop || "").trim();

   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ không hợp lệ" });
   }
   if (!Number.isFinite(sotienthucnhan) || sotienthucnhan <= 0) {
      return res.status(400).json({ code: 400, message: "Số tiền / giá trị tài sản thực nhận phải lớn hơn 0" });
   }
   if (hinhthuc && !HINH_THUC.includes(hinhthuc)) {
      return res.status(400).json({ code: 400, message: "Hình thức thu không hợp lệ" });
   }

   try {
      const hoso = await HoSo.findById(req.params.id).lean();
      if (!hoso) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy hồ sơ" });
      }
      if (hoso.trangthai !== TRANG_THAI.HOAN_THANH || hoso.giaidoan !== GIAI_DOAN.KET_THUC) {
         return res.status(409).json({ code: 409, message: "Chỉ lập phiếu thu cho hồ sơ đã kết thúc thi hành án" });
      }

      const nguoilap = mongoose.isValidObjectId(accountId)
         ? await Account.findById(accountId).select("userName fullname").lean()
         : null;

      const phieu = await PhieuThu.create({
         sophieu: "PT" + Date.now(),
         hoso: hoso._id,
         nguoinop: nguoinop || hoso.tennguoi,
         cccd: hoso.cccd,
         noidung: noidung || `Thu phí thi hành án hồ sơ ${hoso.mahoso}`,
         sotienthucnhan,
         phithihanhan: PhieuThu.tinhPhi(sotienthucnhan),
         hinhthuc: hinhthuc || HINH_THUC[0],
         nguoilap: nguoilap ? nguoilap._id : null,
         tennguoilap: nguoilap ? nguoilap.fullname || nguoilap.userName : ""
      });

      res.status(201).json({ code: 201, message: `Đã lập phiếu thu ${phieu.sophieu}`, phieuthu: phieu });
   } catch (error) {
      if (error.code === 11000) {
         return res.status(409).json({ code: 409, message: "Hồ sơ này đã được lập phiếu thu" });
      }
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Xem phiếu thu của hồ sơ ================== */
const getPhieuThu = async (req, res) => {
   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ không hợp lệ" });
   }

   try {
      const phieu = await PhieuThu.findOne({ hoso: req.params.id })
         .populate("hoso", "mahoso tennguoi cccd loaihoso")
         .lean();
      if (!phieu) {
         return res.status(404).json({ code: 404, message: "Hồ sơ chưa được lập phiếu thu" });
      }
      res.status(200).json(phieu);
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

module.exports = {
   getBaoCao,
   getThongKe,
   getBieuPhi,
   createPhieuThu,
   getPhieuThu
};
