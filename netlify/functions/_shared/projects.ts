import { getStore } from "@netlify/blobs";
import {
  PROJECT_STATUSES,
  createPlaceholderCover,
  demoProjects,
  type PortfolioProject,
  type ProjectStatus,
  type PortfolioTransferFile,
} from "../../../shared/portfolio";

const store = getStore({
  name: "vahit-projects",
  consistency: "strong",
});

const PROJECTS_KEY = "portfolio-projects";

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return fallback;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("data:image") || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function normalizeTechStack(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return fallback;
}

function normalizeStatus(value: string): ProjectStatus {
  const statusMap: Record<string, ProjectStatus> = {
    Yayinda: "Yayında",
    Yayında: "Yayında",
    Gelistiriliyor: "Geliştiriliyor",
    Geliştiriliyor: "Geliştiriliyor",
    Bakimda: "Bakımda",
    Bakımda: "Bakımda",
  };

  const mapped = statusMap[value];
  if (mapped) {
    return mapped;
  }

  if (PROJECT_STATUSES.includes(value as ProjectStatus)) {
    return value as ProjectStatus;
  }

  return "Yayında";
}

function normalizeDate(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function sortProjects(items: PortfolioProject[]) {
  return [...items].sort((left, right) => {
    if (left.featured !== right.featured) {
      return Number(right.featured) - Number(left.featured);
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export async function readProjects() {
  const saved = (await store.get(PROJECTS_KEY, {
    type: "json",
  })) as PortfolioProject[] | null;

  if (saved === null) {
    return sortProjects(demoProjects);
  }

  if (!Array.isArray(saved)) {
    return sortProjects(demoProjects);
  }

  return sortProjects(saved);
}

export async function writeProjects(projects: PortfolioProject[]) {
  const sorted = sortProjects(projects);
  await store.setJSON(PROJECTS_KEY, sorted);
  return sorted;
}

export function createProjectRecord(
  input: unknown,
  existing?: PortfolioProject,
): PortfolioProject {
  const payload =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const title = normalizeText(payload.title, existing?.title ?? "");
  const shortDescription = normalizeText(
    payload.shortDescription,
    existing?.shortDescription ?? "",
  );

  if (!title) {
    throw new Error("Proje adı gerekli.");
  }

  if (!shortDescription) {
    throw new Error("Kısa açıklama gerekli.");
  }

  const coverImageInput = normalizeText(payload.coverImage, existing?.coverImage ?? "");
  const coverImage = coverImageInput ? normalizeUrl(coverImageInput) : createPlaceholderCover(title);

  if (coverImage.length > 2_500_000) {
    throw new Error("Kapak görseli çok büyük. Daha küçük bir görsel deneyin.");
  }

  return {
    id: existing?.id ?? crypto.randomUUID(),
    title,
    spotlight: normalizeText(payload.spotlight, existing?.spotlight ?? "Dijital vitrin projesi"),
    category: normalizeText(payload.category, existing?.category ?? "Web Uygulaması"),
    year: normalizeText(payload.year, existing?.year ?? new Date().getFullYear().toString()),
    status: normalizeStatus(normalizeText(payload.status, existing?.status ?? "Yayında")),
    shortDescription,
    fullDescription: normalizeText(payload.fullDescription, shortDescription),
    coverImage,
    liveUrl: normalizeUrl(normalizeText(payload.liveUrl, existing?.liveUrl ?? "")),
    repoUrl: normalizeUrl(normalizeText(payload.repoUrl, existing?.repoUrl ?? "")),
    techStack: normalizeTechStack(payload.techStack, existing?.techStack ?? ["React", "Netlify"]),
    featured: normalizeBoolean(payload.featured, existing?.featured ?? false),
    updatedAt: new Date().toISOString(),
  };
}

export function parseTransferFile(input: unknown) {
  if (Array.isArray(input)) {
    return input;
  }

  if (input && typeof input === "object" && Array.isArray((input as PortfolioTransferFile).projects)) {
    return (input as PortfolioTransferFile).projects;
  }

  throw new Error("İçe aktarılan dosya geçerli değil.");
}

export function createImportedProjectRecord(input: unknown): PortfolioProject {
  const payload =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const project = createProjectRecord(payload);
  const importedId = normalizeText(payload.id, project.id);
  const importedUpdatedAt = normalizeDate(payload.updatedAt, project.updatedAt);

  return {
    ...project,
    id: importedId || crypto.randomUUID(),
    updatedAt: importedUpdatedAt,
  };
}

export function normalizeImportedProjects(input: unknown) {
  const items = parseTransferFile(input);

  if (items.length > 200) {
    throw new Error("Tek seferde en fazla 200 proje içe aktarılabilir.");
  }

  return sortProjects(items.map((item) => createImportedProjectRecord(item)));
}
