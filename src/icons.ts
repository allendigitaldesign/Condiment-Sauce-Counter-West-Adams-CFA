/**
 * A small picture for every item, shown in the corner of its tile.
 *
 * Each one is drawn as the thing staff actually pick up, matched to the
 * pictures on the store's own bin labels: the sauce cups by their lid colour,
 * the dressings by the stripe on the packet, and so on. Syrup, the coffee
 * condiments, forks and knives weren't in the photos, so those are drawn from
 * how they usually look.
 *
 * Every icon is the inside of a 64×64 SVG. Every id in `src/items.ts` needs
 * one; `npm test` checks. A new item without one would show a blank corner.
 */

const O = '#4a3530'; // outline
const line = `stroke="${O}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;

const at = (x: number, y: number, scale: number, svg: string) =>
  `<g transform="translate(${x} ${y}) scale(${scale})">${svg}</g>`;

// --- Emblems: drawn around (0,0), about 16 units across ------------------

const chili = (fill: string) => `
  <path d="M-6 6C-1 6 5 1 6-5C6.5-7 4.5-7.5 4-6C2.5-2-1 2-6.5 3.5C-8.5 4.2-8 6-6 6Z" fill="${fill}" ${line}/>
  <path d="M5-6.2C5.2-8 6.5-8.8 8-8.6" fill="none" stroke="#3E9142" stroke-width="2.4" stroke-linecap="round"/>`;

const grapes = `
  <g fill="#7A3B8F" stroke="${O}" stroke-width="1.6">
    <circle cx="-4" cy="-2" r="3"/><circle cx="2" cy="-2" r="3"/>
    <circle cx="-1" cy="3" r="3"/><circle cx="-1" cy="7.8" r="2.6"/>
  </g>
  <path d="M-1-5C-1-7.5 0-8.5 2-9" fill="none" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M1-6.5C3-9.5 6.5-9 7-7C5-5.5 2.5-5.5 1-6.5Z" fill="#3E9142" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/>`;

const strawberry = `
  <path d="M0 8C-5 5-7.5 0-6.5-3.5C-5.5-6 5.5-6 6.5-3.5C7.5 0 5 5 0 8Z" fill="#E0303B" ${line}/>
  <g fill="#FFE9A8"><circle cx="-2.5" cy="-1" r=".9"/><circle cx="2.5" cy="-1" r=".9"/><circle cx="0" cy="2.5" r=".9"/></g>
  <path d="M-5-4.5-2.5-7 0-5 2.5-7 5-4.5 0-3.5Z" fill="#3E9142" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>`;

const drop = (fill: string) => `
  <path d="M0-8C3 -3.5 6 -0.5 6 3A6 6 0 0 1-6 3C-6-.5-3-3.5 0-8Z" fill="${fill}" ${line}/>
  <path d="M-2.8 2.5A3 3 0 0 0-.5 5.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;

const sparkle = `<path d="M0-7.5 1.8-1.8 7.5 0 1.8 1.8 0 7.5-1.8 1.8-7.5 0-1.8-1.8Z" fill="#fff" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>`;

const flower = `
  <g fill="#FFFDF5" stroke="${O}" stroke-width="1.5" stroke-linejoin="round">
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-4.2" rx="2.6" ry="4" transform="rotate(${a})"/>`).join('')}
  </g><circle r="2.2" fill="#E9B949" stroke="${O}" stroke-width="1.2"/>`;

/** Lines of small print, `n` of them starting at y. */
const print = (x1: number, x2: number, y: number, n: number, fill: string, gap = 4) =>
  Array.from(
    { length: n },
    (_, i) => `<rect x="${x1}" y="${y + i * gap}" width="${x2 - x1 - (i % 2) * 4}" height="1.8" rx=".9" fill="${fill}"/>`,
  ).join('');

// --- Shapes ---------------------------------------------------------------

/**
 * A sauce cup from above, as on the bin labels: a rounded lid in the sauce's
 * colour with white print and the peel tab in the bottom-left corner, and the
 * clear cup behind it showing the sauce.
 */
function sauceCup({ lid, sauce, ink = '#fff', tab = '#fff' }: { lid: string; sauce: string; ink?: string; tab?: string }) {
  return `
    <rect x="15" y="12" width="40" height="46" rx="8" fill="${sauce}" ${line}/>
    <rect x="9" y="6" width="40" height="46" rx="8" fill="${lid}" ${line}/>
    <path d="M17 14.5C18.5 12.5 20 12.5 21 14.5S23.5 16.5 25 14.5 28 12.5 29.5 14.5" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="16" y="19" width="22" height="3.6" rx="1.8" fill="${ink}"/>
    <g fill="${ink}" opacity=".7">
      <rect x="15" y="27" width="28" height="1.8" rx=".9"/>
      <rect x="15" y="31" width="26" height="1.8" rx=".9"/>
      <rect x="15" y="35" width="28" height="1.8" rx=".9"/>
      <rect x="22" y="42" width="20" height="1.6" rx=".8"/>
    </g>
    <path d="M10.2 40.5V44.5A6.3 6.3 0 0 0 16.5 50.8H20.8Z" fill="${tab}"/>
    <rect x="9" y="6" width="40" height="46" rx="8" fill="none" ${line}/>`;
}

/**
 * The dressing packets, as on the fridge bin labels: white, a thin stripe of
 * colour across the top and bottom, a bottle-shaped window showing the
 * dressing, and a white label in the middle.
 */
function dressingPacket({ stripe, dressing, flecks }: { stripe: string; dressing: string; flecks?: string }) {
  let crimp = 'M15 10.5';
  for (let x = 15; x < 49; x += 3.4) crimp += `L${x + 1.7} 12.1L${x + 3.4} 10.5`;
  return `
    <rect x="12" y="4" width="40" height="56" rx="3" fill="#fff" ${line}/>
    <path d="M13.2 7A1.8 1.8 0 0 1 15 5.2H49A1.8 1.8 0 0 1 50.8 7V9H13.2Z" fill="${stripe}"/>
    <path d="M13.2 55H50.8V57A1.8 1.8 0 0 1 49 58.8H15A1.8 1.8 0 0 1 13.2 57Z" fill="${stripe}"/>
    <path d="${crimp}" fill="none" stroke="${O}" stroke-width="1.1" stroke-linejoin="round" opacity=".35"/>
    <path d="M28 13H36V17C36 19 38 20 41 20H43A3 3 0 0 1 46 23V50A3 3 0 0 1 43 53H21A3 3 0 0 1 18 50V23A3 3 0 0 1 21 20H23C26 20 28 19 28 17Z" fill="${dressing}" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/>
    ${flecks ? `<g fill="${flecks}"><circle cx="23" cy="45" r="1.1"/><circle cx="29" cy="49" r="1.1"/><circle cx="36" cy="46" r="1.1"/><circle cx="41" cy="49.5" r="1.1"/><circle cx="32" cy="16.5" r=".9"/><circle cx="40" cy="23" r="1"/><circle cx="22" cy="24" r="1"/></g>` : ''}
    <rect x="21.5" y="25.5" width="21" height="15" rx="1.5" fill="#fff"/>
    <path d="M25 29.5C26.2 28 27.4 28 28.2 29.5S30.2 31 31.4 29.5 33.8 28 35 29.5" fill="none" stroke="#D7263D" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="25" y="33" width="14" height="1.8" rx=".9" fill="#8a8079"/>
    <rect x="27" y="36.5" width="10" height="1.6" rx=".8" fill="#b5aca4"/>
    <rect x="12" y="4" width="40" height="56" rx="3" fill="none" ${line}/>`;
}

/** A tall, narrow packet, crimped at both ends: most of the condiments. */
function tallPacket(body: string, inner: string) {
  const crimp = (y: number) => {
    let d = `M21 ${y}`;
    for (let x = 21; x < 43; x += 3.5) d += `L${x + 1.75} ${y + 1.8}L${x + 3.5} ${y}`;
    return d;
  };
  return `
    <rect x="19" y="5" width="26" height="54" rx="3" fill="${body}" ${line}/>
    ${inner}
    <path d="${crimp(8)}" fill="none" stroke="${O}" stroke-width="1.2" stroke-linejoin="round" opacity=".45"/>
    <path d="${crimp(54.2)}" fill="none" stroke="${O}" stroke-width="1.2" stroke-linejoin="round" opacity=".45"/>
    <rect x="19" y="5" width="26" height="54" rx="3" fill="none" ${line}/>`;
}

/** The jelly packets: gingham top, white middle with the fruit, green foot. */
function jellyPacket(fruit: string) {
  let check = '';
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 7; c++)
      if ((r + c) % 2 === 0) check += `<rect x="${19 + c * 3.72}" y="${6.2 + r * 3.4}" width="3.72" height="3.4" fill="#2F7D3B"/>`;
  return tallPacket(
    '#fff',
    `<rect x="19.2" y="6.2" width="25.6" height="10.2" fill="#BFE0A5"/>${check}
    <rect x="23" y="19.5" width="18" height="2.4" rx="1.2" fill="#C8202F"/>
    ${at(32, 33, 1.05, fruit)}
    <rect x="19.2" y="44" width="25.6" height="13.8" fill="#C6E04A"/>
    ${print(23, 41, 47.5, 2, '#5b6b1c')}`,
  );
}

/** Salt and pepper: flat white paper packets with a six-dot sprinkle. */
function paperPacket(ink: string, dots: string) {
  return `
    <rect x="6" y="13" width="52" height="38" rx="3" fill="#fff" ${line}/>
    <g fill="${dots}">
      <circle cx="32" cy="22" r="1.5"/><circle cx="28.5" cy="26" r="1.5"/><circle cx="35.5" cy="26" r="1.5"/>
      <circle cx="25" cy="30" r="1.5"/><circle cx="32" cy="30" r="1.5"/><circle cx="39" cy="30" r="1.5"/>
    </g>
    <rect x="20" y="36" width="24" height="2.2" rx="1.1" fill="${ink}" opacity=".7"/>
    <rect x="17" y="41" width="30" height="3.4" rx="1.7" fill="${ink}"/>`;
}

/** Sugar and Splenda: a small flat packet, crimped at the ends. */
function sweetenerPacket(body: string, ends?: string) {
  const crimp = (x: number) => {
    let d = `M${x} 19`;
    for (let y = 19; y < 45; y += 4) d += `L${x + (x < 32 ? 2.2 : -2.2)} ${y + 2}L${x} ${y + 4}`;
    return d;
  };
  return `
    <rect x="5" y="16" width="54" height="32" rx="4" fill="${body}" ${line}/>
    ${ends ? `<path d="M6.2 19A2.8 2.8 0 0 1 9 17.2H15V46.8H9A2.8 2.8 0 0 1 6.2 44Z" fill="${ends}"/><path d="M49 17.2H55A2.8 2.8 0 0 1 57.8 20V44A2.8 2.8 0 0 1 55 46.8H49Z" fill="${ends}"/>` : ''}
    <path d="${crimp(8.5)}" fill="none" stroke="${O}" stroke-width="1.3" stroke-linejoin="round" opacity="${ends ? 0.4 : 0.5}"/>
    <path d="${crimp(55.5)}" fill="none" stroke="${O}" stroke-width="1.3" stroke-linejoin="round" opacity="${ends ? 0.4 : 0.5}"/>
    <rect x="5" y="16" width="54" height="32" rx="4" fill="none" ${line}/>
    ${at(32, 32, 1.15, sparkle)}`;
}

/** A coffee creamer cup: small and tall, with a peel lid. */
function creamerCup(colour: string, emblem: string) {
  return `
    <path d="M15 24L19.5 51.5A12.5 3.8 0 0 0 44.5 51.5L49 24Z" fill="#fff" ${line}/>
    <path d="M17.4 34H46.6L45 49H19Z" fill="${colour}" opacity=".9"/>
    <ellipse cx="32" cy="24" rx="17" ry="5.5" fill="${colour}" ${line}/>
    <ellipse cx="32" cy="24" rx="10.5" ry="3.2" fill="#fff" opacity=".35"/>
    ${at(32, 41.5, 0.8, emblem)}`;
}

/** A black plastic utensil in its clear wrapper, on a slant. */
const BLACK = '#232021';
const wrapped = (utensil: string) => `
  <g transform="rotate(35 32 32)">
    <rect x="22" y="2" width="20" height="60" rx="4" fill="#EEF3F6" stroke="#9AA7B0" stroke-width="1.6"/>
    <path d="M24 6V58" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>
    ${utensil}
  </g>`;

// --- Every item -----------------------------------------------------------

export const ICONS: Record<string, string> = {
  // Sauces: lid colours from the bin labels.
  'cfa-sauce': sauceCup({ lid: '#fff', ink: '#D9456B', tab: '#E51636', sauce: '#E9A945' }),
  ranch: sauceCup({ lid: '#4BA3E3', sauce: '#F5F2EA' }),
  bbq: sauceCup({ lid: '#D7263D', sauce: '#5A1E1A' }),
  polynesian: sauceCup({ lid: '#A23B97', sauce: '#D9542C' }),
  sriracha: sauceCup({ lid: '#3E9E5A', sauce: '#D9381E' }),
  'honey-mustard': sauceCup({ lid: '#F3B526', sauce: '#F2D266' }),
  buffalo: sauceCup({ lid: '#E4472B', sauce: '#EE8A3C' }),
  syrup: sauceCup({ lid: '#7A4A22', sauce: '#B0661C' }),

  // Dressings: stripe and dressing colours from the fridge bin labels.
  'avocado-lime-ranch': dressingPacket({ stripe: '#1F7A72', dressing: '#CBCD7E', flecks: '#6E8A3A' }),
  'garden-herb-ranch': dressingPacket({ stripe: '#4BA3E3', dressing: '#F1EEE3', flecks: '#6E9E4A' }),
  'ff-honey-mustard': dressingPacket({ stripe: '#F2CB3A', dressing: '#E4B533' }),
  'light-balsamic': dressingPacket({ stripe: '#A03E9A', dressing: '#4A1F1E' }),
  'light-italian': dressingPacket({ stripe: '#2F55A4', dressing: '#D4A52E', flecks: '#7a6a1e' }),
  'zesty-apple-cider': dressingPacket({ stripe: '#2E9E5E', dressing: '#C27A28' }),
  'creamy-salsa': dressingPacket({ stripe: '#D7263D', dressing: '#E6B985' }),

  // Condiments.
  ketchup: `
    <path d="M26 5H38V11H26Z" fill="#F2EFEA" ${line}/>
    <path d="M27 11H37V15C37 17 44 20 44 26V55A4 4 0 0 1 40 59H24A4 4 0 0 1 20 55V26C20 20 27 17 27 15Z" fill="#C8202F" ${line}/>
    <path d="M27.5 14H36.5V17.5H27.5Z" fill="#fff"/>
    <path d="M24 30H40L38.5 43C36 45.5 28 45.5 25.5 43Z" fill="#fff" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/>
    <rect x="27" y="33" width="10" height="2.2" rx="1.1" fill="#C8202F"/>
    <rect x="28.5" y="37.5" width="7" height="1.6" rx=".8" fill="#7b8a3b"/>
    <path d="M23.5 28 23.5 52" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35"/>`,
  mayo: tallPacket(
    '#1F3A6E',
    `${print(24, 40, 14, 3, '#fff')}
    <path d="M32 31C35.5 31 37.5 36 37.5 39.5A5.5 5.5 0 0 1 26.5 39.5C26.5 36 28.5 31 32 31Z" fill="none" stroke="#fff" stroke-width="2"/>
    ${print(25, 39, 47, 1, '#fff')}`,
  ),
  mustard: tallPacket(
    '#F7D117',
    `<path d="M21 13H43L41 21H23Z" fill="#D7262E" stroke="${O}" stroke-width="1.3" stroke-linejoin="round"/>
    <rect x="26" y="15.6" width="12" height="2.2" rx="1.1" fill="#fff"/>
    <path d="M24 30C28 26 30 34 34 30S40 28 40 28" fill="none" stroke="#C99A0A" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M23 42H41V50H23Z" fill="#3E7D33"/>`,
  ),
  'grape-jelly': jellyPacket(grapes),
  'strawberry-jelly': jellyPacket(strawberry),
  honey: tallPacket('#F1C232', `${print(24, 40, 14, 3, '#fff')}${at(32, 40, 0.9, drop('#fff'))}`),
  // The hot sauce packet, with its cowboy in silhouette.
  'texas-pete': tallPacket(
    '#E4782A',
    `<rect x="21" y="11" width="22" height="3.4" rx="1.7" fill="#3A1C10"/>
    <g fill="#3A1C10">
      <path d="M24 21.5C26 21.5 27.5 20.5 28 18L29 15.5H35L36 18C36.5 20.5 38 21.5 40 21.5C38.5 23 25.5 23 24 21.5Z"/>
      <circle cx="32" cy="25.5" r="3.4"/>
      <path d="M27 30H37L35.5 33H28.5Z"/>
      <path d="M26 33H38L39 46H35.5L34.5 38L33.5 50H30.5L29.5 38L28.5 46H25Z"/>
    </g>
    ${print(24, 40, 51, 1, '#3A1C10')}`,
  ),
  // Jalapeño Salsa.
  salsa: `
    <rect x="7" y="9" width="50" height="46" rx="3" fill="#A33A2A" ${line}/>
    <rect x="13" y="15" width="38" height="34" rx="1.5" fill="#fff"/>
    <path d="M18 20.5C19.5 18.5 21 18.5 22 20.5S24.5 22.5 26 20.5" fill="none" stroke="#A33A2A" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="18" y="25" width="20" height="2.6" rx="1.3" fill="#A33A2A"/>
    ${at(40, 38, 0.95, chili('#3F8F3A'))}
    <rect x="7" y="9" width="50" height="46" rx="3" fill="none" ${line}/>`,
  'honey-roasted-bbq': tallPacket(
    '#FBF4E2',
    `<path d="M23 13C24.5 11 26 11 27 13S29.5 15 31 13" fill="none" stroke="#8A4B1C" stroke-width="1.6" stroke-linecap="round"/>
    ${print(23, 41, 18, 3, '#8A4B1C')}
    <path d="M19.2 33H44.8V57.8H19.2Z" fill="#D9982E"/>
    <path d="M19.2 33C27 36 37 30 44.8 33" fill="#F2C35B"/>
    ${at(32, 44, 0.85, drop('#FBE7A1'))}`,
  ),
  salt: paperPacket('#D9456B', '#E58AA0'),
  pepper: paperPacket('#3B3330', '#8C8079'),

  // Coffee condiments.
  'half-and-half': creamerCup('#D7263D', drop('#fff')),
  'french-vanilla': creamerCup('#3D6FB6', flower),
  sugar: sweetenerPacket('#fff', '#E7DFD3'),
  splenda: sweetenerPacket('#F6D53B'),

  // Utensils: black plastic, as on the Spoon bin's label.
  forks: wrapped(`
    <path d="M28.5 7V17C28.5 20 30 21.5 30.5 23L29.5 55A2.5 2.5 0 0 0 34.5 55L33.5 23C34 21.5 35.5 20 35.5 17V7" fill="${BLACK}" stroke="${BLACK}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M30.8 7V15.5M33.2 7V15.5" stroke="#EEF3F6" stroke-width="1.5" stroke-linecap="round"/>`),
  knives: wrapped(`
    <path d="M30 7C34.5 10 35.5 18 35 30H30Z" fill="${BLACK}" stroke="${BLACK}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M30 30H34.5L34 55A2.2 2.2 0 0 1 29.6 55L30 30Z" fill="${BLACK}" stroke="${BLACK}" stroke-width="1.2" stroke-linejoin="round"/>`),
  spoons: wrapped(`
    <ellipse cx="32" cy="15" rx="6.5" ry="9" fill="${BLACK}"/>
    <ellipse cx="30.5" cy="13" rx="2" ry="4" fill="#fff" opacity=".35"/>
    <path d="M30.5 23.6 29.5 55A2.5 2.5 0 0 0 34.5 55L33.5 23.6Z" fill="${BLACK}"/>`),
};
