const path = require("path");
const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "chaphanhvien.html"));
});

module.exports = router;