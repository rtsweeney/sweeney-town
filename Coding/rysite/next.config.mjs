/** @type {import('next').NextConfig} */
const nextConfig = {
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
            // One tool index replaces the old Projects vs Calculators split.
            { source: '/projects', destination: '/tools', permanent: true },
            { source: '/calculators', destination: '/tools', permanent: true },
            // Keep older deep links and indexed URLs alive.
            { source: '/projects/carton-packing', destination: '/calculators/carton-packing', permanent: true },
            { source: '/projects/pleat-counter', destination: '/calculators/pleat-counter', permanent: true },
            { source: '/calculators/unit-converter', destination: '/tools', permanent: false },
            { source: '/calculators/air-density', destination: '/tools', permanent: false },
            { source: '/calculators/pleated-filter-calculator', destination: '/tools', permanent: false },
        ];
    },
};

export default nextConfig;
