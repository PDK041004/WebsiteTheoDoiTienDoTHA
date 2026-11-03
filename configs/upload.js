const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "banan");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILES = 5;

const storage = multer.diskStorage({
   destination: UPLOAD_DIR,
   filename: (req, file, cb) => {
      // Tên file ngẫu nhiên để không đoán được đường dẫn bản án của người khác
      cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase());
   }
});

const upload = multer({
   storage,
   limits: { fileSize: 10 * 1024 * 1024, files: MAX_FILES },
   fileFilter: (req, file, cb) => {
      if (ALLOWED_TYPES.includes(file.mimetype)) {
         cb(null, true);
      } else {
         cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Chỉ nhận file PDF, JPG hoặc PNG"));
      }
   }
});

/* ================== Nhận file bản án (field "banan") ================== */
const uploadBanAn = (req, res, next) => {
   upload.array("banan", MAX_FILES)(req, res, (err) => {
      if (!err) return next();

      const messages = {
         LIMIT_FILE_SIZE: "Mỗi file không được quá 10MB",
         LIMIT_FILE_COUNT: `Chỉ được gửi tối đa ${MAX_FILES} file`,
         LIMIT_UNEXPECTED_FILE: "Chỉ nhận file PDF, JPG hoặc PNG"
      };
      res.status(400).json({ code: 400, message: messages[err.code] || err.message });
   });
};

// Chuyển file multer sang dạng lưu trong hồ sơ
const toFileInfo = (file) => ({
   filename: file.filename,
   originalname: Buffer.from(file.originalname, "latin1").toString("utf8"),
   mimetype: file.mimetype,
   size: file.size
});

module.exports = {
   uploadBanAn,
   toFileInfo
};
