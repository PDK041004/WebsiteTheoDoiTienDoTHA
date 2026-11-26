const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Phiếu thu: giá trị bằng tiền của bản án = án phí + tiền thi hành án (nếu có)
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
   // Loại hồ sơ tại thời điểm lập phiếu, dùng cho báo cáo doanh thu
   loaihoso: {
      type: String,
      default: ""
   },
   anphi: {
      type: Number,
      min: 0,
      default: 0
   },
   tienthihanhan: {
      type: Number,
      min: 0,
      default: 0
   },
   tongtien: {
      type: Number,
      min: 0
   },
   // Phiếu lập trước khi đổi sang án phí + tiền THA chỉ có 2 trường này
   sotienthucnhan: { type: Number },
   phithihanhan: { type: Number },
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

// Tổng tiền của phiếu, phiếu cũ tính theo phí thi hành án đã thu
const tongTien = (phieu) => phieu.tongtien ?? phieu.phithihanhan ?? 0;

const PhieuThu = mongoose.model("PhieuThu", phieuThuSchema);
PhieuThu.tongTien = tongTien;

module.exports = PhieuThu;
