import { useDeferredValue, useEffect, useState } from "react";
import { demoProjects, type PortfolioProject } from "../../shared/portfolio";
import { getProjects } from "../lib/api";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

export default function HomePage() {
  const [projects, setProjects] = useState<PortfolioProject[]>(demoProjects);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tüm projeler");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const items = await getProjects();
        if (!cancelled) {
          setProjects(items);
        }
      } catch {
        if (!cancelled) {
          setError("Projeler şu anda yüklenemedi. Lütfen biraz sonra tekrar deneyin.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = [
    "Tüm projeler",
    ...new Set(projects.map((project) => project.category)),
  ];

  const filteredProjects = projects.filter((project) => {
    const matchesCategory =
      activeCategory === "Tüm projeler" || project.category === activeCategory;
    const searchTarget = [
      project.title,
      project.category,
      project.shortDescription,
      project.techStack.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = deferredQuery ? searchTarget.includes(deferredQuery) : true;
    return matchesCategory && matchesQuery;
  });

  const visibleProjects = filteredProjects;
  const categoryCount = new Set(projects.map((project) => project.category)).size;
  const hasProjects = projects.length > 0;

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Vahit Projeler</p>
            <h1 className="brand-lockup">Web sitesi ve uygulama portfolyosu</h1>
          </div>

          <nav className="topbar-actions">
            <a className="ghost-button" href="#projeler">
              Projeler
            </a>
            <a
              className="solid-button"
              href="https://instagram.com/akrep.vahit"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-badge">Seçili çalışmalar</span>
            <h2>Yaptığım web sitelerini ve uygulamaları burada paylaşıyorum.</h2>
            <p>
              Bu sayfada yayına aldığım projeleri, kullandığım teknolojileri ve canlı
              bağlantıları bulabilirsin. Yeni çalışmalar eklendikçe içerik düzenli
              olarak güncellenir.
            </p>

            <div className="hero-actions">
              <a className="solid-button" href="#projeler">
                Projeleri Gör
              </a>
              <a
                className="ghost-button"
                href="https://instagram.com/akrep.vahit"
                target="_blank"
                rel="noreferrer"
              >
                @akrep.vahit
              </a>
            </div>

            <div className="stat-strip">
              <article>
                <strong>{projects.length}</strong>
                <span>Toplam proje</span>
              </article>
              <article>
                <strong>{projects.filter((item) => item.featured).length}</strong>
                <span>Öne çıkan</span>
              </article>
              <article>
                <strong>{categoryCount}</strong>
                <span>Kategori</span>
              </article>
            </div>
          </div>

          <aside className="hero-card">
            <p className="eyebrow">Instagram</p>
            <h3 className="social-title">@akrep.vahit</h3>
            <p>
              Yeni paylaşımlar, proje duyuruları ve çalışmalarımdan kısa kesitler için
              Instagram hesabımı ziyaret edebilirsin.
            </p>

            <div className="social-tags">
              <span>Yeni projeler</span>
              <span>Tasarım paylaşımları</span>
              <span>Güncel içerikler</span>
            </div>

            <div className="pulse-card pulse-card--social">
              <span className="pulse-dot" />
              <div>
                <strong>Takip et</strong>
                <p>Instagram üzerinden yeni içerikleri daha hızlı görebilirsin.</p>
              </div>
            </div>

            <a
              className="solid-button social-button"
              href="https://instagram.com/akrep.vahit"
              target="_blank"
              rel="noreferrer"
            >
              Instagram profiline git
            </a>
          </aside>
        </div>
      </section>

      <section className="section-shell" id="projeler">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Projeler</p>
            <h2>{hasProjects ? "Yayınlanan çalışmalar" : "Portfolyo alanı"}</h2>
          </div>
          <p className="section-text">
            {hasProjects
              ? "Burada yayındaki projelerimi inceleyebilir, kategoriye göre filtreleme yapabilir ve arama ile istediğin çalışmaya hızlıca ulaşabilirsin."
              : "Henüz proje eklenmedi. Yeni çalışmalar eklendikçe bu alanda yayınlanacak."}
          </p>
        </div>

        {hasProjects ? (
          <div className="filter-panel">
            <label className="search-field">
              <span>Proje ara</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Proje adı, kategori veya teknoloji yaz..."
              />
            </label>

            <div className="chip-row" aria-label="Kategori filtresi">
              {categories.map((category) => (
                <button
                  key={category}
                  className={category === activeCategory ? "chip chip--active" : "chip"}
                  onClick={() => setActiveCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="inline-note">{error}</p> : null}
        {loading ? <p className="inline-note">Projeler yükleniyor...</p> : null}

        <div className="project-grid">
          {visibleProjects.map((project, index) => (
            <article
              className={index === 0 ? "project-card project-card--featured" : "project-card"}
              key={project.id}
            >
              <div
                className="project-cover"
                style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(11, 16, 27, 0.42)), url(${project.coverImage})` }}
              >
                <div className="project-cover-meta">
                  <span className="status-pill">{project.status}</span>
                  <span className="year-pill">{project.year}</span>
                </div>
              </div>

              <div className="project-body">
                <div className="project-header">
                  <div>
                    <p className="project-spotlight">{project.spotlight}</p>
                    <h3>{project.title}</h3>
                  </div>
                  {project.featured ? <span className="featured-mark">Öne çıkan</span> : null}
                </div>

                <p className="project-description">{project.shortDescription}</p>
                <p className="project-detail">{project.fullDescription}</p>

                <div className="tag-row">
                  {project.techStack.map((item) => (
                    <span key={item} className="tag">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="project-footer">
                  <span>Son güncelleme: {formatDate(project.updatedAt)}</span>
                  <div className="project-links">
                    {project.repoUrl ? (
                      <a href={project.repoUrl} target="_blank" rel="noreferrer">
                        Kod
                      </a>
                    ) : null}
                    {project.liveUrl ? (
                      <a href={project.liveUrl} target="_blank" rel="noreferrer">
                        Siteyi Aç
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!loading && filteredProjects.length === 0 ? (
          <div className="empty-state">
            <h3>
              {hasProjects
                ? "Bu aramayla eşleşen proje bulunamadı."
                : "Henüz yayınlanmış proje bulunmuyor."}
            </h3>
            <p>
              {hasProjects
                ? "Arama terimini değiştirebilir veya filtreyi temizleyebilirsin."
                : "Yeni projeler eklendikçe bu alan güncellenecek."}
            </p>
          </div>
        ) : null}
      </section>

      <section className="section-shell instagram-panel">
        <div className="instagram-copy">
          <p className="eyebrow">Instagram</p>
          <h2>@akrep.vahit</h2>
          <p>
            Projelerden kısa görüntüler, yeni yayınlar ve tasarım paylaşımları için
            Instagram hesabımı takip edebilirsin.
          </p>
        </div>

        <div className="instagram-actions">
          <a
            className="solid-button"
            href="https://instagram.com/akrep.vahit"
            target="_blank"
            rel="noreferrer"
          >
            Profili Aç
          </a>
          <p className="instagram-note">Instagram: @akrep.vahit</p>
        </div>
      </section>
    </main>
  );
}
