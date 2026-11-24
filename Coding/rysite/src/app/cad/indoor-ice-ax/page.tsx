import type { Metadata } from 'next';
import Image from 'next/image';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import { ICE_AX_ZIP } from '@/lib/builds';

export const metadata: Metadata = {
  title: 'Indoor Ice Ax — SOLIDWORKS CAD | Sweeney Town',
  description:
    'An ice ax for training at the climbing gym, designed in SOLIDWORKS so all three plates nest in one 12 × 24 in sheet and bolt together with McMaster fasteners. Download the parts and assemblies.',
};

const DIR = '/cad/indoor-ice-ax';
const GRABCAD = 'https://grabcad.com/library/indoor-ice-axe-1';

const VIEWS = [
  { file: 'assembly.png', w: 172, h: 346, title: 'Assembled', note: 'Ice_Axe_Complete.SLDASM' },
  { file: 'packing.png', w: 162, h: 344, title: 'Nested to cut', note: 'Packing_Config.SLDASM' },
  { file: 'center-plate.png', w: 164, h: 337, title: 'Center plate', note: 'Ice_Axe.SLDPRT' },
  { file: 'outer-left.png', w: 168, h: 338, title: 'Outer plate, left', note: 'Ice_Axe_-_Outer_Left.SLDPRT' },
  { file: 'outer-right.png', w: 168, h: 337, title: 'Outer plate, right', note: 'Ice_Axe_-_Outer_Right.SLDPRT' },
];

export default function IndoorIceAxPage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <Breadcrumb root={{ label: 'CAD & hardware', href: '/cad' }} current="Indoor Ice Ax" />
          <h1 className="section-title">
            <span className="gradient-text">Indoor Ice Ax</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            An ice ax to use while rock climbing at the gym. Three plates sandwich together into the head and
            shaft, and all three nest in exactly one 12&quot; &times; 24&quot; sheet, held together with McMaster
            fasteners.
          </p>
        </div>

        <div className="iceax-gallery">
          {VIEWS.map((v) => (
            <figure key={v.file}>
              <Image src={`${DIR}/${v.file}`} alt={`${v.title}: the SOLIDWORKS preview of ${v.note}`} width={v.w} height={v.h} />
              <figcaption>
                <strong>{v.title}</strong>
                {v.note}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="uvm-note">Images are the previews SOLIDWORKS saved inside each file.</p>

        <div className="uvm-code-head" style={{ marginTop: '3rem' }}>
          <div>
            <h2 className="home-h2">The CAD</h2>
            <p className="uvm-code-meta">
              Three parts and two assemblies (the axe, and the plates nested for cutting), native SOLIDWORKS.
            </p>
          </div>
          <div className="uvm-code-actions">
            <a href={ICE_AX_ZIP} download className="btn btn-primary">Download .zip (2.7 MB)</a>
            <a href={GRABCAD} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              GrabCAD <span aria-hidden="true">&#8599;</span>
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
