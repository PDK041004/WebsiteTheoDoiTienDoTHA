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
   fullname: {
      type: String,
      default: ""
   },
   otp: { 
      type: String, 
      default: null 
   },
   otpExpires: { 
      type: Date, 
      default: null 
   },
   otpAttempts: { 
      type: Number, 
      default: 0 
   },
   phone: {
   type: String,
   default: ""
   },
   role: {
      type: Number,
      required: false,
      default: 0
   },
   otp: {
      type: String,
      default: null
   },
   otpExpiry: {
      type: Date,
      default: null
   },
   otpAttempts: {
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