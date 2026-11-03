const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const phongBanSchema = new Schema({
   maphong: {
      type: String,
      required: true,
      unique: true,
      trim: true
   },
   tenphong: {
      type: String,
      required: true,
      trim: true
   },
   mota: {
      type: String,
      default: ""
   },
   // Trưởng phòng phải là nhân viên thuộc phòng này
   truongphong: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null
   }
}, { timestamps: true });

module.exports = mongoose.model("PhongBan", phongBanSchema);
