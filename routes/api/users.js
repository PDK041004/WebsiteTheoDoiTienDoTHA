const express = require("express");
const router = express.Router();
const path = require("path");
const usersController = require(path.join(__dirname, "..", "..", "controllers", "usersController.js"));

router.route("/")
   .get(usersController.getAllAccounts)
   .post(usersController.addAccount);

router.route("/:id")
   .put(usersController.updateAccount)
   .delete(usersController.deleteAccount);

module.exports = router;