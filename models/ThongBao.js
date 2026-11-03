const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const thongBaoSchema = new Schema({
   nguoinhan: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true
   },
   hoso: {
      type: Schema.Types.ObjectId,
      ref: "HoSo",
      default: null
   },
   tieude: {
      type: String,
      required: true
   },
   noidung: {
      type: String,
      default: ""
   },
   daxem: {
      type: Boolean,
      default: false
   }
}, { timestamps: true });

thongBaoSchema.index({ nguoinhan: 1, createdAt: -1 });

module.exports = mongoose.model("ThongBao", thongBaoSchema);
