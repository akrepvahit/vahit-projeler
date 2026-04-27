import type { Config } from "@netlify/functions";
import { requireAdmin } from "./_shared/auth";
import { normalizeImportedProjects, readProjects, writeProjects } from "./_shared/projects";

type ImportMode = "merge" | "replace";

export default async (req: Request) => {
  const authError = requireAdmin(req);
  if (authError) {
    return authError;
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      mode?: ImportMode;
      transfer?: unknown;
    };

    const mode: ImportMode = body.mode === "replace" ? "replace" : "merge";
    const importedProjects = normalizeImportedProjects(body.transfer);

    const nextProjects =
      mode === "replace"
        ? importedProjects
        : mergeProjects(await readProjects(), importedProjects);

    const projects = await writeProjects(nextProjects);

    return Response.json({
      projects,
      imported: importedProjects.length,
      mode,
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "İçe aktarma sırasında bir hata oluştu.",
      },
      { status: 400 },
    );
  }
};

function mergeProjects(currentProjects: Awaited<ReturnType<typeof readProjects>>, importedProjects: Awaited<ReturnType<typeof normalizeImportedProjects>>) {
  const byId = new Map(currentProjects.map((project) => [project.id, project]));

  for (const importedProject of importedProjects) {
    byId.set(importedProject.id, importedProject);
  }

  return Array.from(byId.values());
}

export const config: Config = {
  path: "/api/admin/projects-transfer",
  method: ["POST"],
};
