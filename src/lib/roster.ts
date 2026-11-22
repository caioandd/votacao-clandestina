// Roster oficial da 3ª Copa Clandestina.
// Fonte: lista enviada pela organização (30 nomes).
export type RosterEntry = {
  n: number
  name: string
  nick?: string
  goalkeeper?: boolean
}

export const ROSTER: RosterEntry[] = [
  { n: 1, name: 'Guilherme Magalhães', nick: 'Guimag' },
  { n: 2, name: 'Caio Andrade' },
  { n: 3, name: 'Arthur', nick: 'Cone' },
  { n: 4, name: 'Lazaro' },
  { n: 5, name: 'Fellipe', nick: 'Fellipets' },
  { n: 6, name: 'Jorge' },
  { n: 7, name: 'Riquelme' },
  { n: 8, name: 'Álvaro' },
  { n: 9, name: 'Rian', nick: 'Riih77' },
  { n: 10, name: 'Manoel', nick: 'Nel' },
  { n: 11, name: 'Arlei' },
  { n: 12, name: 'Pedro', nick: 'Peualves' },
  { n: 13, name: 'Guilherme Morais' },
  { n: 14, name: 'Guilherme Giovani' },
  { n: 15, name: 'Joaquim' },
  { n: 16, name: 'Max Gabriel' },
  { n: 17, name: 'Welington', nick: 'Teto' },
  { n: 18, name: 'Gabriel' },
  { n: 19, name: 'Pedro', nick: 'CP' },
  { n: 20, name: 'Luis', nick: 'Elétrica' },
  { n: 21, name: 'Jean' },
  { n: 22, name: 'Duarte' },
  { n: 23, name: 'Gustavo Carvalho' },
  { n: 24, name: 'Iago', nick: 'Iagosexo' },
  { n: 25, name: 'Igor Bruno', nick: 'Cacique' },
  { n: 26, name: 'Iran' },
  { n: 27, name: 'Luiz', nick: 'Ambiental' },
  { n: 28, name: 'Rian', nick: 'Civil' },
  { n: 29, name: 'Sávio' },
  { n: 30, name: 'João', nick: 'Pelicano' },
]
