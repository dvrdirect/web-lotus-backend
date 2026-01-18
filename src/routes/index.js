const express = require("express");
const router = express.Router();

router.use("/user", require("./user.routes"));
router.use("/service", require("./service.routes"));
router.use("/reservations", require("./reservation.routes"));
router.use("/auth", require("./auth.routes"));

module.exports = router;
