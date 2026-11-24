import seasonData from '../../public/data/nfl-elo/season.json';
import type { ToolVisual } from '@/data/tools';

interface NflTeam {
  team: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  rank: number;
  history: number[];
}

function Sparkline({ values }: { values: number[] }) {
  const width = 74;
  const height = 26;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - 2 - ((value - min) / range) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="nfl-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function NflArtwork() {
  const leaders = (seasonData.teams as NflTeam[])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 4);

  return (
    <div className="tool-art tool-art--nfl" aria-hidden="true">
      <div className="art-window-bar">
        <span>{seasonData.season} / ELO LEADERS</span>
        <span>THROUGH WK {seasonData.throughWeek}</span>
      </div>
      <div className="nfl-art-columns">
        <span>RK / TEAM</span>
        <span>RECORD</span>
        <span>TREND</span>
        <span>ELO</span>
      </div>
      <div className="nfl-art-rows">
        {leaders.map((team) => (
          <div className="nfl-art-row" key={team.team}>
            <span className="nfl-art-team">
              <small>{String(team.rank).padStart(2, '0')}</small>
              <strong>{team.team}</strong>
            </span>
            <span className="nfl-art-record">
              {team.wins}–{team.losses}{team.ties ? `–${team.ties}` : ''}
            </span>
            <Sparkline values={team.history} />
            <strong className="nfl-art-elo">{Math.round(team.elo)}</strong>
          </div>
        ))}
      </div>
      <div className="nfl-art-footer">
        <span>{seasonData.simulations.toLocaleString('en-US')} simulated seasons</span>
        <span className="live-indicator"><i /> MODEL CURRENT</span>
      </div>
    </div>
  );
}

function BeersArtwork() {
  return (
    <div className="tool-art tool-art--beers" aria-hidden="true">
      <div className="art-window-bar">
        <span>THE POUR</span>
        <span>STANDARD = 12 OZ × 5%</span>
      </div>
      <div className="beer-equation">
        <div className="beer-input">
          <strong>12</strong>
          <span>FL OZ</span>
        </div>
        <span className="beer-operator">×</span>
        <div className="beer-input">
          <strong>5.0</strong>
          <span>% ABV</span>
        </div>
        <span className="beer-operator">=</span>
        <div className="beer-output">
          <strong>1.00</strong>
          <span>STANDARD BEER</span>
        </div>
      </div>
      <div className="beer-scale">
        <span /><span /><span className="active" /><span /><span />
      </div>
    </div>
  );
}

function CartonArtwork() {
  return (
    <div className="tool-art tool-art--carton" aria-hidden="true">
      <div className="art-window-bar">
        <span>EXAMPLE PACK-OUT</span>
        <span>PALLET 01</span>
      </div>
      <div className="carton-art-body">
        <div className="carton-stack">
          <div className="carton-layer carton-layer--back">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </div>
          <div className="carton-layer carton-layer--front">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </div>
          <div className="pallet-line" />
        </div>
        <div className="carton-readout">
          <div><strong>24</strong><span>UNITS / CARTON</span></div>
          <div><strong>8 × 5</strong><span>CARTONS / LAYER × TIERS</span></div>
          <div className="carton-total"><strong>960</strong><span>UNITS / PALLET</span></div>
        </div>
      </div>
    </div>
  );
}

export default function ToolArtwork({ type }: { type: ToolVisual }) {
  if (type === 'nfl') return <NflArtwork />;
  if (type === 'beers') return <BeersArtwork />;
  if (type === 'carton') return <CartonArtwork />;
  return null;
}
