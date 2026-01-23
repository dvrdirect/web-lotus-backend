require("dotenv").config();
const mongoose = require("mongoose");
const { User, Reservation } = require("../src/models");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/lotusDB";

async function run(userId) {
  await mongoose.connect(MONGO_URI);

  const user = await User.findById(userId);
  if (!user) {
    console.error("Usuario no encontrado", userId);
    await mongoose.disconnect();
    process.exit(1);
  }

  const beforeCount = await Reservation.countDocuments({ user: user._id });

  const scheduledAt = new Date();
  scheduledAt.setSeconds(0, 0);

  const created = await Reservation.create({
    user: user._id,
    email: user.email,
    serviceName: "TEST DELETE RESERVATION",
    scheduledAt,
    notes: "prueba-eliminar",
    status: "completed",
    createdBy: "admin",
  });

  const afterCreateCount = await Reservation.countDocuments({ user: user._id });

  // Now delete the reservation we just created
  await Reservation.findByIdAndDelete(created._id);

  // Recalculate user's appointmentsCount and remove history items matching
  const totalAfterDelete = await Reservation.countDocuments({ user: user._id });
  user.appointmentsCount = totalAfterDelete;
  user.appointmentsHistory = (user.appointmentsHistory || []).filter((item) => {
    if (!item || !item.date || !item.service) return true;
    const itemDateKey = new Date(item.date).toISOString().slice(0, 10);
    const resDateKey = new Date(scheduledAt).toISOString().slice(0, 10);
    return !(
      itemDateKey === resDateKey && item.service === "TEST DELETE RESERVATION"
    );
  });
  await user.save();

  console.log(
    JSON.stringify(
      {
        userId: String(user._id),
        beforeCount,
        afterCreateCount,
        afterDeleteCount: totalAfterDelete,
        userAppointmentsCount: user.appointmentsCount,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

const userId = process.argv[2] || "6972c246b82a8b7b47ca13f9";
if (!userId) {
  console.error("Uso: node test-delete-reservation.js <userId>");
  process.exit(1);
}

run(userId).catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
