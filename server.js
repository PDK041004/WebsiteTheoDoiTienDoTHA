require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path")
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

/* ================== Routes ================== */
app.use("/", require("./routes/root")); //Homepage

/* ================== APIs ================== */
app.use("/accounts", require("./routes/api/accounts"));//Account
app.use("/users", require("./routes/api/users"));//Users (admin quản lý tài khoản)

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