/** @type {import('next').NextConfig} */

// Every app now lives at /<slug> (src/app/(apps)/), with /apps as the index.
// These keep the old /calculators/* and /projects/* URLs — bookmarks, search
// results and the QR codes printed on carton drawings — landing in one hop.
// Browsers carry a URL's #fragment across a redirect, so a carton scenario
// link (/calculators/carton-packing#cpk=…) still reopens its scenario.
const MOVED_APPS = [
    ['/calculators/beers-per-beer', '/beers-per-beer'],
    ['/calculators/carton-packing', '/carton-packing'],
    ['/calculators/pleat-counter', '/pleat-counter'],
    ['/projects/nfl-elo', '/nfl-elo'],
    ['/projects/antipode', '/antipode'],
    ['/projects/world-cup', '/world-cup'],
    ['/projects/reactive-fun-backgrounds', '/reactive-fun-backgrounds'],
    ['/projects/reactive-fun-backgrounds/jellyfish-aquarium', '/reactive-fun-backgrounds/jellyfish-aquarium'],
    // Older still: these two lived under Projects before Calculators.
    ['/projects/carton-packing', '/carton-packing'],
    ['/projects/pleat-counter', '/pleat-counter'],
];

const nextConfig = {
    // Arduino sketches import as their source text (types/ino.d.ts), so the
    // UV meter page shows the very file it offers for download.
    webpack(config) {
        config.module.rules.push({ test: /\.ino$/, type: 'asset/source' });
        return config;
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.sanity.io',
            },
        ],
    },
    async redirects() {
        return [
            { source: '/blog', destination: '/concerts', permanent: true },
            // The two old indexes became one.
            { source: '/calculators', destination: '/apps', permanent: true },
            { source: '/projects', destination: '/apps', permanent: true },
            ...MOVED_APPS.map(([source, destination]) => ({ source, destination, permanent: true })),
            // Retired calculators — send visitors to the index rather than a 404.
            { source: '/calculators/unit-converter', destination: '/apps', permanent: false },
            { source: '/calculators/air-density', destination: '/apps', permanent: false },
            { source: '/calculators/pleated-filter-calculator', destination: '/apps', permanent: false },
        ];
    },
};

export default nextConfig;
