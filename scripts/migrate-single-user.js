require("dotenv").config();
const mongoose = require("mongoose");
const { User, Reservation } = require("../src/models");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/lotusDB";

async function migrateSingle(userId) {
  await mongoose.connect(MONGO_URI);
  const user = await User.findById(userId);
  if (!user) {
    console.error("Usuario no encontrado", userId);
    await mongoose.disconnect();
    process.exit(1);
  }

  const history = user.appointmentsHistory || [];
  let inserted = 0;
  let skipped = 0;

  for (const item of history) {
    const serviceName = item.service || item.serviceName;
    const scheduledAt = new Date(item.date);
    if (!serviceName || Number.isNaN(scheduledAt.getTime())) {
      skipped++;
      continue;
    }

    const dayStart = new Date(scheduledAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledAt);
    dayEnd.setHours(23, 59, 59, 999);

    const exists = await Reservation.findOne({
      user: user._id,
      serviceName,
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await Reservation.create({
      user: user._id,
      email: user.email,
      serviceName,
      scheduledAt,
      notes: item.notes,
      status: "completed",
      createdBy: item.addedByAdmin ? "admin" : "user",
    });

    inserted++;
  }

  const reservations = await Reservation.find({ user: user._id })
    .sort({ scheduledAt: -1 })
    .lean();
  console.log(JSON.stringify({ inserted, skipped, reservations }, null, 2));

  await mongoose.disconnect();
}

const userId = process.argv[2];
if (!userId) {
  console.error("Uso: node migrate-single-user.js <userId>");
  process.exit(1);
}

migrateSingle(userId).catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
