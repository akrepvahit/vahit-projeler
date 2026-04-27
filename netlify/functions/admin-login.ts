import type { Config } from "@netlify/functions";
import { createSessionCookie, validatePassword } from "./_shared/auth";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = (await req.json()) as { password?: string };
  const result = validatePassword(req, body.password?.trim() ?? "");

  if (!result.configured) {
    return Response.json(
      {
        authenticated: false,
        configured: false,
        message: result.message,
      },
      { status: 503 },
    );
  }

  if (!result.valid) {
    return Response.json(
      {
        authenticated: false,
        configured: true,
        message: "Admin şifresi yanlış.",
      },
      { status: 401 },
    );
  }

  return Response.json(
    {
      authenticated: true,
      configured: true,
      localDemo: result.localDemo,
    },
    {
      headers: {
        "Set-Cookie": createSessionCookie(req),
      },
    },
  );
};

export const config: Config = {
  path: "/api/admin/login",
  method: ["POST"],
};
