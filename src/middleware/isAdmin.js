module.exports = function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Backward compatible: allow legacy admin email.
  const email = String(req.user.email || "").toLowerCase();
  if (email === "dvrdirect@gmail.com") {
    return next();
  }

  // Role-based access (staff/admin)
  const role = req.user.role;
  if (role === "admin" || role === "staff") {
    return next();
  }

  {
    return res.status(403).json({ error: "Forbidden" });
  }
};
