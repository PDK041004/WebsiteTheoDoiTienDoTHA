const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Mức án phí theo loại hồ sơ (đồng), đặt sẵn tại đây, giao diện không sửa được.
// Tạm đặt 300.000 theo phiếu mẫu. Sửa số cho đúng quy định.
// Tên loại phải trùng đúng với các lựa chọn "Loại hồ sơ" trên trang người dân.
const AN_PHI_THEO_LOAI = {
   "Dân sự": 300000,
   "Kinh doanh thương mại": 300000,
   "Hình sự": 300000,
   "Lao động": 300000,
   "Trọng tải thương mại": 300000,
   "Phá sản": 300000,
   "Hành chính": 300000,
   "Vụ việc cạnh tranh": 300000,
   "Tín dụng ngân hàng": 300000,
   "Biện pháp khẩn cấp tạm thời": 300000
};

const phieuThuSchema = new Schema({
   // Số phiếu: PT{nam}/{stt}
   nam: { type: Number, required: true },
   stt: { type: Number, required: true },
   sophieu: { type: String, required: true, unique: true },

   // Mỗi hồ sơ chỉ lập một phiếu thu
   hoso: { type: Schema.Types.ObjectId, ref: "HoSo", required: true, unique: true },

   // Thông tin hồ sơ tại thời điểm lập phiếu
   mahoso: { type: String, default: "" },
   nguoithihanh: { type: String, default: "" },
   loaihoso: { type: String, default: "" },
   chaphanhvien: { type: String, default: "" },

   nguoinop: { type: String, required: true },
   nguoithu: { type: String, required: true },
   ngaylap: { type: Date, required: true },

   anphi: { type: Number, required: true, min: 0 },
   phithihanhan: { type: Number, default: 0, min: 0 },
   thanhtien: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const PhieuThuAdmin = mongoose.model("PhieuThuAdmin", phieuThuSchema);
PhieuThuAdmin.AN_PHI_THEO_LOAI = AN_PHI_THEO_LOAI;

module.exports = PhieuThuAdmin;