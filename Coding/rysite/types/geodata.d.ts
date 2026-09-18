// Two data packages ship JavaScript with no bundled types. Both have a single
// tiny surface, so describing it here beats pulling in a shim package.

declare module 'all-the-cities' {
  /** A GeoNames populated place, as the package's big JSON array holds it. */
  interface AllTheCitiesEntry {
    cityId: number;
    name: string;
    altName: string;
    /** ISO 3166-1 alpha-2. */
    country: string;
    featureCode: string;
    adminCode: string;
    population: number;
    loc: { type: 'Point'; coordinates: [number, number] };
  }
  const cities: AllTheCitiesEntry[];
  export default cities;
}

declare module 'tz-lookup' {
  /** Latitude, longitude → IANA time zone name. Never throws for valid input. */
  export default function tzlookup(lat: number, lon: number): string;
}
