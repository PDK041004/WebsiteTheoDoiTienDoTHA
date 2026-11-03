const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const accountSchema = new Schema({
   userName: {
      type: String,
      required: true,
      unique: true
   },
   password: {
      type: String,
      required: true
   },
   fullname: {
      type: String,
      default: ""
   },
   phone: {
      type: String,
      default: ""
   },
   // 0: người dân, 1: chấp hành viên, 2: công chức, 3: quản trị
   role: {
      type: Number,
      default: 0
   },
   phongban: {
      type: Schema.Types.ObjectId,
      ref: "PhongBan",
      default: null
   },
   refreshToken: {
      type: String,
      required: false,
      default: null
   }
}, { timestamps: true });

module.exports = mongoose.model("Account", accountSchema);