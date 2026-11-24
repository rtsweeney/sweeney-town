// Constellation data with Right Ascension (hours) and Declination (degrees)
// RA/Dec represent the approximate center of each constellation
// Stars are the brightest stars with their relative positions for rendering

export interface ConstellationStar {
  name: string;
  ra: number;        // hours
  dec: number;       // degrees
  mag: number;       // apparent magnitude (lower = brighter)
  description: string;
}

export interface ConstellationLine {
  from: number; // index into stars array
  to: number;
}

export interface Constellation {
  name: string;
  abbreviation: string;
  ra: number;       // center RA in hours
  dec: number;      // center Dec in degrees
  description: string;
  bestMonths: number[]; // 1-12
  stars: ConstellationStar[];
  lines: ConstellationLine[];
}

export const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Orion',
    abbreviation: 'Ori',
    ra: 5.58,
    dec: 0,
    description: 'The Hunter — one of the most recognizable constellations. Look for the three stars of Orion\'s Belt in a short, straight row.',
    bestMonths: [12, 1, 2, 3],
    stars: [
      {
        name: 'Betelgeuse', ra: 5.92, dec: 7.41, mag: 0.5,
        description: 'A red supergiant over 700 times the diameter of our Sun and one of the largest stars visible to the naked eye. It varies irregularly in brightness and is expected to explode as a supernova within the next ~100,000 years. Its name comes from Arabic meaning "armpit of the giant."',
      },
      {
        name: 'Rigel', ra: 5.24, dec: -8.20, mag: 0.13,
        description: 'A blue supergiant shining roughly 120,000 times brighter than our Sun, located ~860 light-years away. Despite being labeled Beta Orionis, it is usually Orion\'s brightest star. Its name means "left leg of the giant" in Arabic.',
      },
      {
        name: 'Bellatrix', ra: 5.42, dec: 6.35, mag: 1.64,
        description: 'A hot blue-white giant known as the "Amazon Star." The name means "female warrior" in Latin. At about 250 light-years away, it is one of the hottest stars readily visible to the naked eye.',
      },
      {
        name: 'Mintaka', ra: 5.53, dec: -0.30, mag: 2.23,
        description: 'The westernmost star of Orion\'s Belt and nearly exactly on the celestial equator, making it rise and set almost due east and west from any location on Earth. A double star system ~900 light-years away; its name is Arabic for "the belt."',
      },
      {
        name: 'Alnilam', ra: 5.60, dec: -1.20, mag: 1.69,
        description: 'The central and brightest star of Orion\'s Belt. A blue supergiant about 2,000 light-years away and one of the most intrinsically luminous stars in the night sky at roughly 375,000 times the Sun\'s luminosity. Its name means "string of pearls" in Arabic.',
      },
      {
        name: 'Alnitak', ra: 5.68, dec: -1.94, mag: 1.77,
        description: 'The easternmost star of Orion\'s Belt and the nearest of the three belt stars. A triple-star system that sits just above the famous Horsehead Nebula and the glowing Flame Nebula in long-exposure photographs.',
      },
      {
        name: 'Saiph', ra: 5.80, dec: -9.67, mag: 2.09,
        description: 'Marks Orion\'s right knee. Similar in spectral type and distance to Rigel, but appears much fainter because it radiates the majority of its energy in the ultraviolet rather than in visible light. Its name means "sword of the giant" in Arabic.',
      },
    ],
    lines: [
      { from: 0, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
      { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 6, to: 1 },
      { from: 1, to: 3 }, { from: 0, to: 5 },
    ],
  },
  {
    name: 'Ursa Major',
    abbreviation: 'UMa',
    ra: 11.06,
    dec: 55.38,
    description: 'The Great Bear — contains the famous Big Dipper asterism. The two "pointer stars" at the end of the dipper\'s bowl point toward Polaris.',
    bestMonths: [3, 4, 5, 6],
    stars: [
      {
        name: 'Dubhe', ra: 11.06, dec: 61.75, mag: 1.79,
        description: 'The northern of the two "pointer stars" used to locate Polaris. Unlike most Big Dipper stars, Dubhe is not part of the Ursa Major Moving Group and will slowly drift away from its companions over the next few million years. An orange giant about 124 light-years away.',
      },
      {
        name: 'Merak', ra: 11.03, dec: 56.38, mag: 2.37,
        description: 'The southern pointer star. Together with Dubhe it forms the famous "pointer pair" — drawing a line through them and extending it ~5 times leads directly to Polaris. A white main-sequence star about 79 light-years away.',
      },
      {
        name: 'Phecda', ra: 11.90, dec: 53.69, mag: 2.44,
        description: 'The inner bottom star of the Big Dipper\'s bowl and a bona fide member of the Ursa Major Moving Group — a loose cluster of stars born from the same molecular cloud that are still traveling together through space.',
      },
      {
        name: 'Megrez', ra: 12.26, dec: 57.03, mag: 3.31,
        description: 'The faintest of the seven Big Dipper stars, sitting at the junction of the bowl and the handle. Despite its modest brightness it is a useful guide star. Its Arabic name means "root of the bear\'s tail."',
      },
      {
        name: 'Alioth', ra: 12.90, dec: 55.96, mag: 1.77,
        description: 'The brightest star in Ursa Major and the nearest of the Big Dipper stars to Earth at about 83 light-years. An "Ap star" — a chemically peculiar giant with abnormal abundances of certain metals whose spectrum shifts as the star rotates.',
      },
      {
        name: 'Mizar', ra: 13.40, dec: 54.93, mag: 2.27,
        description: 'One of the first binary stars ever observed telescopically. To the naked eye it forms a pair with nearby Alcor, a test of keen eyesight since antiquity. Through a small telescope Mizar splits into two white stars; spectroscopy reveals that each component is itself a close binary, making it a quadruple system.',
      },
      {
        name: 'Alkaid', ra: 13.79, dec: 49.31, mag: 1.86,
        description: 'The tip of the Big Dipper\'s handle and the third-brightest star in Ursa Major. Unlike the other dipper stars, Alkaid is not part of the Ursa Major Moving Group — it is traveling in a completely different direction through the galaxy.',
      },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 3, to: 0 },
    ],
  },
  {
    name: 'Cassiopeia',
    abbreviation: 'Cas',
    ra: 1.0,
    dec: 60,
    description: 'The Queen — easily recognized by its distinctive "W" or "M" shape. Visible year-round in the Northern Hemisphere, circling Polaris.',
    bestMonths: [10, 11, 12, 1],
    stars: [
      {
        name: 'Schedar', ra: 0.67, dec: 56.54, mag: 2.23,
        description: 'The brightest star in Cassiopeia and a slightly variable orange giant about 228 light-years away. Its name comes from Arabic meaning "breast" (of the queen). It forms the bottom-left leg of the "W" shape.',
      },
      {
        name: 'Caph', ra: 0.15, dec: 59.15, mag: 2.27,
        description: 'The top-left star of the "W" and one of the first stars whose angular diameter was directly measured. A white giant about 54 light-years away, making it one of the closer naked-eye stars in the constellation.',
      },
      {
        name: 'Gamma Cas', ra: 0.95, dec: 60.72, mag: 2.47,
        description: 'The central star of the "W" and a hot blue-white shell star that intermittently ejects rings of gas from its equator. This causes irregular and sometimes dramatic variations in brightness. It is the prototype of the "Gamma Cassiopeiae variable" class of stars.',
      },
      {
        name: 'Ruchbah', ra: 1.43, dec: 60.24, mag: 2.68,
        description: 'A white giant that forms an eclipsing binary with an unseen companion — the pair\'s combined brightness dips slightly every ~759 days as one star passes in front of the other. Its name means "knee" in Arabic.',
      },
      {
        name: 'Segin', ra: 1.91, dec: 63.67, mag: 3.37,
        description: 'The easternmost star of the "W" and a hot blue-white giant about 440 light-years away. It forms a wide optical double with a fainter companion visible through binoculars.',
      },
    ],
    lines: [
      { from: 1, to: 0 }, { from: 0, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 },
    ],
  },
  {
    name: 'Leo',
    abbreviation: 'Leo',
    ra: 10.67,
    dec: 16,
    description: 'The Lion — look for the distinctive "sickle" or backwards question mark that forms the lion\'s head and mane, with bright Regulus at the base.',
    bestMonths: [3, 4, 5, 6],
    stars: [
      {
        name: 'Regulus', ra: 10.14, dec: 11.97, mag: 1.35,
        description: 'The "Little King" and the heart of the lion. A hot blue-white star spinning so rapidly — within 16% of its breakup speed — that it is visibly oblate, its equatorial diameter noticeably wider than its polar diameter. It lies almost exactly on the ecliptic, the path the Sun and planets travel.',
      },
      {
        name: 'Denebola', ra: 11.82, dec: 14.57, mag: 2.14,
        description: 'Marks the lion\'s tail. Its name means "tail of the lion" in Arabic. Notably surrounded by a warm disk of dust debris, suggesting a young planetary system or the remnants of asteroid collisions around it.',
      },
      {
        name: 'Algieba', ra: 10.33, dec: 19.84, mag: 2.28,
        description: 'One of the finest telescopic double stars in the sky — two golden-orange giant stars orbiting each other over a period of about 500 years, separated by just 4.6 arcseconds at present. A planetary-mass companion has also been detected orbiting the primary.',
      },
      {
        name: 'Zosma', ra: 11.24, dec: 20.52, mag: 2.56,
        description: 'A white A-type main-sequence star on the lion\'s back, about 58 light-years away. Shows a slight infrared excess at certain wavelengths, hinting at a surrounding debris disk similar to the one found around Denebola.',
      },
      {
        name: 'Ras Elased', ra: 10.00, dec: 23.77, mag: 2.98,
        description: 'The northernmost star of the lion\'s head, marking the top of the sickle asterism. Its name means "head of the lion" in Arabic (Epsilon Leonis). A yellow-white supergiant about 247 light-years away.',
      },
    ],
    lines: [
      { from: 0, to: 2 }, { from: 2, to: 4 }, { from: 2, to: 3 },
      { from: 3, to: 1 }, { from: 0, to: 5 }, { from: 5, to: 1 },
    ],
  },
  {
    name: 'Scorpius',
    abbreviation: 'Sco',
    ra: 16.9,
    dec: -30,
    description: 'The Scorpion — look for brilliant red Antares at its heart and the curving tail of stars ending in the stinger. Best seen low in the southern sky.',
    bestMonths: [6, 7, 8],
    stars: [
      {
        name: 'Antares', ra: 16.49, dec: -26.43, mag: 0.96,
        description: 'A red supergiant and one of the largest stars known, estimated at around 700 times the Sun\'s diameter. Its name means "rival of Mars" in Greek, referring to its striking reddish color and similar brightness. It is a likely supernova candidate within the next few hundred thousand years.',
      },
      {
        name: 'Shaula', ra: 17.56, dec: -37.10, mag: 1.63,
        description: 'One of the two "stinger" stars at the tip of the scorpion\'s tail. Its name means "the raised tail" in Arabic. A triple-star system about 700 light-years away, it is one of the nearest stars predicted to eventually become a neutron star.',
      },
      {
        name: 'Sargas', ra: 17.62, dec: -42.99, mag: 1.87,
        description: 'The other stinger star, a white giant about 270 light-years away. Its name has possible Sumerian origins. Forms a tight visual grouping with Shaula and Lesath — the entire tail appears to curl upward from the Southern Hemisphere.',
      },
      {
        name: 'Dschubba', ra: 16.01, dec: -22.62, mag: 2.32,
        description: 'The central forehead star of the scorpion. A hot rapidly-rotating blue giant that underwent a dramatic brightening in 2000, brightening by half a magnitude over several months as it ejected a shell of gas — similar behavior to Gamma Cassiopeiae.',
      },
      {
        name: 'Graffias', ra: 16.09, dec: -19.81, mag: 2.62,
        description: 'A triple-star system at the head of the scorpion. Two blue-white companions orbit each other every ~6,000 years, while a third, much closer pair orbits in just a few decades. The name may derive from Greek for "claws."',
      },
      {
        name: 'Lesath', ra: 17.53, dec: -37.29, mag: 2.69,
        description: 'The second stinger star, forming an apparent pair with Shaula just 0.5° away in the sky. Though they look related, Lesath is much farther away (~530 light-years vs. ~700 light-years). Its name may derive from Arabic or Greek for "sting" or "pass."',
      },
    ],
    lines: [
      { from: 4, to: 3 }, { from: 3, to: 0 }, { from: 0, to: 1 },
      { from: 1, to: 5 }, { from: 1, to: 2 },
    ],
  },
  {
    name: 'Cygnus',
    abbreviation: 'Cyg',
    ra: 20.62,
    dec: 42,
    description: 'The Swan — also known as the Northern Cross. Bright Deneb marks the tail, and the swan appears to fly along the Milky Way.',
    bestMonths: [7, 8, 9, 10],
    stars: [
      {
        name: 'Deneb', ra: 20.69, dec: 45.28, mag: 1.25,
        description: 'One of the most distant naked-eye stars at roughly 2,600 light-years, yet still among the sky\'s brightest. If placed at the same distance as Sirius, it would cast shadows at night. The third vertex of the Summer Triangle alongside Vega and Altair. Its intrinsic luminosity may be up to 200,000 times that of our Sun.',
      },
      {
        name: 'Sadr', ra: 20.37, dec: 40.26, mag: 2.20,
        description: 'The center of the Northern Cross and the chest of the swan. Embedded in a vast diffuse emission nebula — the Gamma Cygni Nebula — which glows faintly across binoculars. Its name means "the chest" in Arabic.',
      },
      {
        name: 'Gienah', ra: 20.77, dec: 33.97, mag: 2.48,
        description: 'Marks the east wing-tip of the swan. A giant star about 72 light-years away, unusual in that several stars across different constellations share the name "Gienah" (from the Arabic word for "wing").',
      },
      {
        name: 'Albireo', ra: 19.51, dec: 27.96, mag: 3.08,
        description: 'The "beak" of the swan and one of the most celebrated telescopic showpieces in the sky. What appears as a single dim star to the naked eye splits into a stunning gold-orange giant and a sapphire-blue companion through any telescope — widely regarded as the most beautiful color-contrast double star.',
      },
      {
        name: 'Rukh', ra: 21.22, dec: 30.23, mag: 2.87,
        description: 'Marks the west wing-tip of Cygnus. A white giant with a subtle yellow tint, about 170 light-years away. Its name (from Arabic "al-Rukh") was historically shared with several stars in the constellation.',
      },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 3 }, { from: 2, to: 1 },
      { from: 1, to: 4 },
    ],
  },
  {
    name: 'Lyra',
    abbreviation: 'Lyr',
    ra: 18.95,
    dec: 36.5,
    description: 'The Lyre — a compact constellation anchored by brilliant blue-white Vega, the 5th brightest star in the sky. Part of the Summer Triangle.',
    bestMonths: [6, 7, 8, 9],
    stars: [
      {
        name: 'Vega', ra: 18.62, dec: 38.78, mag: 0.03,
        description: 'The fifth-brightest star in the sky and the brightest of the Summer Triangle. Only 25 light-years away, it serves as one of the primary standard "white" reference stars in astronomy. Due to Earth\'s precession, Vega served as the pole star around 12,000 BCE and will serve that role again around 13,700 CE.',
      },
      {
        name: 'Sulafat', ra: 18.98, dec: 32.69, mag: 3.24,
        description: 'A blue-white giant marking the lower right corner of Lyra\'s parallelogram frame. Its name means "turtle" in Arabic, referencing the lyre\'s mythological origin as a tortoise shell strung with strings by the god Hermes. About 620 light-years away.',
      },
      {
        name: 'Sheliak', ra: 18.83, dec: 33.36, mag: 3.52,
        description: 'A famous eclipsing binary whose brightness dips noticeably every 12.9 days as the larger but dimmer companion passes in front of the brighter star. The "Beta Lyrae" class of eclipsing binaries — where mass streams between the two stars — is named after this system.',
      },
      {
        name: 'Delta2 Lyr', ra: 18.91, dec: 36.90, mag: 4.30,
        description: 'A red giant forming an optical wide pair with the blue giant Delta1 Lyr nearby. The contrasting red-and-blue colors make the pair a beautiful target for binoculars. Delta2 is the slightly closer and redder of the two, showing the range of stellar types visible in even this small constellation.',
      },
    ],
    lines: [
      { from: 0, to: 3 }, { from: 3, to: 1 }, { from: 3, to: 2 },
      { from: 1, to: 2 },
    ],
  },
  {
    name: 'Gemini',
    abbreviation: 'Gem',
    ra: 7.08,
    dec: 24,
    description: 'The Twins — two parallel lines of stars topped by bright Castor and Pollux. Stands near Orion in the winter sky.',
    bestMonths: [1, 2, 3, 4],
    stars: [
      {
        name: 'Pollux', ra: 7.76, dec: 28.03, mag: 1.14,
        description: 'The brightest star in Gemini despite its "Beta" designation. An orange giant about 34 light-years away with a confirmed extrasolar planet (Pollux b), making it one of the first giant stars found to host a planetary companion. Its warm color makes it easy to distinguish from its whiter twin Castor.',
      },
      {
        name: 'Castor', ra: 7.58, dec: 31.89, mag: 1.58,
        description: 'A spectacular sextuple-star system appearing as a single bright white star to the naked eye. Through a small telescope it resolves into two close white stars; each of those is a spectroscopic binary, and a third distant red dwarf binary is also gravitationally bound — six stars in total.',
      },
      {
        name: 'Alhena', ra: 6.63, dec: 16.40, mag: 1.93,
        description: 'Marks one of the Twins\' feet. A hot white giant about 109 light-years away. Its name means "the brand on a camel\'s neck" in Arabic. Lies close to the ecliptic, so the Moon and planets regularly pass near it in the sky.',
      },
      {
        name: 'Tejat', ra: 6.38, dec: 22.51, mag: 2.88,
        description: 'Marks the other foot of the Twins (Mu Geminorum). An aging red giant that has expanded beyond the main sequence as it exhausts its core hydrogen. It is a semi-regular pulsating variable, fluctuating slowly in brightness.',
      },
      {
        name: 'Mebsuta', ra: 6.73, dec: 25.13, mag: 2.98,
        description: 'Marks Castor\'s knee (Epsilon Geminorum). A yellow supergiant about 840 light-years away, making it intrinsically one of the more luminous stars in the constellation despite its modest apparent brightness. Its name means "the outstretched paw" in Arabic.',
      },
    ],
    lines: [
      { from: 0, to: 4 }, { from: 4, to: 2 }, { from: 1, to: 3 },
      { from: 0, to: 1 },
    ],
  },
  {
    name: 'Taurus',
    abbreviation: 'Tau',
    ra: 4.7,
    dec: 17,
    description: 'The Bull — find orange Aldebaran as the bull\'s eye and the V-shaped Hyades cluster as its face. The Pleiades star cluster sits on its shoulder.',
    bestMonths: [11, 12, 1, 2, 3],
    stars: [
      {
        name: 'Aldebaran', ra: 4.60, dec: 16.51, mag: 0.85,
        description: 'The fiery red eye of the bull — an orange giant about 44 times the diameter of our Sun, only 65 light-years away. Its name means "the follower" in Arabic, as it appears to follow the Pleiades across the sky. Although it appears to be part of the Hyades V-shape cluster, it is actually a foreground star at less than half the cluster\'s distance.',
      },
      {
        name: 'Elnath', ra: 5.44, dec: 28.61, mag: 1.68,
        description: 'Marks the tip of the northern horn. Historically shared with Auriga (as Beta Aurigae), sitting right on the boundary. A hot blue-white giant about 130 light-years away. Its name means "the butting one" in Arabic, referring to the bull\'s horns.',
      },
      {
        name: 'Alcyone', ra: 3.79, dec: 24.11, mag: 2.87,
        description: 'The brightest star in the Pleiades, the famous "Seven Sisters" open cluster. Actually a triple-star system embedded about 440 light-years away in one of the nearest and most prominent star clusters in the sky. The Pleiades have been recognized and mythologized by cultures worldwide for thousands of years.',
      },
      {
        name: 'Tianguan', ra: 5.63, dec: 21.14, mag: 3.00,
        description: 'The southern horn tip (Zeta Tauri). A hot blue giant orbited by a thin disk of ionized gas shed from its equator — a "Be star" that varies in brightness as the disk grows and dissipates over months to years. Its Chinese name means "heavenly gate."',
      },
      {
        name: 'Prima Hyadum', ra: 4.33, dec: 15.63, mag: 3.65,
        description: 'The brightest member of the Hyades, the nearest open cluster to Earth at only ~150 light-years — so close that its stars are spread over a wide area of sky forming the V-shape of the bull\'s face. The Hyades cluster is a key rung on the cosmic distance ladder.',
      },
    ],
    lines: [
      { from: 4, to: 0 }, { from: 0, to: 1 }, { from: 0, to: 3 },
    ],
  },
  {
    name: 'Canis Major',
    abbreviation: 'CMa',
    ra: 6.83,
    dec: -22,
    description: 'The Great Dog — home to Sirius, the brightest star in the night sky. Follows Orion across the sky as the hunter\'s faithful companion.',
    bestMonths: [12, 1, 2, 3],
    stars: [
      {
        name: 'Sirius', ra: 6.75, dec: -16.72, mag: -1.46,
        description: 'The brightest star in the entire night sky at magnitude −1.46. A binary system just 8.6 light-years away — our fifth-nearest stellar neighbor — consisting of a brilliant white main-sequence star (Sirius A) and a tiny white dwarf companion (Sirius B). The ancient Egyptians used its annual dawn appearance to predict the Nile floods.',
      },
      {
        name: 'Adhara', ra: 6.98, dec: -28.97, mag: 1.50,
        description: 'The second-brightest star in Canis Major and 22nd in the whole sky. A hot blue-white supergiant about 430 light-years away. Remarkably, if placed at the same distance as Sirius it would be so bright it would be visible in broad daylight. Its name means "the virgins" in Arabic.',
      },
      {
        name: 'Wezen', ra: 7.14, dec: -26.39, mag: 1.84,
        description: 'A yellow-white supergiant about 1,600 light-years away. Despite its relatively modest apparent magnitude, it is one of the most luminous stars in Canis Major — thousands of times brighter than the Sun. Its name means "weight" in Arabic, referencing how it sits low and sluggishly on the horizon from many latitudes.',
      },
      {
        name: 'Mirzam', ra: 6.38, dec: -17.96, mag: 1.98,
        description: 'The "announcer" — its name means "the roarer" or "the announcer" in Arabic, as it rises just ahead of Sirius and historically signaled the brilliant star\'s imminent appearance. A pulsating Beta Cephei variable that fluctuates very slightly in brightness over a period of about 6 hours.',
      },
      {
        name: 'Aludra', ra: 7.40, dec: -29.30, mag: 2.45,
        description: 'A blue supergiant with one of the largest known radii in Canis Major — over 60 times the diameter of our Sun. At roughly 3,200 light-years away, it is one of the more distant naked-eye stars in the constellation. Currently in a late stage of stellar evolution, destined to explode as a supernova.',
      },
    ],
    lines: [
      { from: 3, to: 0 }, { from: 0, to: 2 }, { from: 2, to: 1 },
      { from: 2, to: 4 },
    ],
  },
  {
    name: 'Aquila',
    abbreviation: 'Aql',
    ra: 19.84,
    dec: 8.5,
    description: 'The Eagle — bright Altair and its flanking stars form a distinctive line. Altair is part of the Summer Triangle with Vega and Deneb.',
    bestMonths: [7, 8, 9, 10],
    stars: [
      {
        name: 'Altair', ra: 19.85, dec: 8.87, mag: 0.77,
        description: 'One of the closest naked-eye stars at just 17 light-years. It spins extraordinarily fast — about 286 km/s at the equator — so rapidly that it is visibly oblate: its equatorial diameter is roughly 20% wider than its polar diameter. This has been confirmed by optical interferometry, making it one of the first stars to be directly imaged as non-spherical.',
      },
      {
        name: 'Tarazed', ra: 19.77, dec: 10.61, mag: 2.72,
        description: 'A giant orange star forming a striking color contrast with white Altair. Together with Altair and Alshain, the three form a distinctive short, nearly-straight row of stars — an easy naked-eye asterism. Its Persian name references its role as a companion to the eagle\'s flight.',
      },
      {
        name: 'Alshain', ra: 19.92, dec: 6.41, mag: 3.71,
        description: 'The southern flanking star of Altair\'s triplet, a subgiant slightly evolved beyond the main sequence at about 45 light-years away. Forms the lower end of the three-star line across the eagle\'s body. Its name comes from Persian for "the balance" or "the beam."',
      },
      {
        name: 'Theta Aql', ra: 20.19, dec: -0.82, mag: 3.23,
        description: 'A hot blue-white giant in the eagle\'s tail, about 290 light-years away. The third-brightest star in Aquila, it marks the lower body of the constellation and helps define the southward sweep of the eagle\'s silhouette.',
      },
      {
        name: 'Delta Aql', ra: 19.43, dec: 3.11, mag: 3.36,
        description: 'A white subgiant about 50 light-years away in the eagle\'s body, slightly evolved off the main sequence. One of the closer stars in Aquila and an interesting comparison to the much more distant supergiant Altair-region neighbors.',
      },
    ],
    lines: [
      { from: 1, to: 0 }, { from: 0, to: 2 }, { from: 0, to: 3 },
      { from: 0, to: 4 },
    ],
  },
  {
    name: 'Pegasus',
    abbreviation: 'Peg',
    ra: 22.69,
    dec: 24,
    description: 'The Winged Horse — recognized by the Great Square of Pegasus, a large square of four stars that is a key autumn landmark.',
    bestMonths: [9, 10, 11, 12],
    stars: [
      {
        name: 'Enif', ra: 21.74, dec: 9.87, mag: 2.39,
        description: 'Marks the nose or muzzle of the winged horse. An orange supergiant prone to sudden unpredictable flare-like brightenings by up to a full magnitude. Its name means "nose" in Arabic. Despite being the brightest star in Pegasus, it is designated Epsilon, reflecting the historical practice of lettering stars by position rather than brightness.',
      },
      {
        name: 'Scheat', ra: 23.06, dec: 28.08, mag: 2.42,
        description: 'Marks the horse\'s leg at the northwest corner of the Great Square. A red giant that visibly varies in brightness over irregular periods as it pulsates. It is slowly losing mass through a strong stellar wind, a common fate for evolved giant stars. The name means "the leg" in Arabic.',
      },
      {
        name: 'Markab', ra: 23.08, dec: 15.21, mag: 2.49,
        description: 'The southwest corner of the Great Square, marking the horse\'s shoulder or saddle. A hot blue-white giant about 140 light-years away. Its name means "saddle" or "shoulder" in Arabic. The Great Square contains very few background stars, making it a useful "empty sky" reference for estimating sky darkness.',
      },
      {
        name: 'Algenib', ra: 0.22, dec: 15.18, mag: 2.84,
        description: 'The southeast corner of the Great Square (shared with Andromeda as Alpha Andromedae / Alpheratz). A hot blue subgiant and an unusually fast pulsating star — one of the few "pulsating" B-type stars, varying with a tiny amplitude over just ~3.6 hours. Its name means "the side" in Arabic.',
      },
    ],
    lines: [
      { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 0, to: 2 },
    ],
  },
  {
    name: 'Andromeda',
    abbreviation: 'And',
    ra: 0.8,
    dec: 37,
    description: 'The Chained Princess — stretches from the Great Square of Pegasus. Contains the Andromeda Galaxy (M31), visible to the naked eye on clear nights.',
    bestMonths: [10, 11, 12, 1],
    stars: [
      {
        name: 'Alpheratz', ra: 0.14, dec: 29.09, mag: 2.06,
        description: 'Shared with Pegasus as the northeast corner of the Great Square, yet formally belongs to Andromeda. A hot blue-white star with an unusually high mercury-and-manganese abundance in its atmosphere, classifying it as a chemically peculiar "HgMn star." It is a spectroscopic binary with an unseen companion on a 96.7-day orbit.',
      },
      {
        name: 'Mirach', ra: 1.16, dec: 35.62, mag: 2.05,
        description: 'The middle star of Andromeda and one of astronomy\'s great "signpost stars." From Mirach, stargazers star-hop to the naked-eye Andromeda Galaxy (M31) about 2.5 million light-years away, and to the smaller Triangulum Galaxy (M33). An orange giant about 200 light-years from Earth.',
      },
      {
        name: 'Almach', ra: 2.07, dec: 42.33, mag: 2.17,
        description: 'A spectacular telescopic double star at the eastern end of Andromeda. Through a small telescope it reveals a gold-orange giant (one of the largest stars in the constellation) paired with a striking blue-white companion — often described as one of the most beautiful color-contrast doubles in the sky. The blue companion is itself a close spectroscopic binary.',
      },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
    ],
  },
  {
    name: 'Perseus',
    abbreviation: 'Per',
    ra: 3.5,
    dec: 45,
    description: 'The Hero — lies between Cassiopeia and the Pleiades. Contains the famous eclipsing binary star Algol ("the Demon Star").',
    bestMonths: [11, 12, 1, 2],
    stars: [
      {
        name: 'Mirfak', ra: 3.41, dec: 49.86, mag: 1.79,
        description: 'The brightest star in Perseus and the center of the Alpha Persei Moving Cluster — a loose association of about 50 young hot blue-white stars moving together through space about 560 light-years away. Through binoculars it sits in a striking rich field of cluster members. Its name means "elbow" in Arabic.',
      },
      {
        name: 'Algol', ra: 3.14, dec: 40.96, mag: 2.12,
        description: 'The original "Demon Star." One of the first known eclipsing binaries: every 2.87 days, a dimmer orange companion passes in front of the brighter blue-white primary, causing Algol to fade to about a third of its normal brightness for roughly 10 hours — visible to the naked eye. Ancient Arabic astronomers likely noticed this "winking," which may have inspired its ominous name.',
      },
      {
        name: 'Delta Per', ra: 3.72, dec: 47.79, mag: 3.01,
        description: 'A hot blue giant associated with the Perseus OB2 star-forming association, a rich region of young massive stars about 1,000 light-years away. One of several bright stars in Perseus that belong to this loose association of stellar siblings.',
      },
      {
        name: 'Epsilon Per', ra: 3.96, dec: 40.01, mag: 2.89,
        description: 'A hot rapidly-rotating Be star that periodically sheds material into a surrounding disk, causing irregular brightness variations. Also a spectroscopic binary with a close unseen companion. One of the more intrinsically luminous stars in Perseus at roughly 4,800 times the Sun\'s energy output.',
      },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 2, to: 3 },
    ],
  },
  {
    name: 'Virgo',
    abbreviation: 'Vir',
    ra: 13.4,
    dec: -4,
    description: 'The Maiden — a large zodiac constellation with brilliant blue-white Spica as its brightest star. Best found by following the arc of the Big Dipper\'s handle.',
    bestMonths: [4, 5, 6, 7],
    stars: [
      {
        name: 'Spica', ra: 13.42, dec: -11.16, mag: 0.97,
        description: 'A binary star system so close together that tidal forces distort both stars into elongated ellipsoids. The system rotates every 4 days and the two stars almost touch. Remarkably, by observing Spica\'s position over time, the ancient Greek astronomer Hipparchus discovered the precession of the equinoxes in 127 BCE. Its name is Latin for "ear of grain."',
      },
      {
        name: 'Porrima', ra: 12.69, dec: -1.45, mag: 2.74,
        description: 'A showpiece visual double star — two nearly identical yellow-white stars (both F-type, 38 and 38.5 solar luminosities) orbiting each other every 169 years. The pair passed closest in 2005 and is now slowly widening, making it an increasingly easy split for small telescopes over the coming decades.',
      },
      {
        name: 'Vindemiatrix', ra: 13.04, dec: 10.96, mag: 2.83,
        description: 'The "grape-harvester" — historically its heliacal rising (first dawn appearance after a period hidden in the Sun\'s glare) signaled the beginning of the grape harvest in the ancient Mediterranean world. A yellow giant with chemically peculiar abundances. Its name comes from Latin for "vine harvester."',
      },
      {
        name: 'Auva', ra: 12.93, dec: 3.40, mag: 3.38,
        description: 'A blue-white giant about 200 light-years away in the body of the Maiden. One of the less well-known stars of Virgo but helpful for tracing the constellation\'s extended body across the sky.',
      },
    ],
    lines: [
      { from: 2, to: 3 }, { from: 3, to: 1 }, { from: 1, to: 0 },
    ],
  },
  {
    name: 'Boötes',
    abbreviation: 'Boo',
    ra: 14.7,
    dec: 31,
    description: 'The Herdsman — shaped like a kite or ice cream cone. Brilliant orange Arcturus at its base is the 4th brightest star in the sky.',
    bestMonths: [4, 5, 6, 7, 8],
    stars: [
      {
        name: 'Arcturus', ra: 14.26, dec: 19.18, mag: -0.05,
        description: 'The fourth-brightest star in the night sky and the brightest in the northern celestial hemisphere. An orange giant just 37 light-years away, moving noticeably relative to background stars due to its unusually high proper motion — it will shift by a degree across the sky over the next 2,000 years. Easy to locate by following the "arc" of the Big Dipper\'s handle.',
      },
      {
        name: 'Izar', ra: 14.75, dec: 27.07, mag: 2.37,
        description: 'One of the finest double stars in the sky, nicknamed "Pulcherrima" (most beautiful) by William Smyth. Through a telescope it reveals a bright orange giant paired with a smaller cool blue-white star — a stunning color contrast. The two are a true gravitational binary orbiting over an extremely long period.',
      },
      {
        name: 'Muphrid', ra: 13.91, dec: 18.40, mag: 2.68,
        description: 'A subgiant star very similar to our Sun but about 9 times more luminous, located 37 light-years away — nearly the same distance as Arcturus. Spectral analysis suggests Muphrid may have formed from the same interstellar gas cloud as Arcturus, making them possible stellar siblings.',
      },
      {
        name: 'Nekkar', ra: 15.03, dec: 40.39, mag: 3.49,
        description: 'A yellow giant at the top of the Boötes kite, about 225 light-years away. Its name means "the herdsman" in Arabic — the same meaning as the constellation\'s name itself. Part of a wide binary system with a faint companion.',
      },
      {
        name: 'Seginus', ra: 14.53, dec: 38.31, mag: 3.03,
        description: 'A white giant classified as an Am (metallic-line) star — its spectrum shows abnormally strong lines of certain metals and unusually weak lines of others, caused by chemical element separation in its stable outer layers. About 85 light-years distant.',
      },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 4 }, { from: 4, to: 3 },
      { from: 0, to: 2 },
    ],
  },
  {
    name: 'Ursa Minor',
    abbreviation: 'UMi',
    ra: 15.0,
    dec: 78,
    description: 'The Little Bear — contains Polaris, the North Star, at the tip of its tail. Polaris sits almost exactly at the north celestial pole.',
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    stars: [
      {
        name: 'Polaris', ra: 2.53, dec: 89.26, mag: 1.98,
        description: 'The North Star — currently within about 0.7° of the north celestial pole, making it the star around which the entire northern sky appears to rotate. Actually a triple-star system about 430 light-years away. The primary is a Cepheid variable pulsating every ~4 days with a very small amplitude. Due to Earth\'s precession, the pole star slowly shifts over a 26,000-year cycle.',
      },
      {
        name: 'Kochab', ra: 14.85, dec: 74.16, mag: 2.08,
        description: '"Guardian of the Pole" — it served as the northern pole star around 1,500 BCE, before Earth\'s precession shifted the pole toward Polaris. An orange giant about 130 light-years away and the second-brightest star in Ursa Minor. Kochab and its neighbor Pherkad are known as the "Guardians of the Pole."',
      },
      {
        name: 'Pherkad', ra: 15.35, dec: 71.83, mag: 3.00,
        description: 'The second "Guardian of the Pole" alongside Kochab. A hot white giant classified as a Delta Scuti variable — it pulsates slightly in brightness over periods of a few hours due to oscillations in its outer layers. About 480 light-years away.',
      },
      {
        name: 'Epsilon UMi', ra: 16.77, dec: 82.04, mag: 4.23,
        description: 'A yellow giant in the handle of the Little Dipper, about 300 light-years away. Among the fainter stars of Ursa Minor but useful for tracing the full extent of the constellation on dark nights.',
      },
      {
        name: 'Delta UMi', ra: 17.54, dec: 86.59, mag: 4.36,
        description: 'A white main-sequence star about 183 light-years away in the Little Dipper\'s handle, very close to the pole. On a clear dark night it is just visible to the naked eye and helps complete the Little Dipper asterism.',
      },
    ],
    lines: [
      { from: 0, to: 4 }, { from: 4, to: 3 }, { from: 3, to: 2 },
      { from: 2, to: 1 },
    ],
  },
  {
    name: 'Sagittarius',
    abbreviation: 'Sgr',
    ra: 19.1,
    dec: -28.5,
    description: 'The Archer — contains the "Teapot" asterism. When you look toward Sagittarius you are looking toward the center of the Milky Way galaxy.',
    bestMonths: [7, 8, 9],
    stars: [
      {
        name: 'Kaus Australis', ra: 18.40, dec: -34.38, mag: 1.85,
        description: 'The southernmost of the Teapot stars and the brightest in Sagittarius. A hot blue-white giant about 145 light-years away. Its name combines Arabic "Kaus" (bow) with Latin "Australis" (southern). The region surrounding it is exceptionally rich in Milky Way star clouds and nebulae.',
      },
      {
        name: 'Nunki', ra: 18.92, dec: -26.30, mag: 2.02,
        description: 'The second-brightest star in Sagittarius and one of the few stars whose name comes from ancient Babylonian rather than Arabic — "Nunki" meant "city of the god Enki" or referred to the Euphrates River in Babylonian astrology. A hot blue giant about 228 light-years away.',
      },
      {
        name: 'Ascella', ra: 19.04, dec: -29.88, mag: 2.60,
        description: 'A spectroscopic binary in the Teapot\'s handle — the two component stars are so close together that only periodic Doppler shifts in their combined spectrum reveal the pair. Its name means "armpit" in Latin, referring to its position in the archer\'s figure.',
      },
      {
        name: 'Kaus Media', ra: 18.35, dec: -29.83, mag: 2.70,
        description: 'The middle star of the three-star "bow" arc in the Teapot. A blue giant very similar in type and distance to Kaus Australis. Together the Kaus stars trace the archer\'s bow aimed toward the scorpion\'s heart.',
      },
      {
        name: 'Kaus Borealis', ra: 18.47, dec: -25.42, mag: 2.81,
        description: 'The northernmost bow star and the "lid" of the Teapot asterism. An orange giant about 78 light-years away — much closer than the other Kaus stars despite appearing similar in brightness. It marks the tip of the archer\'s bow aimed northward toward the Scorpion.',
      },
    ],
    lines: [
      { from: 0, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 1 },
      { from: 1, to: 2 }, { from: 2, to: 0 },
    ],
  },
  {
    name: 'Auriga',
    abbreviation: 'Aur',
    ra: 6.07,
    dec: 42,
    description: 'The Charioteer — a pentagon of stars with brilliant yellow Capella. High in the sky during winter evenings in the Northern Hemisphere.',
    bestMonths: [12, 1, 2, 3],
    stars: [
      {
        name: 'Capella', ra: 5.27, dec: 46.00, mag: 0.08,
        description: 'The sixth-brightest star in the sky and the most northerly first-magnitude star. Despite appearing as a single yellow-gold star, Capella is actually two nearly-identical yellow giant stars (Capella Aa and Ab) orbiting each other every 104 days — so close they are indistinguishable visually. A fainter red dwarf binary orbits the main pair at great distance, making it a quadruple system.',
      },
      {
        name: 'Menkalinan', ra: 5.99, dec: 44.95, mag: 1.90,
        description: 'A bright white subgiant whose two components eclipse each other every ~3.96 days — one of the brighter eclipsing binaries in the sky. The dip is small (about 0.1 magnitude) but measurable by the naked eye for careful observers. Its name means "shoulder of the rein-holder" in Arabic.',
      },
      {
        name: 'Mahasim', ra: 5.99, dec: 37.21, mag: 2.69,
        description: 'A hot blue-white giant about 270 light-years away, marking Auriga\'s elbow or wrist. Its name means "wrist" in Arabic. One of three "Kids" stars near Capella that were historically associated with goat kids carried by the charioteer.',
      },
      {
        name: 'Hassaleh', ra: 4.95, dec: 33.17, mag: 2.69,
        description: 'A cool orange giant marking the lower-right corner of the Auriga pentagon, about 510 light-years away. One of the cooler and larger stars in Auriga. It sits on the border with Taurus and was historically shared between the two constellations.',
      },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 0 },
    ],
  },
  {
    name: 'Corona Borealis',
    abbreviation: 'CrB',
    ra: 15.85,
    dec: 33,
    description: 'The Northern Crown — a small but beautiful semicircular arc of stars. Easy to spot between Boötes and Hercules.',
    bestMonths: [5, 6, 7, 8],
    stars: [
      {
        name: 'Alphecca', ra: 15.58, dec: 26.71, mag: 2.23,
        description: 'The bright gem of the Northern Crown — the only bright star in the semicircle. A spectroscopic binary whose two stars eclipse each other every 17.36 days, causing a small dip in brightness. Also a Delta Scuti variable, pulsating slightly every few hours. Its name means "the bright one of the bowl" in Arabic.',
      },
      {
        name: 'Nusakan', ra: 15.46, dec: 29.11, mag: 3.68,
        description: 'The second star of the crown arc. A chemically peculiar Ap star with an unusually strong magnetic field that causes certain chemical elements to concentrate in "spots" on its surface — these spots rotate in and out of view as the star spins, causing slow periodic brightness and spectral variations.',
      },
      {
        name: 'Gamma CrB', ra: 15.71, dec: 26.30, mag: 3.84,
        description: 'A close visual double star whose two white components orbit each other in under 100 years. Currently near their closest approach, they require a telescope of at least 100mm to split. Both stars are hot white A-type main-sequence stars, making this a "twin" binary system.',
      },
      {
        name: 'Delta CrB', ra: 15.83, dec: 26.07, mag: 4.63,
        description: 'An orange giant at the curving end of the crown arc, about 165 light-years away. The faintest of the named stars in Corona Borealis but completes the semicircle shape. One of the stars whose position was used historically to define the boundary of the constellation.',
      },
    ],
    lines: [
      { from: 1, to: 0 }, { from: 0, to: 2 }, { from: 2, to: 3 },
    ],
  },
];

// =====================================================
// Astronomical calculation functions
// =====================================================

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Calculate Julian Day Number from a Date
 */
export function dateToJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  let Y = y;
  let M = m;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
}

/**
 * Calculate Greenwich Mean Sidereal Time in hours
 */
export function gmst(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T - T * T * T / 38710000.0;
  theta = ((theta % 360) + 360) % 360;
  return theta / 15.0; // convert to hours
}

/**
 * Calculate Local Sidereal Time in hours
 */
export function localSiderealTime(date: Date, longitudeDeg: number): number {
  const jd = dateToJulianDay(date);
  const gst = gmst(jd);
  let lst = gst + longitudeDeg / 15.0;
  lst = ((lst % 24) + 24) % 24;
  return lst;
}

/**
 * Convert RA/Dec to Altitude/Azimuth
 * Returns { altitude: degrees, azimuth: degrees (from North, clockwise) }
 */
export function raDecToAltAz(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lst: number
): { altitude: number; azimuth: number } {
  const ha = (lst - raHours) * 15; // Hour angle in degrees
  const haRad = ha * DEG2RAD;
  const decRad = decDeg * DEG2RAD;
  const latRad = latDeg * DEG2RAD;

  // Altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = Math.asin(sinAlt) * RAD2DEG;

  // Azimuth
  const cosAz = (Math.sin(decRad) - Math.sin(altitude * DEG2RAD) * Math.sin(latRad)) /
    (Math.cos(altitude * DEG2RAD) * Math.cos(latRad));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD2DEG;

  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }

  return { altitude, azimuth };
}

/**
 * Get compass direction from azimuth degrees
 */
export function azimuthToCompass(azimuth: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(azimuth / 22.5) % 16;
  return dirs[index];
}

/**
 * Get a human-friendly direction description
 */
export function describeDirection(azimuth: number, altitude: number): string {
  const compass = azimuthToCompass(azimuth);

  let altDesc: string;
  if (altitude < 15) altDesc = 'very low on the horizon';
  else if (altitude < 30) altDesc = 'low in the sky';
  else if (altitude < 50) altDesc = 'midway up the sky';
  else if (altitude < 70) altDesc = 'high in the sky';
  else altDesc = 'nearly overhead';

  return `Look ${compass}, ${altDesc}`;
}

/**
 * Determine visible constellations at a given time and location.
 * Returns constellations with altitude > minAltitude degrees.
 */
export function getVisibleConstellations(
  date: Date,
  latDeg: number,
  lonDeg: number,
  minAltitude: number = 10
): Array<Constellation & { altitude: number; azimuth: number; compass: string; directionHint: string }> {
  const lst = localSiderealTime(date, lonDeg);

  return CONSTELLATIONS
    .map((c) => {
      const { altitude, azimuth } = raDecToAltAz(c.ra, c.dec, latDeg, lst);
      return {
        ...c,
        altitude,
        azimuth,
        compass: azimuthToCompass(azimuth),
        directionHint: describeDirection(azimuth, altitude),
      };
    })
    .filter((c) => c.altitude > minAltitude)
    .sort((a, b) => b.altitude - a.altitude);
}

/**
 * Project RA/Dec onto a circular sky map (stereographic projection).
 * Returns x, y in range [-1, 1] where center is zenith.
 */
export function projectToSkyMap(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lst: number
): { x: number; y: number; altitude: number } | null {
  const { altitude, azimuth } = raDecToAltAz(raHours, decDeg, latDeg, lst);

  if (altitude < 0) return null;

  // Simplified linear projection: r = (90 - alt) / 90
  const r = (90 - altitude) / 90;
  const azRad = azimuth * DEG2RAD;

  // Azimuth 0 = North = top of map
  const x = r * Math.sin(azRad);
  const y = -r * Math.cos(azRad);

  return { x, y, altitude };
}

// ============================================================
//  Planetary positions — JPL approximate Keplerian elements
// ============================================================

export interface CelestialBody {
  name: string;
  symbol: string;
  description: string;
  facts: string[];
  isSun: boolean;
  isMoon?: boolean;
  ra: number;   // hours
  dec: number;  // degrees
  altitude: number;
  azimuth: number;
  compass: string;
  directionHint: string;
  phase?: number;       // 0–1 illumination fraction
  phaseAngle?: number;  // 0–360° (0=new, 90=first quarter, 180=full, 270=last quarter)
  phaseName?: string;
}

interface OrbitalElements {
  a: number;   // semi-major axis (AU)
  e: number;   // eccentricity
  I: number;   // inclination (deg)
  L: number;   // mean longitude (deg)
  wBar: number; // longitude of perihelion (deg)
  omega: number; // longitude of ascending node (deg)
  // rates per century
  aRate: number;
  eRate: number;
  IRate: number;
  LRate: number;
  wBarRate: number;
  omegaRate: number;
}

// JPL approximate elements for J2000.0 (valid 1800–2050)
const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  Mercury: {
    a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350,
    wBar: 77.45779628, omega: 48.33076593,
    aRate: 0.00000037, eRate: 0.00001906, IRate: -0.00594749, LRate: 149472.67411175,
    wBarRate: 0.16047689, omegaRate: -0.12534081,
  },
  Venus: {
    a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950,
    wBar: 131.60246718, omega: 76.67984255,
    aRate: 0.00000390, eRate: -0.00004107, IRate: -0.00078890, LRate: 58517.81538729,
    wBarRate: 0.00268329, omegaRate: -0.27769418,
  },
  Earth: {
    a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166,
    wBar: 102.93768193, omega: 0.0,
    aRate: 0.00000562, eRate: -0.00004392, IRate: -0.01294668, LRate: 35999.37244981,
    wBarRate: 0.32327364, omegaRate: 0.0,
  },
  Mars: {
    a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205,
    wBar: -23.94362959, omega: 49.55953891,
    aRate: 0.00001847, eRate: 0.00007882, IRate: -0.00813131, LRate: 19140.30268499,
    wBarRate: 0.44441088, omegaRate: -0.29257343,
  },
  Jupiter: {
    a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051,
    wBar: 14.72847983, omega: 100.47390909,
    aRate: -0.00011607, eRate: -0.00013253, IRate: -0.00183714, LRate: 3034.74612775,
    wBarRate: 0.21252668, omegaRate: 0.20469106,
  },
  Saturn: {
    a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423,
    wBar: 92.59887831, omega: 113.66242448,
    aRate: -0.00125060, eRate: -0.00050991, IRate: 0.00193609, LRate: 1222.49362201,
    wBarRate: -0.41897216, omegaRate: -0.28867794,
  },
};

const PLANET_INFO: Record<string, { symbol: string; description: string; facts: string[] }> = {
  Mercury: {
    symbol: '☿',
    description: 'The smallest planet and closest to the Sun. Difficult to spot because it never strays far from the horizon.',
    facts: [
      'Mercury has no atmosphere to retain heat — daytime temperatures reach 430°C (800°F) while nighttime plummets to -180°C (-290°F).',
      'A year on Mercury is just 88 Earth days, but a single solar day (sunrise to sunrise) lasts 176 Earth days — two full orbits.',
      'Despite being closest to the Sun, Mercury is not the hottest planet — Venus is, thanks to its greenhouse effect.',
      'Mercury\'s iron core takes up about 75% of its radius, making it the densest planet after Earth.',
      'The MESSENGER spacecraft discovered water ice in permanently shadowed craters at Mercury\'s poles.',
    ],
  },
  Venus: {
    symbol: '♀',
    description: 'The brightest planet in our sky, often called the Morning or Evening Star. Its thick clouds reflect sunlight brilliantly.',
    facts: [
      'Venus rotates backwards (retrograde) compared to most planets, so the Sun rises in the west and sets in the east.',
      'A day on Venus (243 Earth days) is longer than its year (225 Earth days) — it spins incredibly slowly.',
      'Surface pressure on Venus is 90 times that of Earth — equivalent to being 900 meters underwater.',
      'Venus\'s thick CO₂ atmosphere creates a runaway greenhouse effect, making its surface hotter than Mercury at 465°C (870°F).',
      'Venus is the closest planet to Earth in size — sometimes called Earth\'s "evil twin" due to its hostile conditions.',
    ],
  },
  Mars: {
    symbol: '♂',
    description: 'The Red Planet, named for the Roman god of war. Its reddish hue comes from iron oxide (rust) on its surface.',
    facts: [
      'Olympus Mons on Mars is the tallest volcano in the solar system at ~21.9 km (72,000 ft) — nearly 2.5 times the height of Everest.',
      'Mars has seasons similar to Earth because its axial tilt (25.2°) is close to Earth\'s (23.4°).',
      'The Valles Marineris canyon system stretches over 4,000 km — roughly the width of the continental United States.',
      'Mars has two tiny moons, Phobos and Deimos, likely captured asteroids. Phobos is slowly spiraling inward and will eventually break apart.',
      'A Martian day ("sol") is 24 hours and 37 minutes — remarkably close to an Earth day.',
    ],
  },
  Jupiter: {
    symbol: '♃',
    description: 'The largest planet in our solar system. Its four Galilean moons are visible through binoculars.',
    facts: [
      'Jupiter\'s Great Red Spot is a storm larger than Earth that has been raging for at least 350 years.',
      'Jupiter has at least 95 known moons — including the four large Galilean moons discovered by Galileo in 1610.',
      'Jupiter\'s moon Europa likely has a liquid water ocean beneath its icy crust, making it a prime candidate for extraterrestrial life.',
      'Jupiter is so massive (318× Earth\'s mass) that it doesn\'t orbit the Sun\'s center — the barycenter lies outside the Sun\'s surface.',
      'Jupiter\'s magnetosphere is the largest structure in the solar system — if visible, it would appear twice the size of the full Moon from Earth.',
    ],
  },
  Saturn: {
    symbol: '♄',
    description: 'The ringed planet — its stunning ring system is visible through a small telescope. Second largest planet in our solar system.',
    facts: [
      'Saturn\'s rings are made of billions of chunks of ice and rock, ranging in size from tiny grains to house-sized boulders.',
      'Despite being the second-largest planet, Saturn is the least dense — it would float in water if you could find a bathtub big enough.',
      'Saturn\'s moon Titan has a thick nitrogen atmosphere and liquid methane lakes on its surface — the only other body with stable surface liquids.',
      'Saturn\'s rings span up to 282,000 km in diameter but are only about 10 meters thick on average.',
      'A day on Saturn is just 10.7 hours — its rapid rotation makes it noticeably oblate (wider at the equator).',
    ],
  },
};

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/**
 * Compute the Moon's geocentric ecliptic longitude and latitude (degrees).
 * Uses a simplified version of Brown's lunar theory (Meeus, Astronomical Algorithms ch. 47).
 * Accuracy: ~1° in longitude, ~0.3° in latitude.
 * d = days since J2000.0 (JD - 2451545.0)
 */
function computeLunarEcliptic(d: number): { lon: number; lat: number } {
  const L  = norm360(218.3164477 + 13.17639648 * d); // Moon mean longitude
  const D  = norm360(297.8501921 + 12.19074912 * d); // Mean elongation
  const M  = norm360(357.5291092 +  0.98560028 * d); // Sun mean anomaly
  const Mp = norm360(134.9633964 + 13.06499295 * d); // Moon mean anomaly
  const F  = norm360( 93.2720950 + 13.22935024 * d); // Argument of latitude

  const Dr = D  * DEG2RAD;
  const Mr = M  * DEG2RAD;
  const Mpr = Mp * DEG2RAD;
  const Fr = F  * DEG2RAD;

  // Ecliptic longitude correction (degrees) — top 16 terms from Meeus Table 47.A
  const lon = L
    + 6.288774 * Math.sin(Mpr)
    + 1.274027 * Math.sin(2*Dr - Mpr)
    + 0.658314 * Math.sin(2*Dr)
    + 0.213618 * Math.sin(2*Mpr)
    - 0.185116 * Math.sin(Mr)
    - 0.114332 * Math.sin(2*Fr)
    + 0.058793 * Math.sin(2*Dr - 2*Mpr)
    + 0.057066 * Math.sin(2*Dr - Mr - Mpr)
    + 0.053322 * Math.sin(2*Dr + Mpr)
    + 0.045758 * Math.sin(2*Dr - Mr)
    - 0.040923 * Math.sin(Mr - Mpr)
    - 0.034720 * Math.sin(Dr)
    - 0.030383 * Math.sin(Mr + Mpr)
    + 0.015327 * Math.sin(2*Dr - 2*Fr)
    - 0.012528 * Math.sin(Mpr + 2*Fr)
    - 0.010980 * Math.sin(Mpr - 2*Fr);

  // Ecliptic latitude (degrees) — top 13 terms from Meeus Table 47.B
  const lat =
    + 5.128122 * Math.sin(Fr)
    + 0.280602 * Math.sin(Mpr + Fr)
    + 0.277693 * Math.sin(Mpr - Fr)
    + 0.173237 * Math.sin(2*Dr - Fr)
    + 0.055413 * Math.sin(2*Dr - Mpr + Fr)
    - 0.046271 * Math.sin(2*Dr - Mpr - Fr)
    + 0.032573 * Math.sin(2*Dr + Fr)
    + 0.017198 * Math.sin(2*Mpr + Fr)
    + 0.009267 * Math.sin(2*Dr + Mpr - Fr)
    + 0.008823 * Math.sin(2*Mpr - Fr)
    - 0.008247 * Math.sin(2*Dr - Mr - Fr)
    + 0.004323 * Math.sin(2*Dr - Fr - 2*Mpr)
    + 0.004200 * Math.sin(2*Dr + Mpr + Fr);

  return { lon: norm360(lon), lat };
}

function computeHeliocentricEcliptic(name: string, T: number): { x: number; y: number; z: number } {
  const el = ORBITAL_ELEMENTS[name];
  const a = el.a + el.aRate * T;
  const e = el.e + el.eRate * T;
  const I = (el.I + el.IRate * T) * DEG2RAD;
  const L = el.L + el.LRate * T;
  const wBar = el.wBar + el.wBarRate * T;
  const O = (el.omega + el.omegaRate * T) * DEG2RAD;

  const w = (wBar - el.omega - el.omegaRate * T) * DEG2RAD;
  const M = ((L - wBar) % 360 + 360) % 360 * DEG2RAD;

  // Solve Kepler's equation: E - e*sin(E) = M
  let E = M;
  for (let i = 0; i < 20; i++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }

  // Heliocentric coordinates in orbital plane
  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate to ecliptic coordinates
  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosI = Math.cos(I), sinI = Math.sin(I);

  const x = (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb;
  const y = (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb;
  const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

  return { x, y, z };
}

function eclipticToRaDec(xGeo: number, yGeo: number, zGeo: number, obliquity: number): { ra: number; dec: number } {
  const cosE = Math.cos(obliquity);
  const sinE = Math.sin(obliquity);

  const xEq = xGeo;
  const yEq = cosE * yGeo - sinE * zGeo;
  const zEq = sinE * yGeo + cosE * zGeo;

  const ra = ((Math.atan2(yEq, xEq) * RAD2DEG) % 360 + 360) % 360;
  const dec = Math.asin(zEq / Math.sqrt(xEq * xEq + yEq * yEq + zEq * zEq)) * RAD2DEG;

  return { ra: ra / 15, dec }; // ra in hours
}

export interface SunMoonPosition {
  sun: { ra: number; dec: number };
  moon: { ra: number; dec: number };
  /** Moon's ecliptic elongation from the Sun, 0-360°. 0/360 = new moon (solar eclipse season), 180 = full moon (lunar eclipse season). */
  phaseAngle: number;
}

/**
 * Geocentric Sun/Moon equatorial positions for a moment in time — no observer location involved.
 * Shared by getCelestialBodies() and by the sky-event conjunction search in skyEvents.ts.
 */
export function getSunMoonPosition(date: Date): SunMoonPosition {
  const jd = dateToJulianDay(date);
  const d = jd - 2451545.0;
  const T = d / 36525;
  const obliquity = (23.439291 - 0.0130042 * T) * DEG2RAD;

  const earth = computeHeliocentricEcliptic('Earth', T);
  const sunRaDec = eclipticToRaDec(-earth.x, -earth.y, -earth.z, obliquity);

  const moonEcl = computeLunarEcliptic(d);
  const moonLonRad = moonEcl.lon * DEG2RAD;
  const moonLatRad = moonEcl.lat * DEG2RAD;
  const moonRaDec = eclipticToRaDec(
    Math.cos(moonLatRad) * Math.cos(moonLonRad),
    Math.cos(moonLatRad) * Math.sin(moonLonRad),
    Math.sin(moonLatRad),
    obliquity
  );

  const sunLon = norm360(Math.atan2(-earth.y, -earth.x) * RAD2DEG);
  const phaseAngle = norm360(moonEcl.lon - sunLon);

  return { sun: sunRaDec, moon: moonRaDec, phaseAngle };
}

export function getCelestialBodies(date: Date, latDeg: number, lonDeg: number): CelestialBody[] {
  const jd = dateToJulianDay(date);
  const d = jd - 2451545.0;            // days since J2000.0
  const T = d / 36525;                  // centuries since J2000.0
  const obliquity = (23.439291 - 0.0130042 * T) * DEG2RAD;
  const lst = localSiderealTime(date, lonDeg);

  // Earth's heliocentric position (still needed below for planet geocentric positions)
  const earth = computeHeliocentricEcliptic('Earth', T);
  const { sun: sunRaDec, moon: moonRaDec, phaseAngle } = getSunMoonPosition(date);

  const bodies: CelestialBody[] = [];

  const sunAltAz = raDecToAltAz(sunRaDec.ra, sunRaDec.dec, latDeg, lst);
  bodies.push({
    name: 'Sun',
    symbol: '☀',
    description: 'Our nearest star, 93 million miles away. When above the horizon, its brightness washes out most stars and planets.',
    facts: [
      'The Sun contains 99.86% of all mass in the solar system — over 330,000 times Earth\'s mass.',
      'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth, traveling at 300,000 km/s.',
      'The Sun\'s core temperature is about 15 million °C (27 million °F) — hot enough to fuse hydrogen into helium.',
      'The Sun is roughly halfway through its life — about 4.6 billion years old with another ~5 billion years of hydrogen fuel remaining.',
      'Every second, the Sun converts about 600 million tons of hydrogen into helium, releasing energy equivalent to billions of nuclear bombs.',
    ],
    isSun: true,
    ra: sunRaDec.ra,
    dec: sunRaDec.dec,
    altitude: sunAltAz.altitude,
    azimuth: sunAltAz.azimuth,
    compass: azimuthToCompass(sunAltAz.azimuth),
    directionHint: sunAltAz.altitude > 0
      ? `The Sun is ${sunAltAz.altitude.toFixed(0)}° above the ${azimuthToCompass(sunAltAz.azimuth)} horizon`
      : `The Sun is below the horizon (${sunAltAz.altitude.toFixed(0)}°)`,
  });

  // Moon
  const moonAltAz = raDecToAltAz(moonRaDec.ra, moonRaDec.dec, latDeg, lst);
  const phase = (1 - Math.cos(phaseAngle * DEG2RAD)) / 2;
  const phaseName =
    phaseAngle < 22.5   ? 'New Moon'        :
    phaseAngle < 67.5   ? 'Waxing Crescent' :
    phaseAngle < 112.5  ? 'First Quarter'   :
    phaseAngle < 157.5  ? 'Waxing Gibbous'  :
    phaseAngle < 202.5  ? 'Full Moon'       :
    phaseAngle < 247.5  ? 'Waning Gibbous'  :
    phaseAngle < 292.5  ? 'Last Quarter'    : 'Waning Crescent';

  bodies.push({
    name: 'Moon',
    symbol: '☽',
    description: "Earth's only natural satellite, roughly 384,400 km away. Its gravity drives Earth's ocean tides and its reflected sunlight has guided human activity for millennia.",
    facts: [
      "The Moon is slowly drifting away from Earth at about 3.8 cm per year — roughly the rate your fingernails grow.",
      "The Moon stabilizes Earth's axial tilt, preventing extreme climate swings that would make complex life far more difficult.",
      "A lunar day (one rotation relative to the Sun) is 29.5 Earth days — identical to its orbital period, which is why we always see the same face.",
      "The Moon has no atmosphere, so surface temperatures swing from 127 °C (261 °F) in sunlight to −173 °C (−279 °F) in shadow.",
      "Twelve humans have walked on the Moon, all during NASA's Apollo program between July 1969 and December 1972.",
    ],
    isSun: false,
    isMoon: true,
    ra: moonRaDec.ra,
    dec: moonRaDec.dec,
    altitude: moonAltAz.altitude,
    azimuth: moonAltAz.azimuth,
    compass: azimuthToCompass(moonAltAz.azimuth),
    directionHint: moonAltAz.altitude > 0
      ? `Look ${azimuthToCompass(moonAltAz.azimuth)} at about ${moonAltAz.altitude.toFixed(0)}° above the horizon`
      : `Currently below the horizon (${moonAltAz.altitude.toFixed(0)}°)`,
    phase,
    phaseAngle,
    phaseName,
  });

  // Planets
  for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
    const planet = computeHeliocentricEcliptic(name, T);
    const geoX = planet.x - earth.x;
    const geoY = planet.y - earth.y;
    const geoZ = planet.z - earth.z;
    const raDec = eclipticToRaDec(geoX, geoY, geoZ, obliquity);
    const altAz = raDecToAltAz(raDec.ra, raDec.dec, latDeg, lst);
    const info = PLANET_INFO[name];

    bodies.push({
      name,
      symbol: info.symbol,
      description: info.description,
      facts: info.facts,
      isSun: false,
      ra: raDec.ra,
      dec: raDec.dec,
      altitude: altAz.altitude,
      azimuth: altAz.azimuth,
      compass: azimuthToCompass(altAz.azimuth),
      directionHint: altAz.altitude > 0
        ? `Look ${azimuthToCompass(altAz.azimuth)} at about ${altAz.altitude.toFixed(0)}° above the horizon`
        : `Currently below the horizon (${altAz.altitude.toFixed(0)}°)`,
    });
  }

  return bodies;
}
