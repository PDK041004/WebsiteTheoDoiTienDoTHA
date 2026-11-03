require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path")
// const database = require('./database');
const mongoose = require("mongoose");
const connection = require("./configs/database");
const port = 3000

/* ================== Database connection ================== */
connection(); // Kết nối MongoDB

/* ================== Middleware ================== */
const whitelist = ["*", "http://www.google.com", `http://localhost:${port}`];
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
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/", express.static(path.join(__dirname, "views")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // File bản án người dân gửi

/* ==================Thêm tài khoản================== */
app.post('/users', (req, res) => {
    const { username, password, fullname, role } = req.body;

    const sql = "INSERT INTO users(username,password,fullname,role) VALUES (?,?,?,?)";
    database.query(sql, [username, password, fullname, role], (err) => {
        if (err) return res.send("Lỗi thêm");
        res.send("Thêm thành công");
    });
});

/* ================== danh sách tk ================== */
app.get("/users", (req, res) => {
    database.query("SELECT * FROM users", (err, result) => {
        res.json(result);
    });
});

/* ================== Sửa tk ================== */
app.put("/users/:id", (req, res) => {
    const { fullname, role } = req.body;

    const sql = "UPDATE users SET fullname=?, role=? WHERE id=?";
    database.query(sql, [fullname, role, req.params.id], (err) => {
        if (err) return res.send("Lỗi sửa");
        res.send("Đã cập nhật");
    });
});

/* ================== Xóa tk ================== */
app.delete("/users/:id", (req, res) => {
    database.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
        if (err) return res.send("Lỗi xóa");
        res.send("Đã xóa");
    });
});

/* ================== Routes ================== */
app.use("/", require("./routes/root")); //Homepage

/* ================== APIs ================== */
app.use("/accounts", require("./routes/api/accounts"));//Account
app.use("/hoso", require("./routes/api/hoso"));//Hồ sơ
app.use("/enforcers", require("./routes/api/enforcers"));//Chấp hành viên
app.use("/phongban", require("./routes/api/phongban"));//Phòng ban
app.use("/thongbao", require("./routes/api/thongbao"));//Thông báo

app.all("{*any}", (req, res) => {
    res.status(404);
    if(req.accepts("html")){
        res.sendFile(path.join(__dirname, "views", "phanhoi404.html"));
    }
});

/* ================== Start-Up ================== */
mongoose.connection.once("open", () => {
    console.log("Kết nối MongoDB thành công");
    app.listen(port, () => {
        console.log(`Server chạy tại http://localhost:${port}/homepage`);
    });
});

