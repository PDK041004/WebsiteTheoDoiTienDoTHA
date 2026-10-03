const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const database = require('./database');

/* ================== Middlewares ================== */
const whitelist = ['*', 'http://www.google.com', 'http://localhost:3000'];
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    exposedHeaders: ['Content-Type', 'Authorization'],
}
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public', 'views')));

/* ================== ĐĂNG KÝ ================== */
app.post('/register', (req, res) => {
    const { username, password, fullname } = req.body;

    const sql = `
        INSERT INTO users(username, password, fullname, role)
        VALUES (?, ?, ?, 'Người dân')
    `;

    database.query(sql, [username, password, fullname], (err) => {
        if (err) return res.send('Lỗi');
        res.send('Đăng ký thành công');
    });
});

/* ================== Log-In ================== */
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username=? AND password=?';
    database.query(sql, [username, password], (err, result) => {

        if (result.length > 0) {
            res.json({
                role: result[0].role
            });
        } else {
            res.json({
                role: null
            });
        }
    });
});

/* ================== LẤY HỒ SƠ ================== */
app.get("/hoso", (req, res) => {
    database.query("SELECT * FROM hoso", (err, result) => {
        res.json(result);
    });
});

/* ==================Thêm tài khoản================== */
app.post("/users", (req, res) => {
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

/* ================== gửi hs ================== */
app.post('/hoso', (req, res) => {

    console.log('DATA NHẬN:', req.body); // 🔥 thêm dòng này

    const { tennguoi, cccd, noidung, loaihoso, danhmuc } = req.body;

    const sql = `
        INSERT INTO hoso(mahoso, tennguoi, cccd, noidung, loaihoso, danhmuc, trangthai)
        VALUES (?, ?, ?, ?, ?, ?, 'Chưa xử lý')
    `;

    database.query(sql, [
        'HS' + Date.now(),
        tennguoi,
        cccd,
        noidung,
        loaihoso,
        danhmuc
    ], (err) => {
        if(err){
            console.log('SQL ERROR:', err); // 🔥 bắt lỗi thật
            return res.send('Lỗi');
        }
        res.send('Gửi hồ sơ thành công');
    });
});

/* ================== nhận hs ================== */
app.get("/hoso-chuaxuly", (req, res) => {
    database.query(
        "SELECT * FROM hoso WHERE assigned_to IS NULL",
        (err, result) => res.json(result)
    );
});

/* ================== cập nhật hs ================== */
app.put("/hoso/update/:id", (req, res) => {
    const { loaihoso, danhmuc } = req.body;

    database.query(
        "UPDATE hoso SET loaihoso=?, danhmuc=? WHERE id=?",
        [loaihoso, danhmuc, req.params.id],
        (err) => res.send("Đã cập nhật")
    );
});

/* ================== phân công hs ================== */
app.put("/phancong", (req, res) => {
    const { hosoIds, officerId } = req.body;

    database.query(
        "UPDATE hoso SET assigned_to=?, status='Đã phân công' WHERE id IN (?)",
        [officerId, hosoIds],
        (err) => res.send("Đã phân công")
    );
});

/* ================== chapHV nhận hs ================== */
app.get("/hoso-cua-toi/:id", (req, res) => {
    database.query(
        "SELECT * FROM hoso WHERE assigned_to=?",
        [req.params.id],
        (err, result) => res.json(result)
    );
});

/* ================== trạng thái hs ================== */
app.put("/hoso/status/:id", (req, res) => {
    const { status } = req.body;

    database.query(
        "UPDATE hoso SET status=? WHERE id=?",
        [status, req.params.id],
        (err) => res.send("Đã cập nhật")
    );
});

/* ================== Routers ================== */
app.use('/', require('./routers/root'));
app.all('{*any}', (req, res) => {
    res.status(404);
    if(req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'public', 'views', '404.html'));
    }
});

/* ================== Start-Up ================== */
app.listen(3000, () => {
    console.log('Server chạy tại http://localhost:3000');
});