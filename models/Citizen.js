const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const citizenSchema = new Schema({
   firstName: {
      type: String,
      required: true
   },
   lastName: {
      type: String,
      required: true
   },
   dateOfBirth: {
      type: Date,
      required: true
   },
   citizenId: {
      type: Number,
      unique: true,
      required: true,
      length: 12
   },
   address: {
      type: String,
      required: true,
   },
   phoneNumber: {
      type: Number,
      unique: true,
      required: true,
      length: 10
   }
});

module.export = mongoose.model("Citizen", citizenSchema);