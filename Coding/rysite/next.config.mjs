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
            // Moved from Projects to Calculators — keep the indexed URLs alive.
            { source: '/projects/carton-packing', destination: '/calculators/carton-packing', permanent: true },
            { source: '/projects/pleat-counter', destination: '/calculators/pleat-counter', permanent: true },
            // Retired calculators — send visitors to the index rather than a 404.
            { source: '/calculators/unit-converter', destination: '/calculators', permanent: false },
            { source: '/calculators/air-density', destination: '/calculators', permanent: false },
            { source: '/calculators/pleated-filter-calculator', destination: '/calculators', permanent: false },
        ];
    },
};

export default nextConfig;
