import type { Config } from "@netlify/functions";
import { readProjects } from "./_shared/projects";

export default async () => {
  const projects = await readProjects();

  return Response.json({
    projects,
  });
};

export const config: Config = {
  path: "/api/projects",
  method: ["GET"],
};
