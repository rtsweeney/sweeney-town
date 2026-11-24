// Static country facts for the World Cup tracker detail panel.
// Population and GDP are rough recent estimates (nominal GDP), kept short on
// purpose — this is a fun at-a-glance panel, not an almanac. Lookup is by
// team name as ESPN reports it, with aliases for the usual spelling variants.

export interface CountryFacts {
  population: string;
  nationSince: string;
  gdp: string;
  fact: string;
}

interface FactsEntry extends CountryFacts {
  names: string[];
}

const ENTRIES: FactsEntry[] = [
  { names: ['united states', 'usa'], population: '342 million', nationSince: '1776 — Declaration of Independence', gdp: '≈ $29 trillion', fact: '1994 hosts — still the best-attended World Cup ever, a record 2026 is built to break.' },
  { names: ['mexico'], population: '130 million', nationSince: '1810 — independence from Spain declared', gdp: '≈ $1.8 trillion', fact: 'First country to host three World Cups (1970, 1986, 2026). The Azteca has staged two finals.' },
  { names: ['canada'], population: '40 million', nationSince: '1867 — Confederation', gdp: '≈ $2.2 trillion', fact: '2026 is the first men’s World Cup on Canadian soil; the men had qualified only twice before.' },
  { names: ['argentina'], population: '46 million', nationSince: '1816 — independence from Spain', gdp: '≈ $640 billion', fact: 'Defending champions. Messi’s 2022 triumph sewed a third star on the shirt.' },
  { names: ['brazil'], population: '212 million', nationSince: '1822 — independence from Portugal', gdp: '≈ $2.2 trillion', fact: 'The only nation to appear at every World Cup — and the only five-time winner.' },
  { names: ['france'], population: '68 million', nationSince: '843 — Treaty of Verdun (Republic since 1792)', gdp: '≈ $3.1 trillion', fact: 'Reached three of the last four World Cup finals, winning in 1998 and 2018.' },
  { names: ['england'], population: '57 million', nationSince: '927 — Kingdom of England (part of the UK since 1707)', gdp: '≈ $3.5 trillion (UK)', fact: 'Football’s birthplace — the FA wrote the first unified rules in 1863.' },
  { names: ['spain'], population: '48 million', nationSince: '1479 — union of Castile and Aragon', gdp: '≈ $1.7 trillion', fact: '2010 world champions and reigning European champions after Euro 2024.' },
  { names: ['germany'], population: '84 million', nationSince: '1871 — unification (reunified 1990)', gdp: '≈ $4.7 trillion', fact: 'Four titles and a record eight final appearances.' },
  { names: ['portugal'], population: '10.5 million', nationSince: '1143 — Kingdom of Portugal', gdp: '≈ $300 billion', fact: 'Europe’s oldest fixed borders — and Ronaldo, the top scorer in men’s international history.' },
  { names: ['netherlands'], population: '18 million', nationSince: '1581 — independence from Habsburg Spain', gdp: '≈ $1.2 trillion', fact: 'Three finals, zero titles — famously the best team never to win it.' },
  { names: ['belgium'], population: '11.8 million', nationSince: '1830 — independence from the Netherlands', gdp: '≈ $650 billion', fact: 'Spent years ranked #1 in the world without lifting a major trophy.' },
  { names: ['croatia'], population: '3.8 million', nationSince: '1991 — independence from Yugoslavia', gdp: '≈ $85 billion', fact: '2018 runners-up and 2022 third place, from a nation of under 4 million.' },
  { names: ['uruguay'], population: '3.4 million', nationSince: '1828 — independence recognized', gdp: '≈ $80 billion', fact: 'Won the very first World Cup in 1930 — and skipped 1934 in protest when Europe didn’t show up to theirs.' },
  { names: ['colombia'], population: '52 million', nationSince: '1810 — independence from Spain', gdp: '≈ $390 billion', fact: 'James Rodríguez won the 2014 Golden Boot with six goals.' },
  { names: ['morocco'], population: '38 million', nationSince: '1956 — independence from France', gdp: '≈ $150 billion', fact: 'First African semifinalist ever (2022) — and co-hosts of the 2030 World Cup.' },
  { names: ['japan'], population: '124 million', nationSince: '660 BC — traditional founding', gdp: '≈ $4 trillion', fact: 'Japanese fans famously stay behind to clean the stadium after matches.' },
  { names: ['south korea', 'korea republic'], population: '52 million', nationSince: '1948 — Republic of Korea established', gdp: '≈ $1.8 trillion', fact: 'The 2002 semifinal run on home soil is still Asia’s best World Cup finish.' },
  { names: ['australia'], population: '27 million', nationSince: '1901 — Federation', gdp: '≈ $1.8 trillion', fact: 'A whole continent that plays its qualifiers in Asia’s confederation.' },
  { names: ['senegal'], population: '18 million', nationSince: '1960 — independence from France', gdp: '≈ $32 billion', fact: 'Beat defending champions France in their 2002 World Cup debut.' },
  { names: ['ghana'], population: '34 million', nationSince: '1957 — first sub-Saharan colony to gain independence', gdp: '≈ $76 billion', fact: 'A Luis Suárez handball on the line away from a 2010 semifinal.' },
  { names: ['ecuador'], population: '18 million', nationSince: '1830 — separation from Gran Colombia', gdp: '≈ $120 billion', fact: 'Home qualifiers in Quito are played at 2,850 m of altitude.' },
  { names: ['switzerland'], population: '9 million', nationSince: '1291 — Old Swiss Confederacy', gdp: '≈ $940 billion', fact: 'FIFA has been headquartered in Zürich since 1932.' },
  { names: ['denmark'], population: '6 million', nationSince: 'c. 900s — one of the world’s oldest kingdoms', gdp: '≈ $410 billion', fact: 'Won Euro 1992 after being called up as a late replacement for Yugoslavia.' },
  { names: ['poland'], population: '36.6 million', nationSince: '966 — baptism of Poland (restored 1918)', gdp: '≈ $860 billion', fact: 'Robert Lewandowski once scored five goals in nine minutes off the bench.' },
  { names: ['serbia'], population: '6.6 million', nationSince: '2006 — current state (medieval kingdom roots)', gdp: '≈ $82 billion', fact: 'FIFA counts it as the successor of Yugoslavia’s World Cup record.' },
  { names: ['wales'], population: '3.1 million', nationSince: 'Annexed 1284 — part of the UK, own FA since 1876', gdp: '≈ $110 billion (share of UK)', fact: 'Waited 64 years between World Cups (1958 to 2022).' },
  { names: ['scotland'], population: '5.4 million', nationSince: '843 — Kingdom of Alba (part of the UK since 1707)', gdp: '≈ $250 billion (share of UK)', fact: 'Played in the world’s first international match, 0–0 vs England in 1872.' },
  { names: ['iran'], population: '90 million', nationSince: '1979 — Islamic Republic (Persian empires for millennia)', gdp: '≈ $400 billion', fact: 'Asia’s most frequent World Cup qualifier this century.' },
  { names: ['qatar'], population: '3 million', nationSince: '1971 — independence from Britain', gdp: '≈ $220 billion', fact: '2022 hosts — the first World Cup in the Middle East.' },
  { names: ['costa rica'], population: '5.2 million', nationSince: '1821 — independence from Spain', gdp: '≈ $90 billion', fact: 'Abolished its army in 1948 and reached the quarterfinals in 2014.' },
  { names: ['tunisia'], population: '12 million', nationSince: '1956 — independence from France', gdp: '≈ $50 billion', fact: 'First African side to win a World Cup match (1978).' },
  { names: ['saudi arabia'], population: '33 million', nationSince: '1932 — unification of the kingdom', gdp: '≈ $1.1 trillion', fact: 'Beat eventual champions Argentina in 2022 — and hosts the 2034 World Cup.' },
  { names: ['norway'], population: '5.6 million', nationSince: '1905 — independence from Sweden', gdp: '≈ $500 billion', fact: 'The only team with a winning record against Brazil at World Cups.' },
  { names: ['austria'], population: '9.1 million', nationSince: '1918 — republic after the Habsburg empire', gdp: '≈ $520 billion', fact: 'The 1930s “Wunderteam” was once the best side in the world.' },
  { names: ['italy'], population: '59 million', nationSince: '1861 — unification', gdp: '≈ $2.3 trillion', fact: 'Four-time champions who somehow missed both 2018 and 2022.' },
  { names: ['turkey', 'türkiye'], population: '85 million', nationSince: '1923 — republic founded by Atatürk', gdp: '≈ $1.1 trillion', fact: 'Third place in 2002 in only their second World Cup.' },
  { names: ['ukraine'], population: '37 million', nationSince: '1991 — independence from the USSR', gdp: '≈ $180 billion', fact: 'Quarterfinalists in their 2006 debut.' },
  { names: ['ivory coast', 'côte d’ivoire', "cote d'ivoire"], population: '29 million', nationSince: '1960 — independence from France', gdp: '≈ $80 billion', fact: 'Reigning African champions after a fairy-tale home AFCON in 2024.' },
  { names: ['nigeria'], population: '227 million', nationSince: '1960 — independence from Britain', gdp: '≈ $250 billion', fact: 'Africa’s most populous country; Olympic football gold in 1996.' },
  { names: ['egypt'], population: '112 million', nationSince: '1922 — independence (civilization 5,000+ years old)', gdp: '≈ $380 billion', fact: 'Record seven-time African champions, led by Mo Salah.' },
  { names: ['algeria'], population: '46 million', nationSince: '1962 — independence from France', gdp: '≈ $270 billion', fact: 'Their 1982 win over West Germany prompted FIFA to make final group games simultaneous.' },
  { names: ['cameroon'], population: '28 million', nationSince: '1960 — independence from France', gdp: '≈ $50 billion', fact: 'Roger Milla’s corner-flag dance made them Africa’s first quarterfinalists (1990).' },
  { names: ['south africa'], population: '62 million', nationSince: '1994 — first democratic elections (union 1910)', gdp: '≈ $400 billion', fact: '2010 hosts — the first World Cup in Africa, soundtracked by vuvuzelas.' },
  { names: ['cape verde', 'cabo verde'], population: '600 thousand', nationSince: '1975 — independence from Portugal', gdp: '≈ $2.6 billion', fact: '2026 debutants — an island nation of ten volcanic islands.' },
  { names: ['jordan'], population: '11.5 million', nationSince: '1946 — independence from Britain', gdp: '≈ $53 billion', fact: '2026 is their first World Cup, after a run to the 2023 Asian Cup final.' },
  { names: ['uzbekistan'], population: '37 million', nationSince: '1991 — independence from the USSR', gdp: '≈ $115 billion', fact: '2026 debutants — the first Central Asian nation at a World Cup.' },
  { names: ['iraq'], population: '45 million', nationSince: '1932 — independence from Britain', gdp: '≈ $270 billion', fact: 'Their 2007 Asian Cup title, won mid-war, is one of sport’s great stories.' },
  { names: ['panama'], population: '4.5 million', nationSince: '1903 — separation from Colombia', gdp: '≈ $87 billion', fact: 'The canal moves ~5% of world trade; their 2018 debut was a national holiday.' },
  { names: ['paraguay'], population: '6.9 million', nationSince: '1811 — independence from Spain', gdp: '≈ $45 billion', fact: 'Back at the World Cup for the first time since 2010.' },
  { names: ['peru'], population: '34 million', nationSince: '1821 — independence from Spain', gdp: '≈ $290 billion', fact: 'Home of Machu Picchu and the oldest derby in South America.' },
  { names: ['chile'], population: '20 million', nationSince: '1818 — independence from Spain', gdp: '≈ $340 billion', fact: 'Back-to-back Copa América champions in 2015 and 2016.' },
  { names: ['honduras'], population: '10.6 million', nationSince: '1821 — independence from Spain', gdp: '≈ $35 billion', fact: 'The 1969 qualifier against El Salvador preceded the “Football War.”' },
  { names: ['jamaica'], population: '2.8 million', nationSince: '1962 — independence from Britain', gdp: '≈ $20 billion', fact: 'The Reggae Boyz beat Japan at their only World Cup (1998).' },
  { names: ['curaçao', 'curacao'], population: '156 thousand', nationSince: '2010 — autonomous country in the Kingdom of the Netherlands', gdp: '≈ $3.2 billion', fact: 'The smallest nation ever to qualify for a World Cup.' },
  { names: ['haiti'], population: '11.7 million', nationSince: '1804 — world’s first Black republic', gdp: '≈ $20 billion', fact: 'Back at the World Cup for the first time since 1974.' },
  { names: ['new zealand'], population: '5.3 million', nationSince: '1907 — dominion status', gdp: '≈ $250 billion', fact: 'The All Whites left the 2010 World Cup as the only unbeaten team.' },
  { names: ['sweden'], population: '10.6 million', nationSince: '1523 — Gustav Vasa’s kingdom', gdp: '≈ $620 billion', fact: 'Hosted and reached the final in 1958 — a teenage Pelé spoiled it.' },
  { names: ['czechia', 'czech republic'], population: '10.9 million', nationSince: '1993 — split of Czechoslovakia', gdp: '≈ $340 billion', fact: 'Czechoslovakia reached two World Cup finals (1934, 1962).' },
  { names: ['greece'], population: '10.3 million', nationSince: '1830 — independence from the Ottomans', gdp: '≈ $250 billion', fact: 'Euro 2004 champions at 80-to-1 odds.' },
  { names: ['romania'], population: '19 million', nationSince: '1877 — independence from the Ottomans', gdp: '≈ $350 billion', fact: 'Hagi’s “Maradona of the Carpathians” team lit up USA ’94.' },
  { names: ['hungary'], population: '9.6 million', nationSince: '1000 — Kingdom of Hungary crowned', gdp: '≈ $220 billion', fact: 'The Mighty Magyars went 31 games unbeaten into the 1954 final.' },
  { names: ['slovakia'], population: '5.4 million', nationSince: '1993 — split of Czechoslovakia', gdp: '≈ $140 billion', fact: 'Knocked holders Italy out in their 2010 debut.' },
  { names: ['slovenia'], population: '2.1 million', nationSince: '1991 — independence from Yugoslavia', gdp: '≈ $70 billion', fact: 'One of the smallest nations to qualify twice by 2010.' },
  { names: ['albania'], population: '2.7 million', nationSince: '1912 — independence from the Ottomans', gdp: '≈ $26 billion', fact: 'Scored 23 seconds into Euro 2024 — the fastest goal in Euros history.' },
  { names: ['bosnia and herzegovina', 'bosnia'], population: '3.2 million', nationSince: '1992 — independence from Yugoslavia', gdp: '≈ $28 billion', fact: 'Džeko and Pjanić carried them to a 2014 debut.' },
  { names: ['dr congo', 'congo dr', 'democratic republic of the congo'], population: '105 million', nationSince: '1960 — independence from Belgium', gdp: '≈ $70 billion', fact: 'As Zaire in 1974, they were sub-Saharan Africa’s first World Cup team.' },
  { names: ['bolivia'], population: '12.4 million', nationSince: '1825 — independence from Spain', gdp: '≈ $47 billion', fact: 'Home matches in El Alto sit above 4,000 m — the highest in world football.' },
  { names: ['suriname'], population: '630 thousand', nationSince: '1975 — independence from the Netherlands', gdp: '≈ $4 billion', fact: 'Produced Gullit-era Dutch stars via the Surinamese diaspora.' },
  { names: ['united arab emirates', 'uae'], population: '10 million', nationSince: '1971 — federation of seven emirates', gdp: '≈ $500 billion', fact: 'Their only World Cup (1990) came under coach Carlos Alberto Parreira.' },
];

const INDEX = new Map<string, CountryFacts>();
for (const entry of ENTRIES) {
  for (const name of entry.names) INDEX.set(name, entry);
}

export function lookupCountryFacts(name: string): CountryFacts | null {
  return INDEX.get(name.trim().toLowerCase()) ?? null;
}
