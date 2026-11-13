const OUTPUTS = ['rail1', 'rail2', 'storageLoads', 'returnPair', 'deyeGrid']
const BUS = 'storageBus'

const TABLE = [
  [1, 1, 'grid', 'grid', 'grid', 'grid'],
  [1, 2, 'grid', 'grid', 'grid', 'grid'],
  [2, 1, 'grid', 'load', 'load', 'load'],
  [2, 2, 'load', 'load', 'load', 'load'],
  [0, 1, 'grid', 'dead', 'dead', 'dead'],
  [0, 2, 'dead', 'dead', 'dead', 'dead'],
  [1, 0, 'dead', 'grid', 'grid', 'grid'],
  [2, 0, 'dead', 'load', 'load', 'load'],
  [0, 0, 'dead', 'dead', 'dead', 'dead'],
]

// [name, part, modules, extra] слева направо, порядок из спеки
const d = (name, part, modules, extra) => ({ name, part, modules, ...extra })

export function devices() {
  const C = (n, p, f) => d(n, p, 1, f && { ferrule: f })
  return {
    apartmentRail1: [
      d('Ввод города 3×10', 'MC240A', 2),
      d('ZUBR MF2-63 red', 'ZUBR', 2),
      d('Переключатель I-0-II', 'SFT240', 2),
      d('Диф 63 А 30 мА тип A', 'CDA263D', 2, { role: 'Диф 63 А' }),
      C('Плита', 'MC125'),
      C('Духовка', 'MC125'),
      C('Бойлер', 'MC125'),
      C('Посудомойка', 'MC120'),
      C('Стиралка', 'MC120'),
      C('Тёплый пол кухня+коридор+ванная', 'MC120', '3 жилы'),
      C('Тёплый пол детская+родители', 'MC120', '2 жилы'),
      C('Полотенцесушитель', 'MC116'),
    ],
    apartmentRail2: [
      d('Ввод с возврата', 'MC232A', 2),
      d('Дифавтомат C32 30 мА тип A', 'ADA982D', 2),
      C('Свет', 'MC110', '5×1,5 мм²'),
      C('Комп родителей', 'MC116'),
      C('Телик и зарядка родителей', 'MC116'),
      C('Телик и зарядка детская', 'MC116'),
      C('Комп детская', 'MC116'),
      C('Розетка микроволновки', 'MC116'),
      C('Холодильник', 'MC116'),
      C('Телик кухни', 'MC116'),
      C('Розетки ванной', 'MC116'),
      C('Розетки коридора', 'MC116'),
      C('Комп и wifi коридора', 'MC116'),
      C('Подсобка', 'MC116'),
      C('Кондиционеры', 'MC116', '2 жилы'),
    ],
    storage: [
      d('Ввод из квартиры', 'MC232A', 2),
      d('ZUBR MF2-63 red', 'ZUBR', 2),
      d('На порт Grid Deye', 'MC232A', 2),
      d('С порта Load Deye', 'MC232A', 2),
      d('Переключатель I-0-II', 'SFT240', 2),
      C('Розетка', 'MC116'),
      C('Свет', 'MC110'),
    ],
  }
}

export function barLinks() {
  return []
}

function link(adj, a, b) {
  ;(adj[a] ??= []).push(b)
  ;(adj[b] ??= []).push(a)
}

function graph(storage, apartment) {
  const adj = {}
  link(adj, 'grid', 'deyeGrid')
  link(adj, BUS, 'rail2')
  link(adj, BUS, 'storageLoads')
  link(adj, BUS, 'returnPair')
  if (storage === 1) link(adj, 'grid', BUS)
  if (storage === 2) link(adj, 'load', BUS)
  if (apartment === 1) link(adj, 'grid', 'rail1')
  if (apartment === 2) link(adj, BUS, 'rail1')
  for (const [a, b] of barLinks()) link(adj, a, b)
  return adj
}

function reachable(start, adj) {
  const seen = new Set([start])
  const stack = [start]
  while (stack.length) {
    const n = stack.pop()
    for (const m of adj[n] ?? []) {
      if (!seen.has(m)) {
        seen.add(m)
        stack.push(m)
      }
    }
  }
  return seen
}

function origin(node, fromGrid, fromLoad) {
  const g = fromGrid.has(node)
  const l = fromLoad.has(node)
  if (g) return 'grid'
  if (l) return 'load'
  return 'dead'
}

export function energize(storage, apartment) {
  const adj = graph(storage, apartment)
  const fromGrid = reachable('grid', adj)
  const fromLoad = reachable('load', adj)
  const hit = OUTPUTS.filter((n) => fromGrid.has(n) && fromLoad.has(n))
  return {
    rail1: origin('rail1', fromGrid, fromLoad),
    rail2: origin('rail2', fromGrid, fromLoad),
    storageLoads: origin('storageLoads', fromGrid, fromLoad),
    returnPair: origin('returnPair', fromGrid, fromLoad),
    deyeGrid: origin('deyeGrid', fromGrid, fromLoad),
    pe: 'bonded',
    fault: hit.length ? hit.join(',') : null,
  }
}

/** Учёт рычагов автоматов: без города/Load на входе переключателя выход тоже мёртвый. */
export function gateBreakers(s, on, storage, apartment) {
  const city = on('city')
  const zA = city && on('zA')
  const qIn = city && on('qIn')
  const gridSto = qIn
  const loadSto = on('qL')
  const gridDeye = qIn && on('zS') && on('qG')
  const kill = (v, gridOk, loadOk) => {
    if (v === 'grid' && !gridOk) return 'dead'
    if (v === 'load' && !loadOk) return 'dead'
    return v
  }
  let rail1 = s.rail1
  if (apartment === 1) rail1 = kill(rail1, zA, false)
  else if (apartment === 2) rail1 = kill(rail1, gridSto, loadSto)
  return {
    ...s,
    rail1,
    rail2: kill(s.rail2, gridSto, loadSto),
    storageLoads: kill(s.storageLoads, gridSto, loadSto),
    returnPair: kill(s.returnPair, gridSto, loadSto),
    deyeGrid: kill(s.deyeGrid, gridDeye, false),
  }
}

export function selfCheck() {
  for (const [storage, apartment, rail1, rail2, storageLoads, returnPair] of TABLE) {
    const s = energize(storage, apartment)
    if (
      s.rail1 !== rail1 ||
      s.rail2 !== rail2 ||
      s.storageLoads !== storageLoads ||
      s.returnPair !== returnPair ||
      s.deyeGrid !== 'grid' ||
      s.pe !== 'bonded' ||
      s.fault !== null
    ) {
      throw new Error(`energize(${storage}, ${apartment}) ${JSON.stringify(s)}`)
    }
  }
  if (barLinks().length !== 0) throw new Error(`barLinks ${JSON.stringify(barLinks())}`)
  const allOn = () => true
  const cityOff = (id) => id !== 'city'
  const g = gateBreakers(energize(1, 1), cityOff, 1, 1)
  if (g.rail1 !== 'dead' || g.storageLoads !== 'dead' || g.returnPair !== 'dead' || g.rail2 !== 'dead') {
    throw new Error(`gate city-off ${JSON.stringify(g)}`)
  }
  const ok = gateBreakers(energize(1, 1), allOn, 1, 1)
  if (ok.rail1 !== 'grid' || ok.storageLoads !== 'grid') throw new Error(`gate all-on ${JSON.stringify(ok)}`)
}
