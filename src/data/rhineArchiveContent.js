// Single source of truth for the independent video-reference clone.
// Replacing a portrait, scene, label, or section only requires editing this file.

export const RHINE_CLONE = {
  colors: {
    paper: '#dedfd6',
    ink: '#171d1a',
    accent: '#718500',
    pale: '#f1f2e9',
    cyan: '#61b9b9',
  },
  brand: {
    title: 'THE PLAN OF THE MONTH',
    lineOne: '',
    lineTwo: '',
    footer: 'POWERED BY RHINE LAB',
  },
  sections: [
    { id: 'home', label: 'HOMEPAGE' },
    { id: 'headquarters', label: 'HEADQUARTERS' },
    { id: 'members', label: 'MEMBER' },
    { id: 'departments', label: 'DEPARTMENT' },
    { id: 'research', label: 'RESEARCH' },
  ],
  home: {
    eyebrow: 'WELCOME TO',
    title: 'STEAL THE ',
    accent: 'MOON',
    copy: 'Rhine Lab is a Columbian company dedicated to life science, chemical manufacturing, and biological applications. It is a key technology group supported by Columbia, with a wide range of projects and many publicly announced achievements that have become the focus of attention in the industry.',
    partner: 'VEIKO',
  },
  scenes: {
    headquarters: [
      { visual: 'weave', poster: 'assets/rhine-clone/headquarters/posters/01.webp', code: 'A-01', label: 'CENTRAL BIOLOGICAL CORE' },
      { visual: 'fractal-tunnel', poster: 'assets/rhine-clone/headquarters/posters/02.webp', code: 'A-02', label: 'REACTOR OBSERVATION DECK' },
    { visual: 'chromatic-tunnel', poster: 'assets/rhine-clone/headquarters/posters/03.webp', code: 'A-03', label: 'GENE ANALYSIS GALLERY' },
    ],
    research: 'rhine-reference/black-hole-spectrum.png',
  },
}

export const RHINE_MEMBERS = [
  { code: 'DEF', section: 'DEFENSE SECTION', name: 'SARIA', role: 'DIRECTOR', image: 'assets/rhine-clone/members/saria.webp', scale: 1.08, x: 0, y: 1 },
  { code: 'ECO', section: 'ECOLOGICAL SECTION', name: 'MUELSYSE', role: 'DIRECTOR', image: 'assets/rhine-clone/members/muelsyse.webp', scale: 1.68, x: 0, y: 5 },
  { code: 'CMPT\nCTRL', section: 'COMPONENTS CONTROL SECTION', name: 'KRISTEN WRIGHT', role: 'CONTROL', image: 'assets/rhine-clone/members/kristen-wright.webp', scale: 1.56, x: 0, y: 4 },
  { code: 'HRI', section: 'HUMAN RESOURCES INVESTIGATION SECTION', name: 'JARA. B. WILSON JR.', role: 'DIRECTOR', image: 'assets/rhine-clone/members/jara-wilson.webp', scale: 1.56, x: -1, y: 3 },
  { code: 'BSN', section: 'BUSINESS SECTION', name: 'JASTIN FITZROY JR.', role: 'DIRECTOR', image: 'assets/rhine-clone/members/justin-fitzroy-jr.webp', scale: 1.56, x: 0, y: 4 },
  { code: 'ORIG', section: 'ORIGINIUM ART SECTION', name: 'DOROTHY FRANKS', role: 'DIRECTOR', image: 'assets/rhine-clone/members/dorothy.webp', scale: 1.62, x: 1, y: 4 },
  { code: 'NRG', section: 'ENERGY SECTION', name: 'FERDINAND CLOONEY', role: 'DIRECTOR', image: 'assets/rhine-clone/members/ferdinand-clooney.webp', scale: 1.56, x: 0, y: 4 },
  { code: 'STRU', section: 'STRUCTURAL SECTION', name: 'AHRENS PARVIS', role: 'DIRECTOR', image: 'assets/rhine-clone/members/ahrens-parvis.webp', scale: 1.56, x: 0, y: 4 },
  { code: 'ENG', section: 'ENGINEERING SECTION', name: 'NASTI LUNOREY', role: 'DIRECTOR', image: 'assets/rhine-clone/members/nasti.webp', scale: 1.08, x: 0, y: 1 },
]

export const RHINE_DEPARTMENTS = [
  { code: 'CMPT\nCTRL', label: 'COMPONENTS CONTROL SECTION', title: '总辖构件科', preview: 'assets/rhine-clone/scenes/control-office.png' },
  { code: 'ORIG', label: 'ORIGINIUM ART SECTION', title: '源石技艺应用科', preview: 'assets/rhine-clone/scenes/laboratory.png' },
  { code: 'SCIEN', label: 'SCIENTIFIC INVESTIGATION SECTION', title: '科学考察科', preview: 'assets/rhine-clone/scenes/observation-post.png' },
  { code: 'NRG', label: 'ENERGY SECTION', title: '能量科', preview: 'assets/rhine-clone/scenes/laboratory.png' },
  { code: 'HRI', label: 'HUMAN RESOURCES INVESTIGATION SECTION', title: '人力资源考察科', preview: 'assets/rhine-clone/scenes/meeting-room.png' },
  { code: 'STRU', label: 'STRUCTURAL SECTION', title: '结构科', preview: 'assets/rhine-clone/scenes/corridor.png' },
  { code: 'ECO', label: 'ECOLOGICAL SECTION', title: '生态科', preview: 'assets/rhine-clone/scenes/hq-background.png' },
  { code: 'BSN', label: 'BUSINESS SECTION', title: '商务科', preview: 'assets/rhine-clone/scenes/meeting-room.png' },
  { code: 'DEF', label: 'DEFENSE SECTION', title: '防卫科', preview: 'assets/rhine-clone/scenes/corridor-b.png' },
  { code: 'ENG', label: 'ENGINEERING SECTION', title: '工程科', preview: 'assets/rhine-clone/scenes/control-office.png' },
]

export const RHINE_RESEARCH = {
  title: '星引力',
  english: 'STELLAR GRAVITY',
  progress: 'T−00:00:00',
  copy: ['我们的事业将触及星海。', '探索未知，直至抵达天穹之外。'],
  button: 'CONTINUE',
  readout: ['R / 01 — 037', 'ORBITAL DATA STREAM', 'RESEARCH TERMINAL ONLINE'],
}

export const rhineAsset = (base, path) => `${base}${path}`
