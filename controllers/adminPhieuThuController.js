const path = require("path");
const mongoose = require("mongoose");
const HoSo = require(path.join(__dirname, "..", "models", "HoSo"));
const PhieuThuAdmin = require(path.join(__dirname, "..", "models", "PhieuThuAdmin"));

const { TRANG_THAI } = HoSo;
const { AN_PHI_THEO_LOAI } = PhieuThuAdmin;

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

// Án phí theo loại hồ sơ; null nếu chưa có trong bảng
const anPhiCua = (loaihoso) => Object.hasOwn(AN_PHI_THEO_LOAI, loaihoso) ? AN_PHI_THEO_LOAI[loaihoso] : null;

/* ================== Danh sách hồ sơ đã hoàn thành, chưa lập phiếu thu ================== */
// GET /phieu-thu/api
const getHoSoChoLapPhieu = async (req, res) => {
   try {
      const daLap = await PhieuThuAdmin.find().distinct("hoso");
      const hoso = await HoSo.find({ trangthai: TRANG_THAI.HOAN_THANH, _id: { $nin: daLap } })
         .select("mahoso tennguoi loaihoso createdAt assignedTo")
         .populate({ path: "assignedTo", select: "userName fullname" })
         .sort({ createdAt: -1 })
         .lean();

      res.status(200).json({ hoso: hoso.map(hs => ({ ...hs, anphi: anPhiCua(hs.loaihoso) })) });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

/* ================== Lập phiếu thu ================== */
// POST /phieu-thu/api/:id   body: { nguoinop, nguoithu, ngaylap, phithihanhan }
const createPhieuThu = async (req, res) => {
   const { id } = req.params;
   if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Mã hồ sơ không hợp lệ." });

   const nguoinop = String(req.body.nguoinop || "").trim();
   const nguoithu = String(req.body.nguoithu || "").trim();
   const ngaylap = parseNgay(req.body.ngaylap);
   const raw = req.body.phithihanhan;
   const phithihanhan = (raw === "" || raw === null || raw === undefined) ? 0 : Math.round(Number(raw));

   if (!nguoinop || !nguoithu) return res.status(400).json({ message: "Vui lòng nhập người nộp tiền và người thu tiền." });
   if (!ngaylap) return res.status(400).json({ message: "Ngày lập phiếu không hợp lệ." });
   const now = new Date();
   if (ngaylap > new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return res.status(400).json({ message: "Ngày lập phiếu không được ở tương lai." });
   }
   if (!Number.isFinite(phithihanhan) || phithihanhan < 0) {
      return res.status(400).json({ message: "Phí thi hành án phải là số không âm." });
   }

   try {
      const hoso = await HoSo.findById(id)
         .populate({ path: "assignedTo", select: "userName fullname" })
         .lean();
      if (!hoso) return res.status(404).json({ message: "Không tìm thấy hồ sơ." });
      if (hoso.trangthai !== TRANG_THAI.HOAN_THANH) {
         return res.status(409).json({ message: "Chỉ lập phiếu thu cho hồ sơ đã hoàn thành." });
      }

      const anphi = anPhiCua(hoso.loaihoso);
      if (anphi === null) {
         return res.status(400).json({ message: `Chưa có mức án phí cho loại hồ sơ "${hoso.loaihoso}".` });
      }
      if (await PhieuThuAdmin.exists({ hoso: hoso._id })) {
         return res.status(409).json({ message: "Hồ sơ này đã được lập phiếu thu." });
      }

      const thanhtien = anphi + phithihanhan;
      const nam = ngaylap.getFullYear();

      // Số phiếu = PT{năm}/{số thứ tự kế tiếp}; nếu trùng do bấm cùng lúc thì thử lại
      for (let lan = 0; lan < 5; lan++) {
         const last = await PhieuThuAdmin.findOne({ nam }).sort({ stt: -1 }).select("stt").lean();
         const stt = (last ? last.stt : 0) + 1;
         try {
            const phieu = await PhieuThuAdmin.create({
               nam, stt, sophieu: `PT${nam}/${stt}`,
               hoso: hoso._id,
               mahoso: hoso.mahoso || "",
               nguoithihanh: hoso.tennguoi,
               loaihoso: hoso.loaihoso,
               chaphanhvien: hoso.assignedTo ? (hoso.assignedTo.fullname || hoso.assignedTo.userName) : "",
               nguoinop, nguoithu, ngaylap,
               anphi, phithihanhan, thanhtien
            });
            return res.status(201).json({ message: `Đã lập phiếu thu ${phieu.sophieu}`, phieuthu: phieu });
         } catch (err) {
            if (err.code === 11000) {
               if (err.keyPattern && err.keyPattern.hoso) {
                  return res.status(409).json({ message: "Hồ sơ này đã được lập phiếu thu." });
               }
               continue;   // trùng số phiếu: thử số kế tiếp
            }
            throw err;
         }
      }
      return res.status(500).json({ message: "Không tạo được số phiếu, vui lòng thử lại." });
   } catch (error) {
      return res.status(500).json({ message: error.message });
   }
};

/* ================== Báo cáo doanh thu theo khoảng ngày lập phiếu ================== */
// GET /doanh-thu/api?tu=YYYY-MM-DD&den=YYYY-MM-DD  (mặc định: từ đầu tháng đến hôm nay)
const getDoanhThu = async (req, res) => {
   const now = new Date();
   const homNay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
   const dauThang = new Date(now.getFullYear(), now.getMonth(), 1);

   const tuNgay = req.query.tu ? parseNgay(req.query.tu) : dauThang;
   const denNgay = req.query.den ? parseNgay(req.query.den) : homNay;

   if (!tuNgay || !denNgay) return res.status(400).json({ message: "Ngày không hợp lệ (định dạng YYYY-MM-DD)." });
   if (tuNgay > denNgay) return res.status(400).json({ message: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc." });

   const end = new Date(denNgay.getFullYear(), denNgay.getMonth(), denNgay.getDate() + 1);

   try {
      const phieu = await PhieuThuAdmin.find({ ngaylap: { $gte: tuNgay, $lt: end } })
         .sort({ ngaylap: -1, stt: -1 })
         .lean();

      const tong = phieu.reduce((t, p) => ({
         anphi: t.anphi + p.anphi,
         phithihanhan: t.phithihanhan + p.phithihanhan,
         thanhtien: t.thanhtien + p.thanhtien
      }), { anphi: 0, phithihanhan: 0, thanhtien: 0 });

      res.status(200).json({ tu: dinhDang(tuNgay), den: dinhDang(denNgay), soPhieu: phieu.length, tong, phieu });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

module.exports = { getHoSoChoLapPhieu, createPhieuThu, getDoanhThu };