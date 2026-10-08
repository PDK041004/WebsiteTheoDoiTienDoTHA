const mongoose = require("mongoose");

const connection = async () => {
   try {
      await mongoose.connect(process.env.MONGODB_URI, {
         dbName: "CSDL-THA"
      });
      console.log("<===============<Kết nối MongoDB thành công!>===============>");
   } catch (error) {
      console.error("Error connecting to MongoDB:", error);
   }
}

module.exports = connection;