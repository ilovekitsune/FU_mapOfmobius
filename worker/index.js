const JWT_ISSUER = "fu-mapofmobius-worker";
const JWT_AUDIENCE = "fu-mapofmobius-web";
const JWT_TTL_SECONDS = 2 * 60 * 60;
const PBKDF2_ITERATIONS = 100_000;
const PASSWORD_HASH_BYTES = 32;
const MAX_DISCORD_MESSAGE_LENGTH = 2_000;

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getAllowedOrigins(env);
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || getAllowedOrigins(env).includes(origin);
}

function isJsonRequest(request) {
  return request.headers.get("Content-Type")?.toLowerCase().includes("application/json") === true;
}

async function readJsonBody(request) {
  if (!isJsonRequest(request)) {
    return { error: "Content-Type 必須為 application/json", status: 415 };
  }

  const contentLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return { error: "請求內容過大", status: 413 };
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: "請求本文必須是 JSON 物件", status: 400 };
    }
    return { body };
  } catch {
    return { error: "無效的 JSON 請求格式", status: 400 };
  }
}

function hexToBytes(value) {
  if (typeof value !== "string" || value.length === 0 || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
    return null;
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function textToBase64Url(text) {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function base64UrlToBytes(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Invalid base64url value.");
  }

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function base64UrlToText(value) {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(base64UrlToBytes(value));
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function getAuthConfig(env) {
  const username = env.VALID_USERNAME;
  const nickname = env.VALID_NICKNAME;
  const salt = hexToBytes(env.PASSWORD_SALT_HEX);
  const passwordHash = hexToBytes(env.PASSWORD_HASH_HEX);
  const jwtSecret = env.JWT_SECRET;
  const invalidFields = [];

  if (typeof username !== "string" || username.trim().length === 0) {
    invalidFields.push("VALID_USERNAME (missing or blank)");
  }
  if (typeof nickname !== "string" || nickname.trim().length === 0) {
    invalidFields.push("VALID_NICKNAME (missing or blank)");
  }
  if (!salt || salt.length < 16) {
    invalidFields.push("PASSWORD_SALT_HEX (must be at least 32 hex characters)");
  }
  if (!passwordHash || passwordHash.length !== PASSWORD_HASH_BYTES) {
    invalidFields.push("PASSWORD_HASH_HEX (must be exactly 64 hex characters)");
  }
  if (typeof jwtSecret !== "string" || new TextEncoder().encode(jwtSecret).length < 32) {
    invalidFields.push("JWT_SECRET (must be at least 32 UTF-8 bytes)");
  }

  if (invalidFields.length > 0) return { config: null, invalidFields };
  return {
    config: { username, nickname, salt, passwordHash, jwtSecret },
    invalidFields,
  };
}

async function verifyPassword(inputPassword, salt, storedHash) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(inputPassword),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    PASSWORD_HASH_BYTES * 8,
  );
  return timingSafeEqual(new Uint8Array(derivedBits), storedHash);
}

async function importJwtKey(secret, usages) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function generateJwt(user, secret) {
  const now = Math.floor(Date.now() / 1_000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.username,
    user: user.username,
    name: user.nickname,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    iat: now,
    exp: now + JWT_TTL_SECONDS,
  };
  const encodedHeader = textToBase64Url(JSON.stringify(header));
  const encodedPayload = textToBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await importJwtKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyJwt(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(base64UrlToText(encodedHeader));
    if (!header || header.alg !== "HS256" || header.typ !== "JWT") return null;

    const key = await importJwtKey(secret, ["verify"]);
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!validSignature) return null;

    const payload = JSON.parse(base64UrlToText(encodedPayload));
    const now = Math.floor(Date.now() / 1_000);
    if (
      !payload || typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      payload.iss !== JWT_ISSUER ||
      payload.aud !== JWT_AUDIENCE ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function isDiscordWebhookUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "discord.com" || url.hostname === "discordapp.com") &&
      url.pathname.startsWith("/api/webhooks/");
  } catch {
    return false;
  }
}

async function handleLogin(request, env, corsHeaders) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, corsHeaders);

  const { username, password } = parsed.body;
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return jsonResponse(
      { success: false, error: "請提供 username 與 password" },
      400,
      corsHeaders,
    );
  }

  const { config, invalidFields } = getAuthConfig(env);
  if (!config) {
    console.error("Login unavailable. Invalid Worker configuration fields:", invalidFields);
    return jsonResponse({
      error: "登入服務尚未完成設定",
      configIssues: invalidFields,
    }, 500, corsHeaders);
  }

  try {
    const passwordMatches = await verifyPassword(password, config.salt, config.passwordHash);
    if (username !== config.username || !passwordMatches) {
      return jsonResponse(
        { success: false, error: "帳號或密碼錯誤" },
        401,
        corsHeaders,
      );
    }

    const token = await generateJwt(config, config.jwtSecret);
    return jsonResponse(
      {
        success: true,
        token,
        user: { username: config.username, nickname: config.nickname },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("Login failed while verifying credentials or signing the JWT.", error);
    return jsonResponse({ error: "登入服務發生錯誤，請稍後再試" }, 500, corsHeaders);
  }
}

async function handleSend(request, env, corsHeaders) {
  const { config, invalidFields } = getAuthConfig(env);
  if (!config) {
    console.error("Discord send unavailable. Invalid Worker configuration fields:", invalidFields);
    return jsonResponse({
      error: "登入服務尚未完成設定",
      configIssues: invalidFields,
    }, 500, corsHeaders);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) {
    return jsonResponse({ error: "未提供有效的 Bearer Token" }, 401, corsHeaders);
  }

  const decodedUser = await verifyJwt(match[1], config.jwtSecret);
  if (!decodedUser || decodedUser.sub !== config.username) {
    return jsonResponse({ error: "Token 無效或已過期，請重新登入" }, 403, corsHeaders);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, corsHeaders);
  const message = parsed.body.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return jsonResponse({ error: "請提供要傳送的 message" }, 400, corsHeaders);
  }
  if (message.length > MAX_DISCORD_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `message 不可超過 ${MAX_DISCORD_MESSAGE_LENGTH} 個字元` },
      400,
      corsHeaders,
    );
  }

  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!isDiscordWebhookUrl(webhookUrl)) {
    console.error("Discord send unavailable: DISCORD_WEBHOOK_URL is missing or invalid.");
    return jsonResponse({ error: "Discord 傳送服務尚未完成設定" }, 500, corsHeaders);
  }

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `[由網頁管理端 - ${decodedUser.name} 發送]: ${message}`,
      }),
    });

    if (!discordResponse.ok) {
      console.error("Discord webhook returned a non-success status:", discordResponse.status);
      return jsonResponse({ error: "Discord 傳送失敗，請稍後再試" }, 502, corsHeaders);
    }

    return jsonResponse({ success: true, sender: decodedUser.name }, 200, corsHeaders);
  } catch (error) {
    console.error("Could not reach Discord webhook.", error);
    return jsonResponse({ error: "無法連線 Discord，請稍後再試" }, 502, corsHeaders);
  }
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (!isAllowedOrigin(request, env)) {
      return jsonResponse({ error: "此來源不允許呼叫 API" }, 403, corsHeaders);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env, corsHeaders);
    }
    if (url.pathname === "/api/send" && request.method === "POST") {
      return handleSend(request, env, corsHeaders);
    }

    return jsonResponse({ error: "Not Found" }, 404, corsHeaders);
  },
};
Brian_MobiusStrip

MobiusStrip