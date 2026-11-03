const path = require("path");
const mongoose = require("mongoose");
const ThongBao = require(path.join(__dirname, "..", "models", "ThongBao"));

const invalidId = (res) => res.status(400).json({ code: 400, message: "Mã không hợp lệ" });

/* ================== Thông báo của một người ================== */
const getThongBao = async (req, res) => {
   const { nguoinhan } = req.query;
   if (!mongoose.isValidObjectId(nguoinhan)) return invalidId(res);

   try {
      const thongbao = await ThongBao.find({ nguoinhan })
         .populate("hoso", "mahoso tennguoi trangthai")
         .sort({ createdAt: -1 })
         .limit(50)
         .lean();
      res.status(200).json(thongbao);
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

/* ================== Đánh dấu đã xem ================== */
const markAsRead = async (req, res) => {
   const { nguoinhan } = req.body;
   if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(nguoinhan)) return invalidId(res);

   try {
      const thongbao = await ThongBao.findOneAndUpdate(
         { _id: req.params.id, nguoinhan },
         { $set: { daxem: true } }
      );
      if (!thongbao) {
         return res.status(404).json({ code: 404, message: "Không tìm thấy thông báo" });
      }
      res.status(200).json({ code: 200, message: "Đã xem" });
   } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
   }
};

module.exports = {
   getThongBao,
   markAsRead
};
