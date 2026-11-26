const path = require("path");
const HoSo = require(path.join(__dirname, "..", "models", "HoSo"));

const { TRANG_THAI, GIAI_DOAN } = HoSo;

// "YYYY-MM-DD" -> Date (giờ địa phương); null nếu sai định dạng hoặc ngày không có thật
const parseNgay = (value) => {
   const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
   if (!m) return null;
   const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
   const date = new Date(y, mo - 1, d);
   if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
   return date;
};

const dinhDang = (date) => {
   const mm = String(date.getMonth() + 1).padStart(2, "0");
   const dd = String(date.getDate()).padStart(2, "0");
   return `${date.getFullYear()}-${mm}-${dd}`;
};

// GET /bao-cao/api?tu=YYYY-MM-DD&den=YYYY-MM-DD
// Mặc định: từ ngày đầu tháng đến hôm nay
const getHoSoTheoNgay = async (req, res) => {
   const now = new Date();
   const homNay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
   const dauThang = new Date(now.getFullYear(), now.getMonth(), 1);

   const tuNgay = req.query.tu ? parseNgay(req.query.tu) : dauThang;
   const denNgay = req.query.den ? parseNgay(req.query.den) : homNay;

   if (!tuNgay || !denNgay) {
      return res.status(400).json({ message: "Ngày không hợp lệ (định dạng YYYY-MM-DD)." });
   }
   if (tuNgay > denNgay) {
      return res.status(400).json({ message: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc." });
   }

   // Lấy hết ngày kết thúc: tới 00:00 của ngày kế tiếp
   const start = tuNgay;
   const end = new Date(denNgay.getFullYear(), denNgay.getMonth(), denNgay.getDate() + 1);

   try {
      const hoso = await HoSo.find({ createdAt: { $gte: start, $lt: end } })
         .select("mahoso tennguoi loaihoso trangthai giaidoan assignedTo createdAt")
         .populate({ path: "assignedTo", select: "userName fullname" })
         .sort({ createdAt: -1 })
         .lean();

      // Đếm theo trạng thái / giai đoạn, kể cả mục bằng 0 để giao diện luôn đủ thẻ
      const theoTrangThai = Object.fromEntries(Object.values(TRANG_THAI).map(t => [t, 0]));
      const theoGiaiDoan = Object.fromEntries(Object.values(GIAI_DOAN).map(g => [g, 0]));
      for (const hs of hoso) {
         theoTrangThai[hs.trangthai] = (theoTrangThai[hs.trangthai] || 0) + 1;
         if (hs.giaidoan) theoGiaiDoan[hs.giaidoan] = (theoGiaiDoan[hs.giaidoan] || 0) + 1;
      }

      res.status(200).json({
         tu: dinhDang(tuNgay),
         den: dinhDang(denNgay),
         tong: hoso.length,
         theoTrangThai,
         theoGiaiDoan,
         hoso
      });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

module.exports = { getHoSoTheoNgay };