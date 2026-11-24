import Link from 'next/link';
import EinkScreen from '@/components/EinkScreen';
import Image from 'next/image';
import type { BuildEntry, BuildLink } from '@/lib/builds';

/** Each build's picture, by slug. */
const VISUALS: Record<string, () => React.ReactNode> = {
  'uv-index-meter': () => <EinkScreen uvi={9.6} />,
  'indoor-ice-ax': () => (
    <div className="iceax-pair">
      <Image src="/cad/indoor-ice-ax/assembly.png" alt="The Indoor Ice Ax assembled, from its SOLIDWORKS preview" width={172} height={346} />
      <Image src="/cad/indoor-ice-ax/packing.png" alt="The three plates nested together, as they are cut from one sheet" width={162} height={344} />
    </div>
  ),
};

function LinkTo({ link, className }: { link: BuildLink; className: string }) {
  if (link.external) {
    return (
      <a href={link.href} className={className} target="_blank" rel="noopener noreferrer">
        {link.label} <span aria-hidden="true">&#8599;</span>
      </a>
    );
  }
  if (link.href.endsWith('.zip')) {
    return <a href={link.href} className={className} download>{link.label}</a>;
  }
  return <Link href={link.href} className={className}>{link.label}</Link>;
}

export default function BuildCard({ build }: { build: BuildEntry }) {
  const external = build.href.startsWith('http');
  return (
    <article id={build.slug} className={`build-card accent-${build.accent}`}>
      <div className="build-visual">{VISUALS[build.slug]?.()}</div>
      <div className="build-body">
        <p className="build-kind">{build.kind}</p>
        <h3 className="build-title">
          <LinkTo link={{ label: build.name, href: build.href, external }} className="stretched-link" />
        </h3>
        <p className="build-tagline">{build.tagline}</p>
        <p className="build-summary">{build.summary}</p>
        <div className="project-tech-tags">
          {build.tags.map((tag) => (
            <span key={tag} className="project-tech-tag">{tag}</span>
          ))}
        </div>
        <div className="build-links">
          {build.links.map((link) => <LinkTo key={link.href} link={link} className="build-link" />)}
        </div>
      </div>
    </article>
  );
}
