// Simple re-exports of models
// This makes it easy to import from a single place.

module.exports = {
  User: require("./user.model"),
  Service: require("./service.model"),
  Reservation: require("./reservation.model"),
};
