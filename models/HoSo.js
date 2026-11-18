const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TRANG_THAI = {
   CHO_XAC_NHAN: "Chờ xác nhận",
   CAN_BO_SUNG: "Cần bổ sung",
   DA_XAC_NHAN: "Đã xác nhận",
   DA_PHAN_CONG: "Đã phân công",
   DANG_XU_LY: "Đang xử lý",
   TAM_DUNG: "Tạm dừng",
   HOAN_THANH: "Hoàn thành"
};

const GIAI_DOAN = {
   KHOI_DONG: "Khởi động",
   TU_NGUYEN: "Tự nguyện",
   XAC_NHAN_DIEU_KIEN: "Xác nhận điều kiện",
   CUONG_CHE: "Cưỡng chế",
   KET_THUC: "Kết thúc"
};

// Tự nguyện thi hành xong thì Kết thúc luôn; hết hạn mà chưa thi hành thì xác nhận điều kiện rồi mới cưỡng chế
const GIAI_DOAN_TIEP_THEO = {
   [GIAI_DOAN.KHOI_DONG]: [GIAI_DOAN.TU_NGUYEN],
   [GIAI_DOAN.TU_NGUYEN]: [GIAI_DOAN.KET_THUC, GIAI_DOAN.XAC_NHAN_DIEU_KIEN],
   [GIAI_DOAN.XAC_NHAN_DIEU_KIEN]: [GIAI_DOAN.CUONG_CHE, GIAI_DOAN.KET_THUC],
   [GIAI_DOAN.CUONG_CHE]: [GIAI_DOAN.KET_THUC],
   [GIAI_DOAN.KET_THUC]: []
};

const lichSuSchema = new Schema({
   trangthai: { type: String, required: true },
   giaidoan: { type: String, default: null },
   ghichu: { type: String, default: "" },
   thoigian: { type: Date, default: Date.now }
}, { _id: false });

const hoSoSchema = new Schema({
   mahoso: { type: String, default: null },
   tennguoi: { type: String, required: true },
   cccd: { type: String, default: "" },
   sdt: { type: String, default: "" },
   diachi: { type: String, default: "" },
   nguoigui: { type: Schema.Types.ObjectId, ref: "Account", default: null },
   noidung: { type: String, default: "" },
   loaihoso: { type: String, default: "" },
   trangthai: { type: String, enum: Object.values(TRANG_THAI), default: TRANG_THAI.CHO_XAC_NHAN },
   giaidoan: { type: String, enum: [...Object.values(GIAI_DOAN), null], default: null },
   assignedTo: { type: Schema.Types.ObjectId, ref: "Account", default: null },
   assignedAt: { type: Date, default: null },
   lichsu: { type: [lichSuSchema], default: [] }
}, { timestamps: true });

// Mã hồ sơ không trùng, chỉ xét hồ sơ đã có mã
hoSoSchema.index(
   { mahoso: 1 },
   { name: "mahoso_unique", unique: true, partialFilterExpression: { mahoso: { $type: "string" } } }
);

const HoSo = mongoose.model("HoSo", hoSoSchema);
HoSo.TRANG_THAI = TRANG_THAI;
HoSo.GIAI_DOAN = GIAI_DOAN;
HoSo.GIAI_DOAN_TIEP_THEO = GIAI_DOAN_TIEP_THEO;

module.exports = HoSo;