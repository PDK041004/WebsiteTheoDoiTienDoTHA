const path = require("path");
const express = require("express");
const router = express.Router();
const judgementsController = require(path.join(__dirname, "..", "..", "controllers", "judgementsController.js"));

router.get("/", async (req, res) => {
   await res.status(200).sendFile(path.join(__dirname, "..", "..", "views", "nguoidan.html"));
});

/* ================== Quản lý bản án ================== */
router.route("/api")
   .get(judgementsController.getAllJudgements)
   .get(judgementsController.getJudgement)
   .post(judgementsController.registerJudgement)
   .put(judgementsController.updateJudgement);

module.exports = router;