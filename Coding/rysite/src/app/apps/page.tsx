import type { Metadata } from 'next';
import Link from 'next/link';
import { PortableText } from 'next-sanity';
import type { PortableTextBlock } from 'next-sanity';
import Footer from '@/components/Footer';
import AppIcon from '@/components/AppIcon';
import { FEATURED_APPS, MORE_APPS, type AppEntry } from '@/lib/apps';
import { safeFetch } from '@/sanity/lib/client';

export const metadata: Metadata = {
  title: 'All Apps | Sweeney Town',
  description:
    'Every web app on sweeney.town: NFL Elo predictions, Beers Per Beer, the Carton Packing Optimizer, machine-vision pleat counting, a planetarium and more. Free, no sign-up, and they run in your browser.',
};

// Projects added in Sanity Studio (the old /projects page) still appear, below the apps.
const PROJECTS_QUERY = `*[_type == "project"] | order(date desc) {
  _id,
  title,
  description,
  techStack,
  liveUrl,
  repoUrl,
  date
}`;

export const revalidate = 60;

interface Project {
  _id: string;
  title: string;
  description: PortableTextBlock[];
  techStack: string[];
  liveUrl: string;
  repoUrl: string;
  date: string;
}

function AppCard({ app }: { app: AppEntry }) {
  return (
    <article className={`app-card accent-${app.accent}`}>
      <div className="app-card-head">
        <span className="more-icon"><AppIcon name={app.icon} size={22} /></span>
        <div>
          <h3 className="app-card-title">
            <Link href={app.href} className="stretched-link">{app.name}</Link>
          </h3>
          <p className="app-card-tagline">{app.tagline}</p>
        </div>
      </div>
      <p className="app-card-desc">{app.description}</p>
      <div className="project-tech-tags">
        {app.tags.map((tag) => (
          <span key={tag} className="project-tech-tag">{tag}</span>
        ))}
      </div>
      <span className="feature-cta" aria-hidden="true">Open <span className="arrow">&rarr;</span></span>
    </article>
  );
}

export default async function AppsPage() {
  const projects = await safeFetch<Project[]>(PROJECTS_QUERY, []);

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">All apps</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Everything I&apos;ve built for the browser. Free, no sign-up, and nothing you enter leaves your device.
          </p>
        </div>

        <section className="apps-section" aria-labelledby="apps-most-used">
          <h2 id="apps-most-used" className="home-label">Most used</h2>
          <div className="apps-grid">
            {FEATURED_APPS.map((app) => <AppCard key={app.slug} app={app} />)}
          </div>
        </section>

        <section className="apps-section" aria-labelledby="apps-more">
          <h2 id="apps-more" className="home-label">Everything else</h2>
          <div className="apps-grid">
            {MORE_APPS.map((app) => <AppCard key={app.slug} app={app} />)}
          </div>
        </section>

        {projects.length > 0 && (
          <section className="apps-section" aria-labelledby="apps-elsewhere">
            <h2 id="apps-elsewhere" className="home-label">Elsewhere</h2>
            <div className="apps-grid">
              {projects.map((project) => (
                <article key={project._id} className="app-card accent-purple">
                  <h3 className="app-card-title">{project.title}</h3>
                  {project.description && (
                    <div className="app-card-desc">
                      <PortableText value={project.description} />
                    </div>
                  )}
                  {project.techStack && project.techStack.length > 0 && (
                    <div className="project-tech-tags">
                      {project.techStack.map((tech) => (
                        <span key={tech} className="project-tech-tag">{tech}</span>
                      ))}
                    </div>
                  )}
                  {(project.liveUrl || project.repoUrl) && (
                    <div className="project-links">
                      {project.liveUrl && (
                        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="project-link">Live &rarr;</a>
                      )}
                      {project.repoUrl && (
                        <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="project-link">Source &rarr;</a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
