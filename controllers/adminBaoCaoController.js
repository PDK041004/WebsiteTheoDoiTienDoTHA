const path = require("path");
const HoSo = require(path.join(__dirname, "..", "models", "HoSo"));

const { TRANG_THAI, GIAI_DOAN } = HoSo;

// GET /bao-cao/api?thang=YYYY-MM (mặc định là tháng hiện tại)
const getHoSoTheoThang = async (req, res) => {
   const now = new Date();
   const thang = req.query.thang || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
   const match = /^(\d{4})-(\d{2})$/.exec(thang);
   if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
      return res.status(400).json({ message: "Tháng không hợp lệ (định dạng YYYY-MM)" });
   }
   const start = new Date(Number(match[1]), Number(match[2]) - 1, 1);
   const end = new Date(Number(match[1]), Number(match[2]), 1);

   try {
      const hoso = await HoSo.find({ createdAt: { $gte: start, $lt: end } })
         .select("mahoso tennguoi loaihoso trangthai giaidoan assignedTo createdAt")
         .populate({ path: "assignedTo", select: "userName fullname" })
         .sort({ createdAt: -1 })
         .lean();

      // Đếm theo trạng thái / giai đoạn, kể cả mục bằng 0 để giao diện luôn đủ cột
      const theoTrangThai = Object.fromEntries(Object.values(TRANG_THAI).map(t => [t, 0]));
      const theoGiaiDoan = Object.fromEntries(Object.values(GIAI_DOAN).map(g => [g, 0]));
      for (const hs of hoso) {
         theoTrangThai[hs.trangthai] = (theoTrangThai[hs.trangthai] || 0) + 1;
         if (hs.giaidoan) theoGiaiDoan[hs.giaidoan] = (theoGiaiDoan[hs.giaidoan] || 0) + 1;
      }

      res.status(200).json({ thang, tong: hoso.length, theoTrangThai, theoGiaiDoan, hoso });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

module.exports = { getHoSoTheoThang };