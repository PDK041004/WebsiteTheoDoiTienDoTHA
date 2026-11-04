require("dotenv").config();
const path = require("path");
const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = require(path.join(__dirname, "configs", "corsOptions"));
const verifyJWT = require("./verifyJWT.js");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const connection = require(path.join(__dirname, "configs", "database"));
const port = 3000;

/* ================== Kết nối cơ sở dữ liệu ================== */
connection(); // Kết nối MongoDB

/* ================== Middleware ================== */
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use("/", express.static(path.join(__dirname, "views")));

/* ================== Đường dẫn ================== */
app.use("/", require(path.join(__dirname, "routes", "root"))); //Trang chủ

/* ================== APIs ================== */
app.use("/dang-nhap", require(path.join(__dirname, "routes", "api", "auth"))); //Đăng nhập

app.use("/refresh", require(path.join(__dirname, "routes", "api", "refresh"))); //Refresh token

app.use("/dang-xuat", require(path.join(__dirname, "routes", "api", "signout"))); //Đăng xuất

// app.use(verifyJWT); //Middleware xác thực JWT cho các route phía dưới

app.use("/tai-khoan", require(path.join(__dirname, "routes", "api", "accounts"))); //Quản lý tài khoản

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
    console.log("Kết nối MongoDB thành công");
    app.listen(port, () => {
        console.log(`Server chạy tại http://localhost:${port}/trang-chu`);
    });
});