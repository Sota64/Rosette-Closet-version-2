const crypto = require("crypto");

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

const base64UrlEncode = (value) => {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
};

const base64UrlDecode = (value) => {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
};

const getTokenSecret = () => {
  return process.env.JWT_SECRET || "rosette-closet-dev-secret";
};

const signToken = (payload, expiresInSeconds) => {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
};

const verifyToken = (token, expectedType) => {
  if (!token) {
    throw new Error("Token khong ton tai");
  }

  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error("Token khong hop le");
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(unsignedToken)
    .digest("base64url");

  if (signature.length !== expectedSignature.length) {
    throw new Error("Chu ky token khong hop le");
  }

  const isValidSignature = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValidSignature) {
    throw new Error("Chu ky token khong hop le");
  }

  const payload = base64UrlDecode(encodedPayload);
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw new Error("Token da het han");
  }

  if (expectedType && payload.type !== expectedType) {
    throw new Error("Sai loai token");
  }

  return payload;
};

const createAccessToken = (user) => {
  return signToken(
    {
      id: user._id.toString(),
      role: user.role,
      type: "access"
    },
    ACCESS_TOKEN_EXPIRES_IN_SECONDS
  );
};

const createRefreshToken = (user) => {
  return signToken(
    {
      id: user._id.toString(),
      role: user.role,
      type: "refresh"
    },
    REFRESH_TOKEN_EXPIRES_IN_SECONDS
  );
};

const buildCookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, buildCookieOptions(ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000));
  res.cookie("refreshToken", refreshToken, buildCookieOptions(REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000));
};

const setAccessCookie = (res, accessToken) => {
  res.cookie("accessToken", accessToken, buildCookieOptions(ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000));
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  setAccessCookie,
  clearAuthCookies,
  verifyToken
};
