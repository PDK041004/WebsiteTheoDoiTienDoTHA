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
// ?phongban=<id|none>&chv=<tên chấp hành viên>&trangthai=<trạng thái>&songay=<7|14|30|60>
// songay: chỉ lấy hồ sơ được phân công trong số ngày gần nhất
const SO_NGAY_LOC = [7, 14, 30, 60];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getBaoCao = async (req, res) => {
   const { phongban, trangthai } = req.query;
   const chv = (req.query.chv || "").trim();
   const songay = req.query.songay ? Number(req.query.songay) : null;
   if (phongban && phongban !== NO_PHONGBAN && !mongoose.isValidObjectId(phongban)) {
      return res.status(400).json({ code: 400, message: "Phòng ban không hợp lệ" });
   }
   if (songay !== null && !SO_NGAY_LOC.includes(songay)) {
      return res.status(400).json({ code: 400, message: `Số ngày lọc chỉ nhận ${SO_NGAY_LOC.join(", ")}` });
   }

   try {
      const filter = { assignedTo: { $ne: null } };
      if (trangthai) filter.trangthai = trangthai;
      if (songay) filter.assignedAt = { $gte: new Date(Date.now() - songay * MS_PER_DAY) };

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
         .select("hoso sophieu tongtien phithihanhan createdAt")
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
         .select("hoso sophieu anphi tienthihanhan tongtien phithihanhan")
         .lean();
      const phieuthuMap = new Map(phieuthu.map(p => [String(p.hoso), { ...p, tongtien: PhieuThu.tongTien(p) }]));
      const cong = (list, field) => list.reduce((sum, hs) => sum + (hs.phieuthu ? hs.phieuthu[field] || 0 : 0), 0);

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
            anphi: cong(hoanthanh, "anphi"),
            tienthihanhan: cong(hoanthanh, "tienthihanhan"),
            tongtien: cong(hoanthanh, "tongtien")
         }
      });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Doanh thu theo khoảng thời gian ================== */
// ?tu=YYYY-MM-DD&den=YYYY-MM-DD (tính theo ngày lập phiếu thu, gồm cả ngày "đến")
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseNgay = (value) => {
   if (!DATE_REGEX.test(value || "")) return null;
   const [y, m, d] = value.split("-").map(Number);
   const date = new Date(y, m - 1, d);
   return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
};

// Cộng dồn các khoản tiền của danh sách phiếu thu
const tongHop = (list) => list.reduce((t, p) => ({
   sophieu: t.sophieu + 1,
   anphi: t.anphi + (p.anphi || 0),
   tienthihanhan: t.tienthihanhan + (p.tienthihanhan || 0),
   tongtien: t.tongtien + PhieuThu.tongTien(p)
}), { sophieu: 0, anphi: 0, tienthihanhan: 0, tongtien: 0 });

const getDoanhThu = async (req, res) => {
   const tu = parseNgay(req.query.tu);
   const denNgay = parseNgay(req.query.den);
   if (!tu || !denNgay) {
      return res.status(400).json({ code: 400, message: "Vui lòng chọn từ ngày và đến ngày hợp lệ (YYYY-MM-DD)" });
   }
   if (tu > denNgay) {
      return res.status(400).json({ code: 400, message: "Từ ngày phải trước hoặc bằng đến ngày" });
   }
   const den = new Date(denNgay.getFullYear(), denNgay.getMonth(), denNgay.getDate() + 1);

   try {
      const phieuthu = await PhieuThu.find({ createdAt: { $gte: tu, $lt: den } })
         .populate("hoso", "mahoso loaihoso")
         .sort({ createdAt: -1 })
         .lean();
      const rows = phieuthu.map(p => ({
         ...p,
         loaihoso: p.loaihoso || (p.hoso && p.hoso.loaihoso) || "Không rõ",
         tongtien: PhieuThu.tongTien(p)
      }));

      const nhom = new Map();
      rows.forEach(p => nhom.set(p.loaihoso, [...(nhom.get(p.loaihoso) || []), p]));
      const theoloai = [...nhom].map(([loaihoso, list]) => ({ loaihoso, ...tongHop(list) }))
         .sort((a, b) => b.tongtien - a.tongtien);

      res.status(200).json({ tong: tongHop(rows), theoloai, phieuthu: rows });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Doanh thu từng tháng trong năm ================== */
// ?nam=YYYY
const getDoanhThuTheoThang = async (req, res) => {
   const nam = Number(req.query.nam || new Date().getFullYear());
   if (!Number.isInteger(nam) || nam < 2000 || nam > 2100) {
      return res.status(400).json({ code: 400, message: "Năm không hợp lệ" });
   }

   try {
      const phieuthu = await PhieuThu.find({ createdAt: { $gte: new Date(nam, 0, 1), $lt: new Date(nam + 1, 0, 1) } })
         .select("anphi tienthihanhan tongtien phithihanhan createdAt")
         .lean();
      const thang = Array.from({ length: 12 }, (_, i) =>
         ({ thang: i + 1, ...tongHop(phieuthu.filter(p => new Date(p.createdAt).getMonth() === i)) }));

      res.status(200).json({ nam, thang, tong: tongHop(phieuthu) });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Lập phiếu thu cho hồ sơ đã hoàn thành ================== */
// Án phí lấy theo bảng án phí của loại hồ sơ (công chức có thể chỉnh), tiền thi hành án nếu có
const createPhieuThu = async (req, res) => {
   const { accountId, hinhthuc } = req.body;
   const anphi = Number(req.body.anphi);
   const tienthihanhan = req.body.tienthihanhan === "" || req.body.tienthihanhan == null
      ? 0
      : Number(req.body.tienthihanhan);
   const noidung = (req.body.noidung || "").trim();
   const nguoinop = (req.body.nguoinop || "").trim();

   if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 400, message: "Mã hồ sơ không hợp lệ" });
   }
   if (!Number.isFinite(anphi) || anphi < 0 || !Number.isFinite(tienthihanhan) || tienthihanhan < 0) {
      return res.status(400).json({ code: 400, message: "Án phí và tiền thi hành án phải là số không âm" });
   }
   if (anphi + tienthihanhan <= 0) {
      return res.status(400).json({ code: 400, message: "Tổng tiền của phiếu thu phải lớn hơn 0" });
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
         noidung: noidung || `Thu án phí và tiền thi hành án hồ sơ ${hoso.mahoso}`,
         loaihoso: hoso.loaihoso,
         anphi,
         tienthihanhan,
         tongtien: anphi + tienthihanhan,
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
   getDoanhThu,
   getDoanhThuTheoThang,
   createPhieuThu,
   getPhieuThu
};
