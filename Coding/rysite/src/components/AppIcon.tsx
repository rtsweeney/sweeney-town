import { Beer, ChartLine, Earth, Package, ScanLine, Sparkles, Telescope, Trophy, type LucideProps } from 'lucide-react';
import type { AppIconName } from '@/lib/apps';

const ICONS: Record<AppIconName, React.ComponentType<LucideProps>> = {
  'chart-line': ChartLine,
  beer: Beer,
  package: Package,
  'scan-line': ScanLine,
  telescope: Telescope,
  earth: Earth,
  trophy: Trophy,
  sparkles: Sparkles,
};

/** The registry stores icon names; this turns one into its icon. */
export default function AppIcon({ name, ...props }: { name: AppIconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" {...props} />;
}
