const path = require("path");
const express = require("express");
const router = express.Router();
const accountsController = require(path.join(__dirname, "..", "controllers", "accountsController.js"));

router.get("/{trang-chu}", (req, res) => {
    res.status(200).sendFile(path.join(__dirname, "..", "views", "trangchu.html"));
});

module.exports = router;