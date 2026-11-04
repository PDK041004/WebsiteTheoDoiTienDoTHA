const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const accountSchema = new Schema({
   userName: {
      type: String,
      unique: true,
      required: true
   },
   phoneNumber: {
      type: String,
      maxlength: 10,
      unique: true,
      required: true
   },
   password: {
      type: String,
      required: true
   },
   role: {
      type: Number,
      required: false,
      default: 0
   },
   refreshToken: {
      type: String,
      required: false,
      default: null
   }
}, { timestamps: true });

module.exports = mongoose.model("Account", accountSchema);