import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carton Packing Optimizer — Free Box Size & Pallet Load Calculator | Sweeney Town',
  description:
    'Free carton packing optimizer and pallet load calculator. Enter your product sizes and annual volumes to find the best set of carton dimensions, see units per carton and per pallet, compare carton SKU counts, and get supplier-ready box specs. Runs entirely in your browser.',
  keywords: [
    'carton packing optimizer',
    'box size calculator',
    'pallet load calculator',
    'carton size optimization',
    'palletization calculator',
    'case pack calculator',
    'carton SKU rationalization',
    'shipping box optimizer',
    'pallet stacking pattern',
    'packaging engineering tool',
  ],
  openGraph: {
    title: 'Carton Packing Optimizer — Box Size & Pallet Load Calculator',
    description:
      'Find the best set of carton dimensions for your products, see how they stack on pallets, and compare carton SKU counts — free, in your browser.',
    type: 'website',
  },
};

export default function CartonPackingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
