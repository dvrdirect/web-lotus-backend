require("dotenv").config();
const mongoose = require("mongoose");
const { User, Reservation } = require("../src/models");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/web_lotus";

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({
    appointmentsHistory: { $exists: true, $ne: [] },
  });

  let inserted = 0;
  let skipped = 0;

  for (const user of users) {
    const history = user.appointmentsHistory || [];

    for (const item of history) {
      if (!item?.date || !(item?.service || item?.serviceName)) {
        skipped += 1;
        continue;
      }

      const serviceName = item.service || item.serviceName;
      const scheduledAt = new Date(item.date);
      if (Number.isNaN(scheduledAt.getTime())) {
        skipped += 1;
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
        skipped += 1;
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

      inserted += 1;
    }
  }

  console.log(
    `Migración completada. Insertadas: ${inserted}. Omitidas: ${skipped}.`,
  );
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Error en migración:", err);
  mongoose.disconnect();
  process.exit(1);
});
