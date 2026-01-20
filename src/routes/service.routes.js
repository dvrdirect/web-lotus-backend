const express = require("express");
const router = express.Router();
const { Service, User } = require("../models");

const auth = require("../middleware/auth");

// POST: crear objeto de datos hecho por el usuario
router.post("/", auth, async (req, res) => {
  try {
    // Se asume que Service tiene un campo userId (no implementado aún)
    // const service = await Service.create({ ...req.body, userId: req.user._id });
    // res.status(201).json(service);
    res.status(201).json({ message: "Service created (placeholder)" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE: elimina el objeto de datos creado por el usuario
router.delete("/:id", auth, async (req, res) => {
  try {
    // const deleted = await Service.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    // if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: "Service deleted (placeholder)" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
