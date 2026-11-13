const path = require("path");
const express = require("express");
const router = express.Router();
const { handleSignOut } = require(path.join(__dirname, "..", "..", "controllers", "signOutController"));

router.get("/", handleSignOut);

module.exports = router;