import type { Car, RaceInfo, Stats, Message, DriverStat, CarStint } from '@/app/types/race'

export const raceInfo: RaceInfo = {
  name:      '2025 6 Hours of Spa-Francorchamps',
  round:     3,
  elapsed:   '02:14:33',
  total:     '06:00:00',
  remaining: '03:45:27',
  flag:      'GREEN',
  weather:   { air: 18, track: 28, humidity: 62, condition: 'sunny' },
}

export const stats: Stats = {
  leaderLap:     62,
  totalPitstops: 28,
  fastestLap:    { time: '1:57.843', carNum: 2, team: 'Cadillac' },
  safetyCars:    1,
  safetyCarlap:  31,
}

export const cars: Car[] = [
  // ── HYPERCAR ────────────────────────────────────────────────────────
  { pos:1,  clsPos:1, carClass:'HYPERCAR', carNum:2,  carNumStr:'2',  team:'Cadillac Racing',     drivers:'Bamber / Lynn',        tire:'S', laps:62, lastLap:'1:57.843', bestLap:'1:57.843', gap:'LEAD',     interval:'—',      pitstops:2, status:'RUN', isFastestLap:true  },
  { pos:2,  clsPos:2, carClass:'HYPERCAR', carNum:7,  carNumStr:'7',  team:'Toyota Gazoo Racing', drivers:'Conway / Kobayashi',   tire:'M', laps:62, lastLap:'1:58.211', bestLap:'1:57.991', gap:'+00:12.4', interval:'+12.4',  pitstops:2, status:'RUN', isFastestLap:false },
  { pos:3,  clsPos:3, carClass:'HYPERCAR', carNum:6,  carNumStr:'6',  team:'Porsche Penske',      drivers:'Estre / Lotterer',     tire:'H', laps:61, lastLap:'—',        bestLap:'1:58.502', gap:'+01:08.2', interval:'+55.8',  pitstops:3, status:'PIT', isFastestLap:false },
  { pos:4,  clsPos:4, carClass:'HYPERCAR', carNum:8,  carNumStr:'8',  team:'Toyota Gazoo Racing', drivers:'Buemi / Hartley',      tire:'S', laps:61, lastLap:'1:58.901', bestLap:'1:58.210', gap:'+01:44.1', interval:'+35.9',  pitstops:2, status:'RUN', isFastestLap:false },
  // ── LMP2 ────────────────────────────────────────────────────────────
  { pos:5,  clsPos:1, carClass:'LMP2',     carNum:10, carNumStr:'10', team:'United Autosports',   drivers:'Owen / Hanson',        tire:'S', laps:59, lastLap:'2:01.334', bestLap:'2:01.101', gap:'LEAD',     interval:'—',      pitstops:2, status:'RUN', isFastestLap:false },
  { pos:6,  clsPos:2, carClass:'LMP2',     carNum:22, carNumStr:'22', team:'United Autosports',   drivers:'Albuquerque / Filipe', tire:'M', laps:59, lastLap:'2:01.889', bestLap:'2:01.445', gap:'+00:45.1', interval:'+45.1',  pitstops:2, status:'OUT', isFastestLap:false },
  { pos:7,  clsPos:3, carClass:'LMP2',     carNum:37, carNumStr:'37', team:'Cool Racing',         drivers:'Doquin / Laurent',     tire:'S', laps:58, lastLap:'2:02.441', bestLap:'2:02.100', gap:'+1 Lap',   interval:'+1 Lap', pitstops:3, status:'RUN', isFastestLap:false },
  // ── LMGT3 ───────────────────────────────────────────────────────────
  { pos:8,  clsPos:1, carClass:'LMGT3',    carNum:77, carNumStr:'77', team:'Proton Competition',  drivers:'Cairoli / Lietz',      tire:'S', laps:56, lastLap:'2:08.112', bestLap:'2:07.889', gap:'LEAD',     interval:'—',      pitstops:2, status:'RUN', isFastestLap:false },
  { pos:9,  clsPos:2, carClass:'LMGT3',    carNum:91, carNumStr:'91', team:'Porsche GT Team',     drivers:'Pilet / Christensen',  tire:'M', laps:56, lastLap:'2:08.554', bestLap:'2:08.012', gap:'+00:22.8', interval:'+22.8',  pitstops:2, status:'RUN', isFastestLap:false },
  { pos:10, clsPos:3, carClass:'LMGT3',    carNum:55, carNumStr:'55', team:'AF Corse',            drivers:'Fuoco / Molina',       tire:'S', laps:55, lastLap:'2:09.001', bestLap:'2:08.770', gap:'+1 Lap',   interval:'+1 Lap', pitstops:3, status:'PIT', isFastestLap:false },
]

export const messages: Message[] = [
  { id:1,  timestamp:'02:14:22', type:'pit',          carNum:6,  carClass:'HYPERCAR', text:'#6 Porsche Penske PIT IN — Lap 61' },
  { id:2,  timestamp:'02:12:01', type:'fastest',      carNum:2,  carClass:'HYPERCAR', text:'#2 Cadillac Racing sets FASTEST LAP — 1:57.843' },
  { id:3,  timestamp:'02:10:44', type:'pit',          carNum:22, carClass:'LMP2',     text:'#22 United Autosports OUT LAP — Lap 59' },
  { id:4,  timestamp:'02:09:55', type:'pit',          carNum:22, carClass:'LMP2',     text:'#22 United Autosports PIT IN — Lap 58' },
  { id:5,  timestamp:'02:05:12', type:'safety_car',                                   text:'SAFETY CAR deployed — incident at Les Combes (Lap 31)' },
  { id:6,  timestamp:'01:58:33', type:'incident',     carNum:37, carClass:'LMP2',     text:'#37 Cool Racing off-track at Stavelot — no damage' },
  { id:7,  timestamp:'01:50:22', type:'driver_change',carNum:8,  carClass:'HYPERCAR', text:'#8 Toyota Gazoo Racing driver change: Hartley OUT → Buemi IN' },
  { id:8,  timestamp:'01:48:11', type:'pit',          carNum:8,  carClass:'HYPERCAR', text:'#8 Toyota Gazoo Racing OUT — Lap 47 (driver change + refuel, 46.8s)' },
  { id:9,  timestamp:'01:46:55', type:'pit',          carNum:8,  carClass:'HYPERCAR', text:'#8 Toyota Gazoo Racing PIT IN — Lap 47' },
  { id:10, timestamp:'01:40:00', type:'safety_car',                                   text:'SAFETY CAR in — GREEN FLAG Lap 36' },
  { id:11, timestamp:'01:22:18', type:'pit',          carNum:91, carClass:'LMGT3',    text:'#91 Porsche GT Team OUT — Lap 32' },
  { id:12, timestamp:'01:21:05', type:'pit',          carNum:91, carClass:'LMGT3',    text:'#91 Porsche GT Team PIT IN — Lap 31' },
  { id:13, timestamp:'01:15:44', type:'driver_change',carNum:6,  carClass:'HYPERCAR', text:'#6 Porsche Penske driver change: Estre OUT → Lotterer IN' },
  { id:14, timestamp:'01:14:20', type:'pit',          carNum:6,  carClass:'HYPERCAR', text:'#6 Porsche Penske PIT IN — Lap 30 (driver change, 48.2s)' },
  { id:15, timestamp:'01:05:33', type:'fastest',      carNum:7,  carClass:'HYPERCAR', text:'#7 Toyota Gazoo Racing sets FASTEST LAP — 1:57.991' },
  { id:16, timestamp:'00:58:01', type:'pit',          carNum:77, carClass:'LMGT3',    text:'#77 Proton Competition OUT — Lap 18' },
  { id:17, timestamp:'00:56:44', type:'pit',          carNum:77, carClass:'LMGT3',    text:'#77 Proton Competition PIT IN — Lap 17' },
  { id:18, timestamp:'00:31:22', type:'pit',          carNum:2,  carClass:'HYPERCAR', text:'#2 Cadillac Racing OUT — Lap 11' },
  { id:19, timestamp:'00:30:05', type:'pit',          carNum:2,  carClass:'HYPERCAR', text:'#2 Cadillac Racing PIT IN — Lap 10' },
]

const _driverStatsBase = [
  { carNum:2,  carNumStr:'2',  carClass:'HYPERCAR' as const, team:'Cadillac Racing',     driver:'Bamber',       bestLap:'1:57.843', s1:'0:24.211', s2:'0:38.892', s3:'0:54.740', totalTime:'01:08:22', isSessionBest:true  },
  { carNum:7,  carNumStr:'7',  carClass:'HYPERCAR' as const, team:'Toyota Gazoo Racing', driver:'Conway',       bestLap:'1:57.991', s1:'0:24.330', s2:'0:39.001', s3:'0:54.660', totalTime:'01:11:05', isSessionBest:false },
  { carNum:6,  carNumStr:'6',  carClass:'HYPERCAR' as const, team:'Porsche Penske',      driver:'Lotterer',     bestLap:'1:58.502', s1:'0:24.488', s2:'0:39.244', s3:'0:54.770', totalTime:'01:02:15', isSessionBest:false },
  { carNum:8,  carNumStr:'8',  carClass:'HYPERCAR' as const, team:'Toyota Gazoo Racing', driver:'Buemi',        bestLap:'1:58.210', s1:'0:24.351', s2:'0:39.100', s3:'0:54.759', totalTime:'00:48:33', isSessionBest:false },
  { carNum:10, carNumStr:'10', carClass:'LMP2'     as const, team:'United Autosports',   driver:'Owen',         bestLap:'2:01.101', s1:'0:25.220', s2:'0:40.441', s3:'0:55.440', totalTime:'01:10:22', isSessionBest:false },
  { carNum:22, carNumStr:'22', carClass:'LMP2'     as const, team:'United Autosports',   driver:'Albuquerque',  bestLap:'2:01.445', s1:'0:25.440', s2:'0:40.655', s3:'0:55.350', totalTime:'01:05:18', isSessionBest:false },
  { carNum:37, carNumStr:'37', carClass:'LMP2'     as const, team:'Cool Racing',         driver:'Laurent',      bestLap:'2:02.100', s1:'0:25.680', s2:'0:40.900', s3:'0:55.520', totalTime:'01:08:44', isSessionBest:false },
  { carNum:77, carNumStr:'77', carClass:'LMGT3'    as const, team:'Proton Competition',  driver:'Cairoli',      bestLap:'2:07.889', s1:'0:26.100', s2:'0:42.255', s3:'0:59.534', totalTime:'01:09:11', isSessionBest:false },
  { carNum:91, carNumStr:'91', carClass:'LMGT3'    as const, team:'Porsche GT Team',     driver:'Pilet',        bestLap:'2:08.012', s1:'0:26.188', s2:'0:42.388', s3:'0:59.436', totalTime:'01:07:55', isSessionBest:false },
  { carNum:55, carNumStr:'55', carClass:'LMGT3'    as const, team:'AF Corse',            driver:'Fuoco',        bestLap:'2:08.770', s1:'0:26.340', s2:'0:42.800', s3:'0:59.630', totalTime:'01:11:22', isSessionBest:false },
]
export const driverStats: DriverStat[] = _driverStatsBase.map(d => ({
  ...d,
  bestLapMs:      null,
  optimalLap:     '--:--.---',
  optimalLapMs:   null,
  gapToOptimalMs: null,
}))

export const carStints: CarStint[] = [
  {
    carNum:2, carNumStr:'2', carClass:'HYPERCAR', team:'Cadillac Racing',
    stints:[
      { startLap:1,  endLap:28, tire:'S', avgLap:'1:58.441', pitDuration:'22.4' },
      { startLap:29, endLap:null, tire:'M', avgLap:'1:57.960' },
    ],
  },
  {
    carNum:7, carNumStr:'7', carClass:'HYPERCAR', team:'Toyota Gazoo Racing',
    stints:[
      { startLap:1,  endLap:29, tire:'M', avgLap:'1:58.890', pitDuration:'23.1' },
      { startLap:30, endLap:null, tire:'H', avgLap:'1:58.210' },
    ],
  },
  {
    carNum:6, carNumStr:'6', carClass:'HYPERCAR', team:'Porsche Penske',
    stints:[
      { startLap:1,  endLap:30, tire:'S', avgLap:'1:59.220', pitDuration:'48.2' },
      { startLap:31, endLap:61, tire:'H', avgLap:'1:58.800', pitDuration:'21.8' },
      { startLap:62, endLap:null, tire:'S' },
    ],
  },
  {
    carNum:8, carNumStr:'8', carClass:'HYPERCAR', team:'Toyota Gazoo Racing',
    stints:[
      { startLap:1,  endLap:47, tire:'S', avgLap:'1:59.100', pitDuration:'46.8' },
      { startLap:48, endLap:null, tire:'S', avgLap:'1:58.300' },
    ],
  },
  {
    carNum:10, carNumStr:'10', carClass:'LMP2', team:'United Autosports',
    stints:[
      { startLap:1,  endLap:30, tire:'S', avgLap:'2:01.880', pitDuration:'22.9' },
      { startLap:31, endLap:null, tire:'S', avgLap:'2:01.200' },
    ],
  },
  {
    carNum:22, carNumStr:'22', carClass:'LMP2', team:'United Autosports',
    stints:[
      { startLap:1,  endLap:28, tire:'M', avgLap:'2:02.100', pitDuration:'23.4' },
      { startLap:29, endLap:58, tire:'S', avgLap:'2:01.660', pitDuration:'24.2' },
      { startLap:59, endLap:null, tire:'S', avgLap:'2:01.900' },
    ],
  },
  {
    carNum:37, carNumStr:'37', carClass:'LMP2', team:'Cool Racing',
    stints:[
      { startLap:1,  endLap:22, tire:'S', avgLap:'2:02.800', pitDuration:'35.8' },
      { startLap:23, endLap:45, tire:'M', avgLap:'2:02.400', pitDuration:'23.0' },
      { startLap:46, endLap:null, tire:'S', avgLap:'2:02.200' },
    ],
  },
  {
    carNum:77, carNumStr:'77', carClass:'LMGT3', team:'Proton Competition',
    stints:[
      { startLap:1,  endLap:17, tire:'S', avgLap:'2:08.500', pitDuration:'22.1' },
      { startLap:18, endLap:null, tire:'S', avgLap:'2:08.100' },
    ],
  },
  {
    carNum:91, carNumStr:'91', carClass:'LMGT3', team:'Porsche GT Team',
    stints:[
      { startLap:1,  endLap:31, tire:'M', avgLap:'2:09.100', pitDuration:'22.8' },
      { startLap:32, endLap:null, tire:'M', avgLap:'2:08.200' },
    ],
  },
  {
    carNum:55, carNumStr:'55', carClass:'LMGT3', team:'AF Corse',
    stints:[
      { startLap:1,  endLap:20, tire:'S', avgLap:'2:09.800', pitDuration:'24.5' },
      { startLap:21, endLap:40, tire:'S', avgLap:'2:09.200', pitDuration:'22.0' },
      { startLap:41, endLap:null, tire:'S', avgLap:'2:09.100' },
    ],
  },
]
