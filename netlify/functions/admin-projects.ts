import type { Config, Context } from "@netlify/functions";
import { requireAdmin } from "./_shared/auth";
import { createProjectRecord, readProjects, writeProjects } from "./_shared/projects";

export default async (req: Request, context: Context) => {
  const authError = requireAdmin(req);
  if (authError) {
    return authError;
  }

  const projectId = context.params.id;
  const currentProjects = await readProjects();

  switch (req.method) {
    case "GET":
      return Response.json({ projects: currentProjects });

    case "POST": {
      const body = await req.json();
      const project = createProjectRecord(body);
      const projects = await writeProjects([project, ...currentProjects]);
      return Response.json(
        {
          project: projects.find((item) => item.id === project.id) ?? project,
        },
        { status: 201 },
      );
    }

    case "PUT": {
      if (!projectId) {
        return Response.json({ message: "Proje kimliği eksik." }, { status: 400 });
      }

      const existing = currentProjects.find((item) => item.id === projectId);
      if (!existing) {
        return Response.json({ message: "Proje bulunamadı." }, { status: 404 });
      }

      const body = await req.json();
      const updated = createProjectRecord(body, existing);
      const projects = await writeProjects(
        currentProjects.map((item) => (item.id === projectId ? updated : item)),
      );

      return Response.json({
        project: projects.find((item) => item.id === projectId) ?? updated,
      });
    }

    case "DELETE": {
      if (!projectId) {
        return Response.json({ message: "Proje kimliği eksik." }, { status: 400 });
      }

      const exists = currentProjects.some((item) => item.id === projectId);
      if (!exists) {
        return Response.json({ message: "Proje bulunamadı." }, { status: 404 });
      }

      await writeProjects(currentProjects.filter((item) => item.id !== projectId));
      return Response.json({ id: projectId });
    }

    default:
      return new Response("Method not allowed", { status: 405 });
  }
};

export const config: Config = {
  path: ["/api/admin/projects", "/api/admin/projects/:id"],
  method: ["GET", "POST", "PUT", "DELETE"],
};
