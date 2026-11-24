import type { Metadata } from 'next';
import Breadcrumb from '@/components/Breadcrumb';
import CodeBlock from '@/components/CodeBlock';
import EinkScreen from '@/components/EinkScreen';
import Footer from '@/components/Footer';
import { UV_METER_COMMIT, UV_METER_REPO } from '@/lib/builds';
// The same file the download link serves (next.config.mjs imports .ino as text).
import firmware from '../../../../public/code/uv-index-meter/uv_meter_v1_1.ino';

export const metadata: Metadata = {
  title: 'Beach UV Index Meter — ESP32 + E-ink, with Code | Sweeney Town',
  description:
    'An ESP32 Feather, a tri-color e-ink screen and an AS7331 UV sensor that estimate the UV index every 30 seconds, show it in a pair of aviators and track your sun dose. Full Arduino code to read and download.',
  openGraph: {
    title: 'Beach UV Index Meter — ESP32 + E-ink',
    description: 'A sun-dose tracker for the beach, with the full ESP32 Arduino sketch.',
    type: 'website',
  },
};

const FILE = 'uv_meter_v1_1.ino';
const DOWNLOAD = `/code/uv-index-meter/${FILE}`;

const SCREENS = [
  { uvi: 2.4, caption: 'UV 2.4: clear lenses' },
  { uvi: 6.8, caption: 'UV 6.8: tinted from 3, with hearts' },
  { uvi: 9.6, caption: 'UV 9.6: red from 8, flames from 9' },
];

const PARTS = [
  { name: 'Adafruit ESP32 Feather V2', id: 5400, note: 'the brains, asleep most of the time' },
  { name: '2.13" tri-color e-ink FeatherWing (SSD1680)', id: 4814, note: 'stacked on the Feather' },
  { name: 'Adafruit AS7331 UV sensor', id: 6476, note: 'UVA, UVB and UVC, over STEMMA QT' },
  { name: '2500 mAh LiPo', note: 'with a 3.5 V cutoff' },
  { name: 'IP67 push button', note: 'on GPIO 27, to wake it and change screens' },
];

export default function UvIndexMeterPage() {
  const lineCount = firmware.replace(/\n$/, '').split('\n').length;

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <Breadcrumb root={{ label: 'CAD & hardware', href: '/cad' }} current="Beach UV Index Meter" />
          <h1 className="section-title">
            <span className="gradient-text">Beach UV Index Meter</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            An ESP32, a tri-color e-ink screen and a UV sensor that estimate the UV index every 30 seconds,
            show it in a pair of aviators, and keep a running sun dose while you&apos;re on the sand.
          </p>
        </div>

        <section className="uvm-screens" aria-label="The meter's main screen at three UV levels">
          {SCREENS.map((s) => <EinkScreen key={s.uvi} uvi={s.uvi} caption={s.caption} />)}
        </section>
        <p className="uvm-note">
          These are drawn by a port of the firmware&apos;s own drawing code, not mock-ups: the same lens
          scanlines, font and thresholds as the device.
        </p>

        <div className="uvm-columns">
          <section aria-labelledby="uvm-parts">
            <h2 id="uvm-parts" className="home-h2">What&apos;s inside</h2>
            <ul className="uvm-parts">
              {PARTS.map((p) => (
                <li key={p.name}>
                  {p.id ? (
                    <a href={`https://www.adafruit.com/product/${p.id}`} target="_blank" rel="noopener noreferrer">{p.name}</a>
                  ) : (
                    <span className="uvm-part-name">{p.name}</span>
                  )}
                  <span className="uvm-part-note">{p.note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="uvm-how">
            <h2 id="uvm-how" className="home-h2">How it works</h2>
            <ul className="uvm-how">
              <li>
                <strong>Sleeps, samples, sleeps.</strong> It wakes every 30 seconds, spends about a second reading
                UVA, UVB and UVC, and goes back to deep sleep. The screen only redraws every 5 minutes, since a
                tri-color e-ink refresh takes about 15 seconds.
              </li>
              <li>
                <strong>Ignores the seagulls.</strong> It shows the median of the last five samples, so a hand, a
                towel or a bird over the sensor doesn&apos;t spike the reading.
              </li>
              <li>
                <strong>Estimates the UV index</strong> from the two bands that matter: UVI = 0.025 &times; UVB +
                0.0004 &times; UVA (in &micro;W/cm&sup2;). The coefficients are still marked &ldquo;calibrate
                me!&rdquo; in the code.
              </li>
              <li>
                <strong>Counts your sun dose.</strong> It adds up UV-index-hours and converts them to standard
                erythemal doses: one UVI-hour is 0.9 SED.
              </li>
              <li>
                <strong>One button.</strong> A short press flips between the aviators, each channel against its
                all-time record (kept in flash, so it survives a dead battery), and a chart of the last 6.5 hours
                with the dose. A long press saves the session and shows your last five.
              </li>
              <li>
                <strong>Knows when to quit.</strong> Below 3.5 V it saves the session and shows &ldquo;charge
                me!&rdquo; instead of browning out.
              </li>
            </ul>
          </section>
        </div>

        <section id="code" className="uvm-code" aria-labelledby="uvm-code-title">
          <div className="uvm-code-head">
            <div>
              <h2 id="uvm-code-title" className="home-h2">The code</h2>
              <p className="uvm-code-meta">
                <code>{FILE}</code> &middot; {lineCount} lines of Arduino C++ &middot; from{' '}
                <a href={`${UV_METER_REPO}/tree/${UV_METER_COMMIT}`} target="_blank" rel="noopener noreferrer">
                  rtsweeney/UV-Index-Meter @ {UV_METER_COMMIT.slice(0, 7)}
                </a>
              </p>
            </div>
            <div className="uvm-code-actions">
              <a href={DOWNLOAD} download className="btn btn-primary">Download .ino</a>
              <a href={UV_METER_REPO} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                GitHub <span aria-hidden="true">&#8599;</span>
              </a>
            </div>
          </div>
          <p className="uvm-flash">
            To flash it: Arduino IDE with the ESP32 core, board &ldquo;Adafruit Feather ESP32 V2&rdquo;, and the
            &ldquo;Adafruit AS7331&rdquo; and &ldquo;Adafruit EPD&rdquo; libraries. Put the file in a folder named{' '}
            <code>uv_meter_v1_1/</code>, open it and Upload.
          </p>
          <CodeBlock source={firmware} label={`${FILE}, the meter's full source`} />
        </section>
      </div>

      <Footer />
    </main>
  );
}
