const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const roleSchema = new Schema({  
   id: {
      type: String,
      required: true,
      unique: true
   },
   name: {
      type: String,
      required: true,
      unique: true
   },
   description: {
      type: String,
      required: true
   }
});

module.exports = mongoose.model("Role", roleSchema);