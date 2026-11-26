const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pendingRegistrationSchema = new Schema({
   userName: { type: String, required: true, unique: true },
   phoneNumber: { type: String, required: true },
   password: { type: String, required: true },   // đã băm
   fullname: { type: String, required: true },
   cccd: { type: String, required: true },
   diachi: { type: String, required: true },
   ngaysinh: { type: Date, required: true },
   otp: { type: String, required: true },        // đã băm
   otpAttempts: { type: Number, default: 0 },
   otpSentAt: { type: Date, default: Date.now },
   expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

module.exports = mongoose.model("PendingRegistration", pendingRegistrationSchema);