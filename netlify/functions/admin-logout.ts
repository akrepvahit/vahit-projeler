import type { Config } from "@netlify/functions";
import { clearSessionCookie } from "./_shared/auth";

export default async (req: Request) => {
  return Response.json(
    {
      authenticated: false,
      configured: true,
    },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(req),
      },
    },
  );
};

export const config: Config = {
  path: "/api/admin/logout",
  method: ["POST"],
};
