require("dotenv").config();
const path = require("path");
const express = require("express");
const app = express();
const credentials = require(path.join(__dirname, "middlewares", "credentials"));
const cors = require("cors");
const corsOptions = require(path.join(__dirname, "configs", "corsOptions"));
const verifyJWT = require(path.join(__dirname, "middlewares", "verifyJWT.js"));
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Account = require(path.join(__dirname, "models", "Account"));
const mongoose = require("mongoose");
const connection = require(path.join(__dirname, "configs", "database"));
const port = 3000;

/* ================== Kết nối cơ sở dữ liệu ================== */
connection(); // Kết nối MongoDB

/* ================== Middleware ================== */
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
/* ================== Chỉ admin (role 3) được vào các trang quản trị ================== */
const requireAdmin = async (req, res, next) => {
    try {
        const token = req.cookies?.jwt;
        let account = null;

        if (token) {
            try {
                jwt.verify(token, process.env.REFRESH_TOKEN);   // đúng chữ ký và còn hạn
                account = await Account.findOne({ refreshToken: token }).select("role").lean();
            } catch (err) {
                account = null;
            }
        }

        if (account && account.role === 3) return next();

        // API trả JSON, còn trang HTML thì đưa về trang chủ
        if (req.originalUrl.includes("/api")) {
            return res.status(403).json({ message: "Chỉ admin mới được truy cập." });
        }
        return res.redirect("/trang-chu");
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

app.get("/tai-khoan", requireAdmin);                                 // trang quản lý tài khoản
app.use("/tai-khoan/api", requireAdmin);                             // API quản lý tài khoản
app.use(["/bao-cao", "/phieu-thu", "/doanh-thu"], requireAdmin);     // báo cáo hồ sơ, lập phiếu thu, doanh thu
app.use(["/taikhoan.html", "/baocao.html", "/lapphieuthu.html", "/doanhthu.html"], requireAdmin); // mở thẳng file HTML
app.use("/", express.static(path.join(__dirname, "views")));

/* ================== Đường dẫn ================== */
app.use("/", require(path.join(__dirname, "routes", "root"))); //Trang chủ

/* ================== APIs ================== */
app.use("/dang-nhap", require(path.join(__dirname, "routes", "api", "auth"))); //Đăng nhập

app.use("/refresh", require(path.join(__dirname, "routes", "api", "refresh"))); //Refresh token

app.use("/dang-xuat", require(path.join(__dirname, "routes", "api", "signout"))); //Đăng xuất

// app.use(verifyJWT); //Middleware xác thực JWT cho các route phía dưới

app.use("/tai-khoan", require(path.join(__dirname, "routes", "api", "accounts"))); //Quản lý tài khoản

app.use("/bao-cao", require(path.join(__dirname, "routes", "api", "adminBaoCao"))); //Báo cáo hồ sơ theo tháng (admin)

app.use("/", require(path.join(__dirname, "routes", "api", "adminPhieuThu"))); //Lập phiếu thu và báo cáo doanh thu (admin)

app.use("/thi-hanh-an", require(path.join(__dirname, "routes", "api", "bailiffs"))); //Thi hành án

app.use("/ban-an", require(path.join(__dirname, "routes", "api", "judgements"))); //Theo dõi tiến độ và yêu cầu thi hành bản án

app.all("{*any}", (req, res) => {
    res.status(404);
    if(req.accepts("html")){
        res.sendFile(path.join(__dirname, "views", "phanhoi404.html"));
    }
});

/* ================== Khởi động server ================== */
mongoose.connection.once("open", () => {
    app.listen(port, () => {
        console.log(`Server chạy tại http://localhost:${port}/trang-chu`);
    });
});