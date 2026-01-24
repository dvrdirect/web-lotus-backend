const express = require("express");
const router = express.Router();
const { sendNewUserAlert } = require("../services/emailService");

router.use("/user", require("./user.routes"));
router.use("/service", require("./service.routes"));
router.use("/reservations", require("./reservation.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/admin", require("./admin.routes"));

// TEST: endpoint temporal para probar SMTP (eliminar después de validar)
router.post("/test-email", async (req, res) => {
  try {
    const testUser = {
      name: "Prueba SMTP",
      email: "prueba@correo.com",
      createdAt: new Date(),
    };
    const result = await sendNewUserAlert(testUser);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
