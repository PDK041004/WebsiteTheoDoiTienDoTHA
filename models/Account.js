const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const accountSchema = new Schema({
   username: {
      type: String,
      required: true,
      unique: true
   },
   password: {
      type: String,
      required: true
   },
   role: {
      type: Number,
      default: 0
   },
   refreshToken: {
      type: String,
      required: false,
      default: null
   }
}, { timestamps: true });

module.exports = mongoose.model("Account", accountSchema);