const express = require("express");
const router = express.Router();
const { Reservation } = require("../models");
const auth = require("../middleware/auth");

// POST /api/reservations - crear una nueva reserva para el usuario autenticado
router.post("/", auth, async (req, res) => {
  try {
    const { serviceName, scheduledAt, notes } = req.body;
    if (!serviceName || !scheduledAt) {
      return res
        .status(400)
        .json({ error: "serviceName y scheduledAt son obligatorios" });
    }

    const reservation = await Reservation.create({
      user: req.user._id,
      serviceName,
      scheduledAt,
      notes,
    });

    res.status(201).json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/reservations - lista de reservas del usuario autenticado
router.get("/", auth, async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id })
      .sort({ scheduledAt: 1 })
      .lean();
    res.json(reservations);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/reservations/:id - cancelar/eliminar una reserva del usuario
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Reservation.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({ message: "Reserva eliminada" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
