const express = require("express");
const router = express.Router();
const { sendNewUserAlert } = require("../services/emailService");

router.use("/user", require("./user.routes"));
router.use("/users", require("./users.routes"));
router.use("/service", require("./service.routes"));
router.use("/reservations", require("./reservation.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/admin", require("./admin.routes"));

module.exports = router;
