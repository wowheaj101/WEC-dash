// SVG track outlines — viewBox "0 0 480 380"
// Approximate circuit silhouettes with corner markers and overtake zones.

export interface CircuitCorner {
  /** Corner number (FIA numbering) */
  n:     number
  /** Label position (viewBox units) */
  x:     number
  y:     number
  /** Optional short name (Eau Rouge, Tamburello, ...) */
  name?: string
}

/** Overtake / DRS zone: [x1, y1, x2, y2] line segment */
export type OvertakeZone = [number, number, number, number]

export interface CircuitSVG {
  path:    string
  pitLane: string
  /** [x1, y1, x2, y2] */
  sf:      [number, number, number, number]
  /** Sector divider lines [[x1,y1,x2,y2], ...] */
  sectors: Array<[number, number, number, number]>
  /** Approximate car spawn point for each sector [s1, s2, s3] */
  sectorPoints: [[number, number], [number, number], [number, number]]
  /** Corner numbers/positions (rendered as text overlay) */
  corners?: CircuitCorner[]
  /** Overtake / slipstream / DRS-like zones */
  drs?: OvertakeZone[]
  /** Pit entry coordinate */
  pitIn?:  [number, number]
  /** Pit exit coordinate */
  pitOut?: [number, number]
}

// ── Circuit de Spa-Francorchamps ──────────────────────────────────────
const SPA: CircuitSVG = {
  path: `M 370,215 L 280,215
    Q 245,215 228,233 Q 211,251 205,270
    Q 199,289 215,296 Q 231,303 248,291
    L 260,276 L 258,261 L 248,246
    Q 232,218 210,186 L 190,152 L 170,112 L 152,79
    Q 138,61 120,67 Q 102,73 110,93
    Q 118,113 138,110 L 154,106 L 168,100 L 188,95
    Q 210,91 235,105 Q 260,119 270,147
    Q 280,175 268,197 Q 256,219 264,243
    Q 272,267 295,272 L 318,272
    Q 340,270 355,254 Q 370,238 370,215 Z`,
  pitLane: `M 280,211 L 370,211`,
  sf:      [366, 207, 374, 223],
  sectors: [
    [148, 75, 157, 83],
    [264, 239, 272, 247],
  ],
  sectorPoints: [[228, 265], [158, 96], [318, 268]],
  corners: [
    { n: 1,  x: 286, y: 223, name: 'La Source' },
    { n: 2,  x: 215, y: 258, name: 'Eau Rouge' },
    { n: 3,  x: 222, y: 240, name: 'Raidillon' },
    { n: 5,  x: 205, y: 180, name: 'Les Combes' },
    { n: 8,  x: 170, y: 130, name: 'Pouhon' },
    { n: 13, x: 135, y: 100, name: 'Blanchimont' },
    { n: 18, x: 340, y: 260, name: 'Bus Stop' },
  ],
  drs: [
    [224, 256, 196, 158], // Kemmel straight
    [268, 215, 286, 225], // S/F straight
  ],
  pitIn:  [355, 250],
  pitOut: [286, 215],
}

// ── Lusail International Circuit ─────────────────────────────────────
const LUSAIL: CircuitSVG = {
  path: `M 400,308 L 452,308 Q 466,308 466,285
    L 466,248 Q 466,224 444,216
    L 402,207 Q 374,200 362,176
    L 346,140 Q 330,104 348,80
    Q 366,56 396,54 Q 426,52 438,78
    Q 450,104 430,126 L 406,140
    Q 380,154 373,180 Q 366,206 386,216
    L 422,223 Q 456,230 464,204
    Q 472,178 452,154 Q 432,130 404,124
    Q 376,118 362,94 Q 348,70 360,46
    Q 372,22 402,20 Q 432,18 444,44
    Q 456,70 438,96 L 413,112
    Q 386,128 379,156 L 376,186
    Q 373,215 352,225 L 316,231
    Q 286,237 278,265 L 276,301
    Q 274,330 303,338 L 355,340
    Q 383,340 393,325 L 400,308 Z`,
  pitLane: `M 400,304 L 452,304`,
  sf:      [396, 300, 404, 316],
  sectors: [
    [360, 50, 370, 42],
    [278, 297, 270, 305],
  ],
  sectorPoints: [[435, 155], [310, 170], [340, 330]],
  corners: [
    { n: 1,  x: 455, y: 300 },
    { n: 4,  x: 430, y: 218 },
    { n: 6,  x: 396, y: 200 },
    { n: 10, x: 365, y: 60 },
    { n: 14, x: 330, y: 228 },
    { n: 16, x: 290, y: 335 },
  ],
  drs: [
    [396, 305, 452, 305], // main straight (T16 → T1)
    [378, 175, 422, 220], // back straight approach
  ],
  pitIn:  [395, 320],
  pitOut: [452, 300],
}

// ── Autodromo Enzo e Dino Ferrari (Imola) ────────────────────────────
const IMOLA: CircuitSVG = {
  path: `M 400,195
    L 396,150 L 390,112
    Q 380,88 356,76 Q 332,64 308,76
    Q 284,88 280,112
    Q 278,126 264,130 Q 250,130 242,118
    Q 230,102 242,84 Q 254,66 275,66
    Q 296,66 306,82 Q 310,98 298,114
    Q 284,130 260,132
    Q 236,132 218,148 Q 200,164 208,188
    Q 216,210 240,216 Q 255,220 258,238
    Q 261,256 250,272 Q 240,288 242,306
    Q 244,322 260,328
    Q 278,334 294,322 Q 308,310 300,294
    Q 292,278 276,278 Q 260,280 258,296
    Q 256,312 270,320 Q 286,328 304,320
    Q 324,310 330,292 Q 336,272 355,264
    Q 372,256 384,242 Q 397,228 400,210
    Z`,
  pitLane: `M 396,191 L 440,191`,
  sf:      [396, 187, 404, 203],
  sectors: [
    [270, 68, 278, 60],
    [242, 300, 250, 308],
  ],
  sectorPoints: [[392, 128], [278, 110], [282, 295]],
  corners: [
    { n: 2,  x: 390, y: 98,  name: 'Tamburello' },
    { n: 3,  x: 342, y: 72,  name: 'Villeneuve' },
    { n: 7,  x: 268, y: 124, name: 'Tosa' },
    { n: 9,  x: 208, y: 180, name: 'Piratella' },
    { n: 11, x: 252, y: 228, name: 'Acque Minerali' },
    { n: 14, x: 256, y: 294, name: 'Variante Alta' },
    { n: 17, x: 310, y: 320, name: 'Rivazza' },
  ],
  drs: [
    [400, 195, 390, 112], // main straight
    [262, 132, 218, 148], // Tosa → Piratella
  ],
  pitIn:  [400, 220],
  pitOut: [440, 191],
}

// ── Circuit de la Sarthe (Le Mans) ───────────────────────────────────
const LE_MANS: CircuitSVG = {
  path: `M 415,334 L 415,52
    Q 415,32 396,25 Q 377,18 367,34
    Q 357,50 371,67 Q 385,84 378,102
    Q 371,120 352,122 L 68,122
    Q 42,122 35,148 L 35,282
    Q 35,322 65,334 L 282,334
    Q 310,334 318,316 Q 326,298 311,286
    Q 296,274 280,282 Q 264,290 260,309
    Q 256,328 276,336 L 415,336 L 415,334 Z`,
  pitLane: `M 411,52 L 411,334`,
  sf:      [407, 320, 419, 320],
  sectors: [
    [352, 118, 352, 126],
    [66, 326, 66, 342],
  ],
  sectorPoints: [[415, 185], [35, 215], [198, 334]],
  corners: [
    { n: 1,  x: 385, y: 30,  name: 'Dunlop' },
    { n: 2,  x: 360, y: 115, name: 'Forza' },
    { n: 4,  x: 250, y: 115, name: 'Tertre Rouge' },
    { n: 8,  x: 45,  y: 145, name: 'Mulsanne' },
    { n: 10, x: 50,  y: 320, name: 'Indianapolis' },
    { n: 12, x: 290, y: 328, name: 'Arnage' },
    { n: 15, x: 310, y: 298, name: 'Porsche Curves' },
    { n: 17, x: 400, y: 328, name: 'Ford Chicane' },
  ],
  drs: [
    [415, 122, 415, 52],  // pit straight
    [352, 122, 68, 122],  // Mulsanne straight (the iconic one)
    [35, 150, 35, 280],   // Indianapolis→Arnage link
  ],
  pitIn:  [415, 310],
  pitOut: [411, 60],
}

// ── Autodromo José Carlos Pace (Interlagos) ──────────────────────────
const INTERLAGOS: CircuitSVG = {
  path: `M 276,52 Q 308,38 334,56
    L 348,82 Q 360,108 341,127
    Q 322,146 295,137 L 264,127
    Q 238,117 232,140 L 230,170
    Q 228,198 249,212 L 278,223
    Q 308,233 312,262 L 313,295
    Q 314,328 291,342 Q 268,356 244,344
    Q 220,332 214,306 Q 208,280 227,263
    L 248,252 Q 270,243 288,257
    Q 306,271 300,296 Q 294,321 270,327
    Q 246,333 234,316 Q 222,299 230,280
    Q 238,261 260,255 L 284,254
    Q 310,252 324,232 Q 338,212 328,190
    Q 318,168 294,160 L 263,151
    Q 233,142 221,118 Q 209,94 222,70
    Q 235,46 263,42 L 276,52 Z`,
  pitLane: `M 272,48 L 305,48 Q 318,48 328,60`,
  sf:      [268, 44, 280, 56],
  sectors: [
    [342, 125, 350, 133],
    [212, 302, 204, 310],
  ],
  sectorPoints: [[310, 92], [268, 215], [248, 285]],
  corners: [
    { n: 1,  x: 296, y: 56,  name: 'Senna S' },
    { n: 2,  x: 340, y: 90 },
    { n: 4,  x: 225, y: 135, name: 'Descida do Lago' },
    { n: 7,  x: 250, y: 220, name: 'Ferradura' },
    { n: 10, x: 280, y: 340, name: 'Juncao' },
    { n: 12, x: 230, y: 292, name: 'Mergulho' },
  ],
  drs: [
    [278, 340, 276, 52],  // pit/back straight (Juncao → S/F)
    [340, 125, 312, 260], // Reta Oposta
  ],
  pitIn:  [280, 52],
  pitOut: [320, 56],
}

// ── Fuji Speedway ────────────────────────────────────────────────────
const FUJI: CircuitSVG = {
  path: `M 58,98 L 406,98
    Q 432,98 438,127 L 438,200
    Q 438,242 406,262 L 335,277
    Q 299,285 283,314 Q 267,343 283,369
    Q 299,395 326,392 Q 353,389 362,363
    Q 371,337 354,315 Q 337,293 308,291
    L 282,291 Q 253,291 237,268
    Q 221,245 231,218 L 240,193
    Q 249,168 237,146 Q 225,124 202,120
    L 58,120 Q 36,120 30,109
    Q 24,98 38,90 Q 52,82 60,96 L 58,98 Z`,
  pitLane: `M 402,94 L 58,94`,
  sf:      [400, 90, 408, 106],
  sectors: [
    [437, 195, 443, 195],
    [235, 218, 227, 210],
  ],
  sectorPoints: [[248, 98], [330, 272], [238, 165]],
  corners: [
    { n: 1,  x: 432, y: 140, name: 'TGR' },
    { n: 3,  x: 425, y: 240, name: 'Coca-Cola' },
    { n: 5,  x: 300, y: 285, name: '100R' },
    { n: 7,  x: 340, y: 380, name: 'Hairpin' },
    { n: 11, x: 230, y: 225, name: 'Dunlop' },
    { n: 13, x: 210, y: 132, name: 'Panasonic' },
    { n: 15, x: 40,  y: 100 },
  ],
  drs: [
    [60, 98, 406, 98],  // main straight — 1.5km, the longest on the WEC calendar after Mulsanne
  ],
  pitIn:  [406, 108],
  pitOut: [58, 94],
}

// ── Bahrain International Circuit ────────────────────────────────────
const BAHRAIN: CircuitSVG = {
  path: `M 238,52 L 298,52
    Q 322,52 330,78 L 333,118
    Q 336,148 355,162 Q 374,176 400,172
    Q 426,168 436,146 Q 446,124 434,102
    Q 422,80 398,78 Q 374,76 362,96
    Q 350,116 358,140 Q 366,164 388,174
    Q 410,184 420,208 Q 430,232 420,258
    Q 410,284 386,294 Q 362,304 338,293
    Q 314,282 305,258 Q 296,234 310,212
    Q 324,190 350,190 Q 376,190 389,210
    Q 402,230 394,256 Q 386,282 362,289
    Q 338,296 318,282 Q 298,268 300,244
    Q 302,220 322,210 L 238,210
    Q 212,210 200,234 Q 188,258 200,284
    Q 212,310 238,316 Q 264,322 278,299
    Q 292,276 282,252 Q 272,228 247,222
    L 238,210 Q 214,210 202,188
    Q 190,166 204,142 Q 218,118 244,115
    Q 270,112 281,136 Q 292,160 278,182
    Q 264,204 238,204 L 238,52 Z`,
  pitLane: `M 238,48 L 298,48`,
  sf:      [234, 44, 242, 60],
  sectors: [
    [432, 150, 440, 142],
    [200, 280, 192, 288],
  ],
  sectorPoints: [[342, 100], [355, 215], [220, 200]],
  corners: [
    { n: 1,  x: 325, y: 66 },
    { n: 4,  x: 410, y: 160 },
    { n: 8,  x: 402, y: 285 },
    { n: 10, x: 315, y: 265 },
    { n: 13, x: 198, y: 272 },
    { n: 15, x: 210, y: 135 },
  ],
  drs: [
    [238, 52, 298, 52],   // main straight (T15 → T1)
    [333, 118, 362, 96],  // T3→T4 approach
    [238, 204, 238, 115], // T10→T11 back straight
  ],
  pitIn:  [240, 60],
  pitOut: [298, 48],
}

// ── Export map (keyed by WECRound.circuit) ────────────────────────────
export const CIRCUIT_SVG: Record<string, CircuitSVG> = {
  'Lusail International Circuit':       LUSAIL,
  'Autodromo Enzo e Dino Ferrari':      IMOLA,
  'Circuit de Spa-Francorchamps':       SPA,
  'Circuit de la Sarthe':               LE_MANS,
  'Autodromo José Carlos Pace':         INTERLAGOS,
  'Fuji Speedway':                      FUJI,
  'Bahrain International Circuit':      BAHRAIN,
}

export { SPA }
