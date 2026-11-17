// Đổi index mã hồ sơ: bỏ index unique cũ "mahoso_1" (bắt buộc mọi hồ sơ có mã khác nhau)
// sang "mahoso_unique" chỉ áp dụng cho hồ sơ đã có mã, vì hồ sơ chờ xác nhận chưa có mã.
// Chạy một lần: node scripts/doi-index-mahoso.js
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const HoSo = require(path.join(__dirname, "..", "models", "HoSo"));

const run = async () => {
   await mongoose.connect(process.env.MONGODB_URI, { dbName: "CSDL-THA" });
   const collection = HoSo.collection;

   const indexes = await collection.indexes();
   if (indexes.some(i => i.name === "mahoso_1")) {
      await collection.dropIndex("mahoso_1");
      console.log("Đã xóa index cũ mahoso_1");
   }
   await HoSo.createIndexes();
   console.log("Index hiện tại:", (await collection.indexes()).map(i => i.name).join(", "));
};

run()
   .catch(error => {
      console.error("Lỗi:", error.message);
      process.exitCode = 1;
   })
   .finally(() => mongoose.disconnect());
