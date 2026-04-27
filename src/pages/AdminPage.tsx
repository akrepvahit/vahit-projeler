import { startTransition, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  PROJECT_STATUSES,
  type PortfolioProject,
  type PortfolioTransferFile,
  type ProjectStatus,
} from "../../shared/portfolio";
import {
  ApiError,
  createProject,
  deleteProject,
  getAdminProjects,
  getAdminSession,
  importAdminProjects,
  loginAdmin,
  logoutAdmin,
  updateProject,
  type ProjectPayload,
} from "../lib/api";

interface ProjectFormState {
  title: string;
  spotlight: string;
  category: string;
  year: string;
  status: ProjectStatus;
  shortDescription: string;
  fullDescription: string;
  liveUrl: string;
  repoUrl: string;
  techStack: string;
  coverImage: string;
  featured: boolean;
}

const createEmptyForm = (): ProjectFormState => ({
  title: "",
  spotlight: "",
  category: "",
  year: new Date().getFullYear().toString(),
  status: "Yayında",
  shortDescription: "",
  fullDescription: "",
  liveUrl: "",
  repoUrl: "",
  techStack: "React, Netlify",
  coverImage: "",
  featured: false,
});

function projectToForm(project: PortfolioProject): ProjectFormState {
  return {
    title: project.title,
    spotlight: project.spotlight,
    category: project.category,
    year: project.year,
    status: project.status,
    shortDescription: project.shortDescription,
    fullDescription: project.fullDescription,
    liveUrl: project.liveUrl,
    repoUrl: project.repoUrl,
    techStack: project.techStack.join(", "),
    coverImage: project.coverImage,
    featured: project.featured,
  };
}

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [form, setForm] = useState<ProjectFormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const session = await getAdminSession();
        if (cancelled) {
          return;
        }

        setAuthenticated(session.authenticated);
        if (session.authenticated) {
          await loadProjects();
        }
      } catch (error) {
        if (!cancelled && error instanceof ApiError && error.status === 503) {
          setSetupMessage(error.message);
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadProjects() {
    const items = await getAdminProjects();
    startTransition(() => {
      setProjects(items);
    });
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    try {
      await loginAdmin(password);
      setAuthenticated(true);
      setPassword("");
      await loadProjects();
      setFeedback({ type: "success", message: "Admin oturumu açıldı." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Giriş sırasında bir sorun oluştu.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await logoutAdmin();
      setAuthenticated(false);
      setProjects([]);
      setEditingId(null);
      setForm(createEmptyForm());
      setFeedback({ type: "success", message: "Oturum kapatıldı." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Çıkış yaparken bir hata oluştu.",
      });
    } finally {
      setBusy(false);
    }
  }

  function resetEditor() {
    setEditingId(null);
    setForm(createEmptyForm());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    const payload: ProjectPayload = {
      title: form.title,
      spotlight: form.spotlight,
      category: form.category,
      year: form.year,
      status: form.status,
      shortDescription: form.shortDescription,
      fullDescription: form.fullDescription,
      coverImage: form.coverImage,
      liveUrl: form.liveUrl,
      repoUrl: form.repoUrl,
      techStack: form.techStack
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      featured: form.featured,
    };

    try {
      if (editingId) {
        const updated = await updateProject(editingId, payload);
        startTransition(() => {
          setProjects((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
        });
        setFeedback({ type: "success", message: "Proje güncellendi." });
      } else {
        const created = await createProject(payload);
        startTransition(() => {
          setProjects((current) => [created, ...current]);
        });
        setFeedback({ type: "success", message: "Yeni proje eklendi." });
      }

      resetEditor();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Proje kaydedilirken hata oluştu.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(project: PortfolioProject) {
    const confirmed = window.confirm(
      `"${project.title}" projesini silmek istediğine emin misin?`,
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      await deleteProject(project.id);
      startTransition(() => {
        setProjects((current) => current.filter((item) => item.id !== project.id));
      });

      if (editingId === project.id) {
        resetEditor();
      }

      setFeedback({ type: "success", message: "Proje silindi." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Proje silinirken hata oluştu.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        coverImage: typeof reader.result === "string" ? reader.result : current.coverImage,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleExport() {
    const payload: PortfolioTransferFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateLabel = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `vahit-projeler-${dateLabel}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setFeedback({ type: "success", message: "Proje listesi JSON olarak indirildi." });
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      const raw = await file.text();
      const transfer = JSON.parse(raw) as PortfolioTransferFile;
      const replaceExisting = window.confirm(
        "Tamam dersen mevcut listedeki projeler silinir ve dosyadakilerle değiştirilir. İptal dersen dosyadaki projeler mevcut listenin üzerine eklenir veya aynı kimliktekiler güncellenir.",
      );

      const result = await importAdminProjects(transfer, replaceExisting ? "replace" : "merge");
      setEditingId(null);
      setForm(createEmptyForm());
      startTransition(() => {
        setProjects(result.projects);
      });
      setFeedback({
        type: "success",
        message:
          result.mode === "replace"
            ? `${result.imported} proje içe aktarıldı ve mevcut liste yenilendi.`
            : `${result.imported} proje içe aktarıldı ve mevcut listeyle birleştirildi.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "JSON içe aktarma sırasında hata oluştu.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!sessionReady) {
    return (
      <main className="admin-shell">
        <section className="admin-panel admin-panel--centered">
          <p className="inline-note">Admin paneli hazırlanıyor...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-topbar">
        <div>
          <p className="eyebrow">Yönetim alanı</p>
          <h1>Projelerini buradan düzenle</h1>
          <p>
            Buradan yeni proje ekleyebilir, mevcut bilgileri güncelleyebilir ve
            istemediğin kayıtları kaldırabilirsin.
          </p>
        </div>

        <div className="topbar-actions">
          <Link className="ghost-button" to="/">
            Siteye dön
          </Link>
          {authenticated ? (
            <button className="solid-button" onClick={handleLogout} type="button">
              Çıkış yap
            </button>
          ) : null}
        </div>
      </section>

      {feedback ? (
        <div
          className={feedback.type === "success" ? "notice notice--success" : "notice notice--error"}
        >
          {feedback.message}
        </div>
      ) : null}

      {!authenticated ? (
        <section className="admin-panel admin-panel--centered">
          <div className="login-card">
            <p className="eyebrow">Güvenli giriş</p>
            <h2>Yönetim paneline giriş</h2>
            <p>
              Buraya yalnızca yönetici şifresiyle giriş yapılır. Giriş yaptıktan sonra
              proje içeriklerini düzenleyebilirsin.
            </p>

            <form className="login-form" onSubmit={handleLogin}>
              <label>
                <span>Admin şifresi</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Şifreni gir"
                  required
                />
              </label>
              <button className="solid-button" type="submit" disabled={busy}>
                {busy ? "Giriş yapılıyor..." : "Giriş yap"}
              </button>
            </form>

            {setupMessage ? <p className="inline-note">{setupMessage}</p> : null}
          </div>
        </section>
      ) : (
        <section className="admin-grid">
          <div className="editor-column">
            <div className="admin-panel">
              <div className="section-heading section-heading--tight">
                <div>
                  <p className="eyebrow">Proje formu</p>
                  <h2>{editingId ? "Projeyi güncelle" : "Yeni proje ekle"}</h2>
                </div>
                {editingId ? (
                  <button className="ghost-button" onClick={resetEditor} type="button">
                    Yeni kayıt
                  </button>
                ) : null}
              </div>

              <form className="project-form" onSubmit={handleSubmit}>
                <div className="field-grid">
                  <label>
                    <span>Proje adı</span>
                    <input
                      value={form.title}
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                      placeholder="Örnek: Kurumsal tanıtım sitesi"
                      required
                    />
                  </label>

                  <label>
                    <span>Kategori</span>
                    <input
                      value={form.category}
                      onChange={(event) => setForm({ ...form, category: event.target.value })}
                      placeholder="Kurumsal Web"
                      required
                    />
                  </label>

                  <label>
                    <span>Öne çıkan kısa metin</span>
                    <input
                      value={form.spotlight}
                      onChange={(event) => setForm({ ...form, spotlight: event.target.value })}
                      placeholder="Örnek: Hızlı ve sade şirket sitesi"
                      required
                    />
                  </label>

                  <label>
                    <span>Yıl</span>
                    <input
                      value={form.year}
                      onChange={(event) => setForm({ ...form, year: event.target.value })}
                      placeholder="2026"
                      required
                    />
                  </label>

                  <label>
                    <span>Durum</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value as ProjectStatus })
                      }
                    >
                      {PROJECT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Teknolojiler</span>
                    <input
                      value={form.techStack}
                      onChange={(event) => setForm({ ...form, techStack: event.target.value })}
                      placeholder="Örnek: React, TypeScript, Netlify"
                      required
                    />
                  </label>
                </div>

                <label>
                  <span>Kısa açıklama</span>
                  <textarea
                    value={form.shortDescription}
                    onChange={(event) =>
                      setForm({ ...form, shortDescription: event.target.value })
                    }
                    rows={3}
                    placeholder="Kartta görünecek kısa açıklama"
                    required
                  />
                </label>

                <label>
                  <span>Detaylı açıklama</span>
                  <textarea
                    value={form.fullDescription}
                    onChange={(event) =>
                      setForm({ ...form, fullDescription: event.target.value })
                    }
                    rows={4}
                    placeholder="Projenin amacı, kapsamı ve öne çıkan yönleri"
                    required
                  />
                </label>

                <div className="field-grid">
                  <label>
                    <span>Canlı site bağlantısı</span>
                    <input
                      value={form.liveUrl}
                      onChange={(event) => setForm({ ...form, liveUrl: event.target.value })}
                      placeholder="https://ornek.com"
                    />
                  </label>

                  <label>
                    <span>Kaynak kod bağlantısı</span>
                    <input
                      value={form.repoUrl}
                      onChange={(event) => setForm({ ...form, repoUrl: event.target.value })}
                      placeholder="https://github.com/..."
                    />
                  </label>
                </div>

                <label>
                  <span>Kapak görseli bağlantısı</span>
                  <input
                    value={form.coverImage}
                    onChange={(event) => setForm({ ...form, coverImage: event.target.value })}
                    placeholder="https://..."
                  />
                </label>

                <label className="upload-field">
                  <span>Bilgisayardan görsel seç</span>
                  <input accept="image/*" type="file" onChange={handleImageUpload} />
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) => setForm({ ...form, featured: event.target.checked })}
                  />
                  <span>Öne çıkan proje olarak göster</span>
                </label>

                <div className="form-actions">
                  <button className="solid-button" type="submit" disabled={busy}>
                    {busy ? "Kaydediliyor..." : editingId ? "Değişiklikleri kaydet" : "Projeyi ekle"}
                  </button>
                  <button className="ghost-button" onClick={resetEditor} type="button">
                    Formu temizle
                  </button>
                </div>
              </form>
            </div>
          </div>

          <aside className="sidebar-column">
            <div className="admin-panel">
              <div className="section-heading section-heading--tight">
                <div>
                  <p className="eyebrow">Kayıtlı projeler</p>
                  <h2>{projects.length} proje kaydı</h2>
                </div>
              </div>

              <div className="transfer-card">
                <p className="transfer-title">JSON aktarımı</p>
                <p className="inline-note">
                  Localde hazırladığın proje listesini dışa aktarabilir, daha sonra canlıdaki
                  yönetim panelinden aynı dosyayı içe aktarabilirsin.
                </p>
                <div className="form-actions">
                  <button
                    className="ghost-button"
                    onClick={handleExport}
                    type="button"
                    disabled={busy || projects.length === 0}
                  >
                    JSON dışa aktar
                  </button>
                  <button
                    className="solid-button"
                    onClick={() => importInputRef.current?.click()}
                    type="button"
                    disabled={busy}
                  >
                    JSON içe aktar
                  </button>
                </div>
                <input
                  ref={importInputRef}
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImport}
                />
              </div>

              <div className="admin-stat-grid">
                <article>
                  <strong>{projects.length}</strong>
                  <span>Toplam</span>
                </article>
                <article>
                  <strong>{projects.filter((item) => item.featured).length}</strong>
                  <span>Öne çıkan</span>
                </article>
                <article>
                  <strong>{new Set(projects.map((item) => item.category)).size}</strong>
                  <span>Kategori</span>
                </article>
              </div>

              <div className="admin-list">
                {projects.map((project) => (
                  <article className="admin-project-card" key={project.id}>
                    <div className="admin-project-header">
                      <div>
                        <p className="project-spotlight">{project.spotlight}</p>
                        <h3>{project.title}</h3>
                      </div>
                      <span className="status-pill">{project.status}</span>
                    </div>

                    <p>{project.shortDescription}</p>

                    <div className="tag-row">
                      {project.techStack.slice(0, 3).map((item) => (
                        <span className="tag" key={item}>
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="project-footer">
                      <span>{project.category}</span>
                      <div className="project-links">
                        <button
                          className="link-like-button"
                          onClick={() => {
                            setEditingId(project.id);
                            setForm(projectToForm(project));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          type="button"
                        >
                          Düzenle
                        </button>
                        <button
                          className="link-like-button link-like-button--danger"
                          onClick={() => handleDelete(project)}
                          type="button"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {projects.length === 0 ? (
                  <div className="empty-state empty-state--compact">
                    <h3>Henüz kayıtlı proje yok.</h3>
                    <p>Soldaki formu kullanarak ilk proje kaydını oluştur.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
