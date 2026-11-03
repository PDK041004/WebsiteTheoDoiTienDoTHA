const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Luồng trạng thái: Chờ xác nhận -> (Cần bổ sung -> Chờ xác nhận) -> Đã xác nhận -> Đã phân công
// -> Đang xử lý (chấp hành viên đã xác minh nhận hồ sơ)
const TRANG_THAI = {
   CHO_XAC_NHAN: "Chờ xác nhận",
   CAN_BO_SUNG: "Cần bổ sung",
   DA_XAC_NHAN: "Đã xác nhận",
   DA_PHAN_CONG: "Đã phân công",
   DANG_XU_LY: "Đang xử lý"
};

const fileSchema = new Schema({
   filename: { type: String, required: true },
   originalname: { type: String, required: true },
   mimetype: { type: String, required: true },
   size: { type: Number, required: true },
   uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const lichSuSchema = new Schema({
   trangthai: { type: String, required: true },
   ghichu: { type: String, default: "" },
   thoigian: { type: Date, default: Date.now }
}, { _id: false });

const hoSoSchema = new Schema({
   mahoso: {
      type: String,
      required: true,
      unique: true
   },
   tennguoi: {
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
   loaihoso: {
      type: String,
      default: ""
   },
   danhmuc: {
      type: String,
      default: "Chưa phân loại"
   },
   trangthai: {
      type: String,
      default: TRANG_THAI.CHO_XAC_NHAN
   },
   // File bản án người dân gửi kèm
   files: {
      type: [fileSchema],
      default: []
   },
   // Nội dung công chức yêu cầu người dân bổ sung
   phanhoi: {
      type: String,
      default: ""
   },
   lichsu: {
      type: [lichSuSchema],
      default: []
   },
   // Chấp hành viên được phân công (Account có role = 1)
   assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null
   },
   assignedAt: {
      type: Date,
      default: null
   }
}, { timestamps: true });

const HoSo = mongoose.model("HoSo", hoSoSchema);
HoSo.TRANG_THAI = TRANG_THAI;

module.exports = HoSo;
