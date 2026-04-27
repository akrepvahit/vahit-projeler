import type { Config } from "@netlify/functions";
import { getSessionState } from "./_shared/auth";

export default async (req: Request) => {
  const session = getSessionState(req);

  if (!session.configured) {
    return Response.json(
      {
        authenticated: false,
        configured: false,
        localDemo: false,
        message: session.message,
      },
      { status: 503 },
    );
  }

  return Response.json({
    authenticated: session.authenticated,
    configured: true,
    localDemo: session.localDemo,
  });
};

export const config: Config = {
  path: "/api/admin/session",
  method: ["GET"],
};
