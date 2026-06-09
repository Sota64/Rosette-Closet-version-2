const cookieParser = (req, res, next) => {
  req.cookies = {};

  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return next();
  }

  cookieHeader.split(";").forEach((cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (!rawName) {
      return;
    }

    req.cookies[rawName] = decodeURIComponent(rawValue.join("="));
  });

  return next();
};

module.exports = cookieParser;
