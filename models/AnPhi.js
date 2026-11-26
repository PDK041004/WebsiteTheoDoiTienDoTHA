const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Bảng án phí: mỗi loại hồ sơ một mức án phí, công chức tự quản lý
const anPhiSchema = new Schema({
   loaihoso: {
      type: String,
      required: true,
      unique: true,
      trim: true
   },
   mucanphi: {
      type: Number,
      required: true,
      min: 0
   },
   ghichu: {
      type: String,
      default: ""
   }
}, { timestamps: true });

// Mức mẫu để tạo nhanh bảng án phí, cần đối chiếu lại với quy định hiện hành trước khi dùng
const AN_PHI_MAU = [
   { loaihoso: "Dân sự", mucanphi: 300000 },
   { loaihoso: "Kinh doanh thương mại", mucanphi: 3000000 },
   { loaihoso: "Hình sự", mucanphi: 200000 },
   { loaihoso: "Lao động", mucanphi: 300000 },
   { loaihoso: "Trọng tải thương mại", mucanphi: 3000000 },
   { loaihoso: "Phá sản", mucanphi: 1500000 },
   { loaihoso: "Hành chính", mucanphi: 300000 },
   { loaihoso: "Vụ việc cạnh tranh", mucanphi: 3000000 },
   { loaihoso: "Tín dụng ngân hàng", mucanphi: 3000000 },
   { loaihoso: "Biện pháp khẩn cấp tạm thời", mucanphi: 800000 }
].map(item => ({ ...item, ghichu: "Mức mẫu, cần đối chiếu quy định" }));

const AnPhi = mongoose.model("AnPhi", anPhiSchema);
AnPhi.AN_PHI_MAU = AN_PHI_MAU;

module.exports = AnPhi;
