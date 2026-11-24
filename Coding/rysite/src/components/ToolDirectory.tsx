import Link from 'next/link';
import {
  ArrowUpRight,
  AudioLines,
  Beer,
  Box,
  Globe2,
  ScanLine,
  Sparkles,
  Trophy,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import type { ToolDefinition, ToolVisual } from '@/data/tools';
import ToolArtwork from '@/components/ToolArtwork';

const toolIcons: Record<ToolVisual, LucideIcon> = {
  nfl: Activity,
  beers: Beer,
  carton: Box,
  pleat: ScanLine,
  worldcup: Trophy,
  antipode: Globe2,
  planetarium: Sparkles,
  reactive: AudioLines,
};

export function FeaturedToolCard({ tool }: { tool: ToolDefinition }) {
  return (
    <Link
      href={tool.href}
      className={`featured-tool featured-tool--${tool.visual}`}
      aria-label={`Open ${tool.name}`}
    >
      <ToolArtwork type={tool.visual} />
      <div className="featured-tool-copy">
        <p className="tool-discipline">{tool.discipline}</p>
        <h3>{tool.name}</h3>
        <p className="featured-tool-summary">{tool.summary}</p>
        <div className="featured-tool-footer">
          <div className="tool-tags" aria-label="Capabilities">
            {tool.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <span className="tool-open">Open tool <ArrowUpRight size={18} strokeWidth={1.8} /></span>
        </div>
      </div>
    </Link>
  );
}

export function ToolIndexList({ items }: { items: ToolDefinition[] }) {
  return (
    <div className="tool-index-list">
      {items.map((tool) => {
        const Icon = toolIcons[tool.visual];
        return (
          <Link href={tool.href} className="tool-index-row" key={tool.href}>
            <span className="tool-index-icon" aria-hidden="true">
              <Icon size={25} strokeWidth={1.5} />
            </span>
            <span className="tool-index-title">
              <small>{tool.discipline}</small>
              <strong>{tool.name}</strong>
            </span>
            <span className="tool-index-description">{tool.summary}</span>
            <span className="tool-index-arrow" aria-hidden="true">
              <ArrowUpRight size={22} strokeWidth={1.6} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
