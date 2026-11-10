const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Luồng trạng thái: Chờ xác nhận -> (Cần bổ sung -> Chờ xác nhận) -> Đã xác nhận -> Đã phân công
// -> Đang xử lý (chấp hành viên đã xác minh nhận hồ sơ) <-> Tạm dừng -> Hoàn thành
// Từ Đang xử lý trở đi, trạng thái do chấp hành viên đổi trong "Cập nhật hồ sơ"
const TRANG_THAI = {
   CHO_XAC_NHAN: "Chờ xác nhận",
   CAN_BO_SUNG: "Cần bổ sung",
   DA_XAC_NHAN: "Đã xác nhận",
   DA_PHAN_CONG: "Đã phân công",
   DANG_XU_LY: "Đang xử lý",
   TAM_DUNG: "Tạm dừng",
   HOAN_THANH: "Hoàn thành"
};

// Căn cứ để chuyển sang giai đoạn Cưỡng chế (chọn ít nhất một)
const CAN_CU_CUONG_CHE = [
   "Hết thời hạn tự nguyện, người phải thi hành án có điều kiện nhưng không tự nguyện thi hành",
   "Người phải thi hành án có hành vi tẩu tán, hủy hoại tài sản",
   "Người phải thi hành án trốn tránh, cản trở việc thi hành án",
   "Cần thi hành ngay để ngăn chặn việc tẩu tán tài sản",
   "Căn cứ khác"
];

// Tiến độ thi hành án khi hồ sơ đang xử lý
const GIAI_DOAN = {
   KHOI_DONG: "Khởi động",
   XAC_NHAN_DIEU_KIEN: "Xác nhận điều kiện",
   TU_NGUYEN: "Tự nguyện",
   CUONG_CHE: "Cưỡng chế",
   KET_THUC: "Kết thúc"
};

// Giai đoạn được phép chuyển tới: Tự nguyện kết thúc luôn,
// chỉ khi có vi phạm mới sang Cưỡng chế rồi mới Kết thúc
const GIAI_DOAN_TIEP_THEO = {
   [GIAI_DOAN.KHOI_DONG]: [GIAI_DOAN.XAC_NHAN_DIEU_KIEN],
   [GIAI_DOAN.XAC_NHAN_DIEU_KIEN]: [GIAI_DOAN.TU_NGUYEN],
   [GIAI_DOAN.TU_NGUYEN]: [GIAI_DOAN.KET_THUC, GIAI_DOAN.CUONG_CHE],
   [GIAI_DOAN.CUONG_CHE]: [GIAI_DOAN.KET_THUC],
   [GIAI_DOAN.KET_THUC]: []
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
   giaidoan: { type: String, default: null },
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
   },
   // Giai đoạn thi hành án, có giá trị từ khi chấp hành viên nhận hồ sơ
   giaidoan: {
      type: String,
      default: null
   },
   // Điều kiện dẫn tới cưỡng chế, bắt buộc khi chuyển sang giai đoạn Cưỡng chế
   cuongche: {
      cancu: { type: [String], default: undefined },
      noidung: { type: String },
      thoigian: { type: Date }
   },
   // Nội dung xử lý và tài liệu chấp hành viên cập nhật (không ghi đè yêu cầu của người dân)
   noidungxuly: {
      type: String,
      default: ""
   },
   tailieu: {
      type: [fileSchema],
      default: []
   }
}, { timestamps: true });

const HoSo = mongoose.model("HoSo", hoSoSchema);
HoSo.TRANG_THAI = TRANG_THAI;
HoSo.CAN_CU_CUONG_CHE = CAN_CU_CUONG_CHE;
HoSo.GIAI_DOAN = GIAI_DOAN;
HoSo.GIAI_DOAN_TIEP_THEO = GIAI_DOAN_TIEP_THEO;

module.exports = HoSo;
