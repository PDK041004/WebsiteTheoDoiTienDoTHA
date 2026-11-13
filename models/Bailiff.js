const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bailiffSchema = new Schema({
   firstName: {
      type: String,
      required: true
   },
   lastName: {
      type: String,
      required: true
   },
   citizenId: {
      type: Number,
      unique: true,
      required: true,
      length: 12
   },
   phoneNumber: {
      type: Number,
      unique: true,
      required: true,
      length: 10
   }
});

module.export = mongoose.model("Bailiff", bailiffSchema);