const whitelist = [
   "*",
   "http://www.google.com",
   "http://localhost:3000"
]; //Danh sách các nguồn được phép truy cập (có thể thêm các nguồn khác nếu cần)
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin ||whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}

module.exports = corsOptions