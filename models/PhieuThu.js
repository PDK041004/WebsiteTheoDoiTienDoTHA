const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Biểu phí thi hành án dân sự theo lũy tiến từng phần trên số tiền / giá trị tài sản thực nhận
// (theo Thông tư 216/2016/TT-BTC; cập nhật bảng này nếu văn bản thay đổi)
const BIEU_PHI = [
   { tu: 0, den: 45000000, tyle: 0.03 },
   { tu: 45000000, den: 5000000000, tyle: 0.02 },
   { tu: 5000000000, den: 7000000000, tyle: 0.01 },
   { tu: 7000000000, den: Infinity, tyle: 0.005 }
];

const tinhPhi = (sotien) => {
   const phi = BIEU_PHI.reduce((tong, bac) => {
      if (sotien <= bac.tu) return tong;
      return tong + (Math.min(sotien, bac.den) - bac.tu) * bac.tyle;
   }, 0);
   return Math.round(phi);
};

const phieuThuSchema = new Schema({
   sophieu: {
      type: String,
      required: true,
      unique: true
   },
   // Mỗi hồ sơ chỉ lập một phiếu thu
   hoso: {
      type: Schema.Types.ObjectId,
      ref: "HoSo",
      required: true,
      unique: true
   },
   nguoinop: {
      type: String,
      required: true
   },
   cccd: {
      type: String,
      default: ""
   },
   noidung: {
      type: String,
      default: ""
   },
   // Số tiền / giá trị tài sản thực nhận dùng để tính phí
   sotienthucnhan: {
      type: Number,
      required: true,
      min: 0
   },
   phithihanhan: {
      type: Number,
      required: true,
      min: 0
   },
   hinhthuc: {
      type: String,
      enum: ["Tiền mặt", "Chuyển khoản"],
      default: "Tiền mặt"
   },
   nguoilap: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null
   },
   tennguoilap: {
      type: String,
      default: ""
   }
}, { timestamps: true });

const PhieuThu = mongoose.model("PhieuThu", phieuThuSchema);
PhieuThu.BIEU_PHI = BIEU_PHI;
PhieuThu.tinhPhi = tinhPhi;

module.exports = PhieuThu;
