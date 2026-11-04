const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const judgementSchema = new Schema({
   designation: {
      type: Number,
      required: true,
      unique: true
   },
   classification: {
      type: String,
      required: true
   },
   documents: {
      type: String,
      required: true
   },
}, { timestamps: true });

module.exports = mongoose.model("Judgement", judgementSchema);