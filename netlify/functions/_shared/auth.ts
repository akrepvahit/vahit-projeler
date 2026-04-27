import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "vahit_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const LOCAL_PASSWORD = "vahit-demo";
const LOCAL_SECRET = "local-demo-secret";

function isLocalRequest(req: Request) {
  const host = new URL(req.url).hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function getRuntimeConfig(req: Request) {
  const local = isLocalRequest(req);
  const password = Netlify.env.get("ADMIN_PASSWORD") ?? (local ? LOCAL_PASSWORD : undefined);
  const secret = Netlify.env.get("AUTH_SECRET") ?? (local ? LOCAL_SECRET : undefined);

  if (!password || !secret) {
    return null;
  }

  return {
    password,
    secret,
    localDemo: !Netlify.env.get("ADMIN_PASSWORD") || !Netlify.env.get("AUTH_SECRET"),
  };
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function parseCookies(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const entries = new Map<string, string>();

  if (!cookieHeader) {
    return entries;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      continue;
    }

    entries.set(rawKey, rawValue.join("="));
  }

  return entries;
}

function safeCompare(left: string, right: string, secret: string) {
  const leftDigest = createHmac("sha256", secret).update(left).digest();
  const rightDigest = createHmac("sha256", secret).update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function getSessionState(req: Request) {
  const config = getRuntimeConfig(req);

  if (!config) {
    return {
      authenticated: false,
      configured: false,
      localDemo: false,
      message:
        "ADMIN_PASSWORD ve AUTH_SECRET Netlify environment variable olarak tanimlanmali.",
    };
  }

  const token = parseCookies(req).get(COOKIE_NAME);
  if (!token) {
    return {
      authenticated: false,
      configured: true,
      localDemo: config.localDemo,
    };
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeCompare(signature, sign(payload, config.secret), config.secret)) {
    return {
      authenticated: false,
      configured: true,
      localDemo: config.localDemo,
    };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp: number;
    };

    if (parsed.exp < Date.now()) {
      return {
        authenticated: false,
        configured: true,
        localDemo: config.localDemo,
      };
    }
  } catch {
    return {
      authenticated: false,
      configured: true,
      localDemo: config.localDemo,
    };
  }

  return {
    authenticated: true,
    configured: true,
    localDemo: config.localDemo,
  };
}

export function validatePassword(req: Request, password: string) {
  const config = getRuntimeConfig(req);

  if (!config) {
    return {
      valid: false,
      configured: false,
      localDemo: false,
      message:
        "ADMIN_PASSWORD ve AUTH_SECRET Netlify environment variable olarak tanimlanmali.",
    };
  }

  return {
    valid: safeCompare(password, config.password, config.secret),
    configured: true,
    localDemo: config.localDemo,
  };
}

export function createSessionCookie(req: Request) {
  const config = getRuntimeConfig(req);
  if (!config) {
    throw new Error("Auth config eksik.");
  }

  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE * 1000 }),
    "utf8",
  ).toString("base64url");
  const token = `${payload}.${sign(payload, config.secret)}`;
  const secureFlag = isLocalRequest(req) ? "" : "; Secure";

  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secureFlag}`;
}

export function clearSessionCookie(req: Request) {
  const secureFlag = isLocalRequest(req) ? "" : "; Secure";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

export function requireAdmin(req: Request) {
  const session = getSessionState(req);

  if (!session.configured) {
    return Response.json(
      {
        message: session.message,
      },
      { status: 503 },
    );
  }

  if (!session.authenticated) {
    return Response.json(
      {
        message: "Bu islem icin admin girisi gerekli.",
      },
      { status: 401 },
    );
  }

  return null;
}
