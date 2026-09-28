function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).send('401 Unauthorized');
  }
  next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).send('401 Unauthorized');
    if (!roles.includes(req.session.user.role)) return res.status(403).send('403 Forbidden');
    next();
  };
}

module.exports = { requireAuth, allowRoles };