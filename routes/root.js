const express = require("express");
const router = express.Router();
const path = require("path");

router.get("/{homepage}", (req, res) => {
    res.status(200).sendFile(path.join(__dirname, "..", "views", "trangchu.html"));
});

module.exports = router;