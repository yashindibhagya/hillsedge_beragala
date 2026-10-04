/**
 * Page copy that is repeated or list-shaped. Keeping it here means the
 * components stay layout-only and nothing is written out twice.
 */

export const pillars = [
  { icon: 'wild', title: 'Wild', text: 'Mountains, forest and fresh hill-country air.' },
  {
    icon: 'rustic',
    title: 'Rustic',
    text: 'Timber, stone and thatch — natural textures throughout.',
  },
  { icon: 'premium', title: 'Premium', text: 'Quality ingredients, presentation and hospitality.' },
  {
    icon: 'authentic',
    title: 'Authentic',
    text: 'Genuine Sri Lankan flavour, in a real hill-country setting.',
  },
  {
    icon: 'experiential',
    title: 'Experiential',
    text: 'To see, smell, taste and remember — not just to eat.',
  },
];

export const homeStats = [
  { value: '9', label: 'Cuisines served' },
  { value: '360°', label: 'Valley views' },
  { value: '12h', label: 'Low & slow smoking' },
  { value: 'Daily', label: 'Lunch & dinner' },
];

export const homeCuisineCards = [
  {
    tag: 'Signature',
    title: 'Smokehouse & BBQ',
    text: 'Slow-smoked meats, grilled dishes and charcoal cooking.',
    highlight: true,
  },
  {
    tag: 'Heritage',
    title: 'Sri Lankan',
    text: 'Authentic rice & curry, seafood, meats and sambals.',
  },
  {
    tag: 'And seven more',
    title: 'Italian, Indian, Chinese…',
    text: 'Fusion, continental grills, starters, soups and desserts.',
  },
];

export const homeGalleryKeys = ['sundowners', 'underTheStars', 'waterfallRoad'];

export const homeFacts = [
  { key: 'Location', value: 'Beragala, Badulla District, Sri Lanka' },
  { key: 'Coordinates', value: '6.7631° N, 80.9054° E' },
  { key: 'Open', value: 'Lunch & dinner, daily' },
  { key: 'Reservations', value: 'Recommended for sunset seating' },
];

/* ---------------------------------------------------------------- About */

export const settingPoints = [
  { key: '01', text: 'Timber, stone and thatch construction, in the hill-country tradition' },
  { key: '02', text: 'Open-air and open-sided dining, level with the treeline' },
  { key: '03', text: 'Terraced gardens and pathways lit from dusk onwards' },
];

export const hierarchyTiers = [
  {
    level: 'Level 01',
    title: 'Hillsedge Beragala',
    text: 'The destination — the mountain setting, the architecture, the light over the valley, the whole reason for the drive.',
    feature: true,
  },
  {
    level: 'Level 02',
    title: 'Hillsedge Smoke Lovers',
    text: 'The signature experience within it — hardwood smoke, charcoal grills, and the flavour that carries the name.',
    link: { to: '/smokehouse', label: 'See how we cook' },
  },
  {
    level: 'Level 03',
    title: 'The full range of cuisines',
    text: 'Sri Lankan heritage and fusion, smokehouse and BBQ, continental grills, Italian, Indian, Chinese, appetizers and desserts.',
    link: { to: '/cuisine', label: 'Browse the menu' },
  },
];

export const greetings = [
  'Welcome',
  '欢迎',
  'Bienvenue',
  'Willkommen',
  'Добро пожаловать',
  'Benvenuti',
  'स्वागत',
  'أهلاً',
  'Velkommen',
  'Selamat datang',
  'Vítejte',
  'ආයුබෝවන්',
];

/* ----------------------------------------------------------- Smokehouse */

export const smokehouseSteps = [
  {
    number: '01',
    title: 'The wood',
    text: 'Hardwood is chosen for a clean, sweet smoke rather than a heavy one. The wrong wood turns bitter over a long cook, so the selection matters as much as the cut it will flavour.',
  },
  {
    number: '02',
    title: 'The wait',
    text: "Low heat, held steady for hours, until the cut gives way on its own rather than being forced. This is the part that can't be shortened — and the part most kitchens skip.",
  },
  {
    number: '03',
    title: 'The grill',
    text: 'Charcoal finishes the job to order: colour, crust and char on the outside, with the smoke already deep inside. Seafood and leaner cuts go straight to the grill instead.',
  },
  {
    number: '04',
    title: 'The table',
    text: 'Plated with rubs, sauces and sides made in-house that morning, and carried out to open-air tables with the valley in front of you.',
  },
];

export const builtByHandPoints = [
  { key: '01', text: 'Offset chambers, hardwood-fed, hand-built on site' },
  { key: '02', text: 'Charcoal grills alongside, for finishing and à la carte' },
  { key: '03', text: 'Open to view — part of the room, not behind a wall' },
];

export const firstVisitPoints = [
  { key: '—', text: 'Slow-smoked meats, sliced to order' },
  { key: '—', text: 'Charcoal-grilled cuts and seafood' },
  { key: '—', text: 'Smoked starters and house-made sauces' },
  { key: '—', text: 'Sharing platters built for a full table' },
];

/* -------------------------------------------------------------- Cuisine */

export const cuisines = [
  {
    number: '01',
    title: 'Smokehouse & BBQ',
    text: 'Slow-smoked meats sliced to order, charcoal-grilled cuts and seafood, and sharing platters built for a full table. The section to order from on a first visit.',
    tags: ['Signature', 'Sharing', 'Charcoal'],
  },
  {
    number: '02',
    title: 'Sri Lankan',
    text: 'Authentic rice & curry, seafood, meats, sambals and traditional hill-country specialties.',
    tags: ['Heritage', 'Spice', 'Vegetarian options'],
  },
  {
    number: '03',
    title: 'Sri Lankan Fusion',
    text: 'Contemporary plates built on local ingredients and flavours, presented for a modern table.',
    tags: ['Modern', 'Local produce'],
  },
  {
    number: '04',
    title: 'Continental',
    text: 'Steaks, grilled meats, seafood, burgers and sandwiches — familiar comfort after a long drive.',
    tags: ['Grill', 'Familiar'],
  },
  {
    number: '05',
    title: 'Italian',
    text: 'Pizza, pasta, lasagne, gnocchi and other Italian favourites, made to order.',
    tags: ['Comfort', 'Family-friendly'],
  },
  {
    number: '06',
    title: 'Indian',
    text: 'Tandoori, biriyani, curries and freshly baked naan from the clay oven.',
    tags: ['Tandoor', 'Spice'],
  },
  {
    number: '07',
    title: 'Chinese',
    text: 'Fried rice, noodles, satay, seafood and meat dishes from the wok.',
    tags: ['Wok', 'Quick'],
  },
  {
    number: '08',
    title: 'Appetizers & Soups',
    text: 'Smoked starters, seafood appetizers and both traditional and international soups.',
    tags: ['Starters', 'Warming'],
  },
  {
    number: '09',
    title: 'Desserts',
    text: 'Watalappan, tiramisu, panna cotta, gelato, cakes and more to finish the evening.',
    tags: ['Sweet', 'Sri Lankan classics'],
  },
];

export const sundownerPoints = [
  { key: '—', text: 'Cocktails, mocktails, beer and wine' },
  { key: '—', text: 'Fresh juices and Ceylon tea from the surrounding hills' },
  { key: '—', text: 'Group and set menus available on request' },
];

/* -------------------------------------------------------------- Gallery */

export const galleryFilters = [
  { id: 'all', label: 'All' },
  { id: 'place', label: 'The Place' },
  { id: 'smoke', label: 'The Smokehouse' },
  { id: 'table', label: 'The Table' },
  { id: 'views', label: 'Views & Nature' },
];

export const galleryOrder = [
  'pathDusk',
  'smoker',
  'sunsetValley',
  'diningHall',
  'goldenHourTable',
  'underTheStars',
  'sundowners',
  'waterfallRoad',
  'timberThatch',
  'deckDinner',
  'litPathway',
  'afterDark',
  'signboard',
];

/* ---------------------------------------------------------------- Visit */

export const visitFacts = [
  { key: 'Address', value: 'Bathgoda, Kalupahana Waththa,\nHaldummulla 90180' },
  { key: 'Plus code', value: 'QW74+64 Beragala' },
  { key: 'Open', value: 'Lunch & dinner, daily' },
  { key: 'Parking', value: 'On site, including coaches' },
];

export const routes = [
  {
    from: 'From the hill country',
    title: 'Haputale & Bandarawela',
    text: 'Down the A4 towards Beragala. The most direct approach, and the one most guesthouses will point you along.',
    duration: 'Approx. 30 min from Haputale',
  },
  {
    from: 'From the tourist circuit',
    title: 'Ella & Nuwara Eliya',
    text: 'An easy detour for anyone doing the train-and-tea-country route, and a good lunch or sunset stop on a driving day.',
    duration: 'Approx. 1 hr from Ella',
  },
  {
    from: 'From the coast & city',
    title: 'Colombo & the south',
    text: 'Via Ratnapura and Balangoda on the A4, climbing through Kalupahana. Break the drive here before the last stretch up.',
    duration: 'Approx. 5 hrs from Colombo',
  },
];

/**
 * Landmarks within reach, nearest first.
 *
 * This is the page's main organic asset: almost nobody searches for a
 * smokehouse in Beragala, because they have never heard of one. They search
 * for the waterfall, then for somewhere to eat near it. Naming the landmarks
 * and giving an honest distance is what makes those searches find us, and it
 * is genuinely useful to somebody planning a day.
 *
 * DISTANCES ARE APPROXIMATE and were derived from mapping data, not driven.
 * Hill-country roads are slow and the times assume that. Anyone who knows the
 * roads should correct these — a wrong number here is worse than no number.
 */
export const nearbyLandmarks = [
  {
    name: 'Adisham Bungalow',
    also: "St Benedict's Monastery",
    distance: 'Approx. 10 km',
    time: 'About 20 min',
    text: "Haputale's main heritage stop — an English country house and monastery garden above the tea.",
  },
  {
    name: 'Haputale town',
    distance: 'Approx. 10 km',
    time: 'About 30 min',
    text: 'The nearest town, and the railway stop for anyone arriving on the hill-country line.',
  },
  {
    name: 'Thangamale Bird Sanctuary',
    distance: 'Approx. 12 km',
    time: 'About 25 min',
    text: 'Montane forest and birding trails on the ridge walk out of Haputale.',
  },
  {
    name: 'Bambarakanda Falls',
    also: "Sri Lanka's tallest waterfall",
    distance: 'Approx. 18 km',
    time: 'About 40 min',
    text: 'At 263 m the highest fall in the country, reached off the Beragala road through Kalupahana.',
  },
  {
    name: 'Diyaluma Falls',
    also: 'Second-highest in Sri Lanka',
    distance: 'Approx. 21 km',
    time: 'About 40 min',
    text: 'The natural infinity pools at the top are the draw. Come down hungry — we are the nearest proper kitchen.',
  },
  {
    name: 'Dambatenne Tea Factory',
    distance: 'Approx. 22 km',
    time: 'About 45 min',
    text: "Lipton's own factory, still working, and the turn-off for the climb to the seat above it.",
  },
  {
    name: "Lipton's Seat",
    distance: 'Approx. 28 km',
    time: 'About 1 hr 15',
    text: 'The sunrise viewpoint over the Dambatenne estates. Most people are back down and looking for breakfast by nine.',
  },
  {
    name: 'Ella',
    also: "Nine Arches Bridge, Little Adam's Peak, Ravana Falls",
    distance: 'Approx. 30 km',
    time: 'About 1 hr',
    text: 'We are not in Ella — we are the stop between Ella and Haputale, which is the better lunch either way.',
  },
  {
    name: "Horton Plains & World's End",
    distance: 'Approx. 35 km',
    time: 'About 1 hr 30',
    text: 'Reachable from this side via Ohiya, not only from Nuwara Eliya. Go at dawn before the cloud closes in.',
  },
  {
    name: 'Pekoe Trail, Stage 13',
    also: 'Haputale to St Catherine',
    distance: 'Trailhead approx. 10 km',
    time: 'About 30 min',
    text: 'The long-distance tea-country trail passes through Haputale. Walkers finish the stage hungry.',
  },
];

export const reservePoints = [
  { key: '—', text: 'Groups, tour parties and coach stops welcome' },
  { key: '—', text: 'Set and group menus available on request' },
  { key: '—', text: 'Tell us about allergies or dietary needs in advance' },
];

export const faqs = [
  {
    q: 'Do I need to book?',
    a: 'Not always — walk-ins are welcome. But the sunset sitting, weekends and any group of more than four are worth booking ahead, especially in season.',
  },
  {
    q: 'Is there accommodation?',
    a: 'Hillsedge is a dining destination at present. Chalets are being prepared and will be announced here once they open.',
  },
  {
    q: 'Can you cater for a tour group or coach?',
    a: "Yes. There's parking on site for coaches, and set or group menus can be arranged in advance around the smokehouse. Message us with numbers and timing.",
  },
  {
    q: 'Are there vegetarian and vegan options?',
    a: 'Yes — across the Sri Lankan, Indian, Italian and Chinese sections in particular. Tell us about any allergies or dietary needs when you book and the kitchen will plan around them.',
  },
  {
    q: 'Is it suitable for children and older guests?',
    a: 'Families are very welcome, and the menu range is wide enough to keep everyone happy. Note that the property is built on a hillside with steps and sloped pathways, so let us know if anyone needs the easiest access and we’ll seat you accordingly.',
  },
  {
    q: "What's the best time to arrive?",
    a: 'Late afternoon. You get the valley in daylight, the sunset over the hills, and then the lit pathways and lanterns after dark — three different versions of the place in one visit.',
  },
];

export const guestOptions = ['1–2', '3–4', '5–8', '9–15', '16+ (group)'];
export const sittingOptions = ['Lunch', 'Afternoon', 'Sunset', 'Dinner'];
