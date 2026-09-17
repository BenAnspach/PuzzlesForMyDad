import { Fragment, useEffect, useState } from 'react'
import './App.css'

const initialLines = [
  { x: 9, y: 4, rotation: 0, slot: null },
  { x: 22, y: 11, rotation: 45, slot: null },
  { x: 36, y: 2, rotation: 90, slot: null },
  { x: 51, y: 8, rotation: 135, slot: null },
  { x: 66, y: 15, rotation: 225, slot: null },
  { x: 79, y: 4, rotation: 270, slot: null },
  { x: 91, y: 10, rotation: 315, slot: null },
  { x: 48, y: 16, rotation: 0, slot: null },
]
const snapSlots = Array.from({ length: 8 }, (_, index) => {
  const angle = index * 45
  const radians = (angle * Math.PI) / 180

  return {
    angle,
    x: 50 + Math.sin(radians) * 28,
    y: 50 - Math.cos(radians) * 28,
  }
})
const letterGridRows = [
  'UJNLQAIRUP',
  'XUETLASPXT',
  'FATNTWHMBT',
  'FRBICTLQON',
  'GCWPHMDBVV',
  'CDAGMDSFHA',
  'ALIRGABLBF',
  'MMOBWGDFTZ',
  'TRIUQSTLMO',
  'KTDCKBVDWJ',
]
const sineWavePath = Array.from({ length: 281 }, (_, index) => {
  const x = (index / 280) * 600
  const y = 90 - 70 * Math.sin((x / 600) * Math.PI * 14)

  return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
}).join(' ')
const wavePeriod = 600 / 7
const sineWaveMarks = [
  { x: wavePeriod * 2, y: 90 },
  { x: wavePeriod * 2 + wavePeriod / 4, y: 20 },
  { x: wavePeriod * 2 + (wavePeriod * 3) / 4, y: 160 },
  { x: wavePeriod * 3, y: 90 },
  { x: wavePeriod * 3 + wavePeriod / 4, y: 20 },
]
const sineFiles = Array.from({ length: 500 }, (_, index) => `${index + 1}.sine`)
const initialCannons = [
  { id: 'cannon-one', x: 25, y: 28, attached: false },
  { id: 'cannon-two', x: 78, y: 72, attached: false },
]
const rhythmLanes = [
  { key: 'z', color: '#e74c3c' },
  { key: 'x', color: '#f1c40f' },
  { key: 'c', color: '#2ecc71' },
  { key: 'v', color: '#3498db' },
]
const rhythmLaneCounts = [6, 18, 5, 20]
const rhythmTotalNotes = rhythmLaneCounts.reduce((sum, count) => sum + count, 0)
const rhythmMaxMistakes = 3
const rhythmTargetY = 88
const rhythmHitWindow = 8

function buildRhythmQueue() {
  const queue = rhythmLaneCounts.flatMap((count, lane) => Array(count).fill(lane))

  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]]
  }

  return queue
}

function getNearestOpenSlot(x, y, rotation, lines, lineIndex) {
  const matchingSlots = snapSlots.filter(
    (slot) => slot.angle % 180 === rotation % 180,
  )
  const occupiedSlots = new Set(
    lines
      .filter((line, index) => index !== lineIndex && line.slot !== null)
      .map((line) => line.slot),
  )

  return matchingSlots
    .filter((slot) => !occupiedSlots.has(slot.angle))
    .map((slot) => ({
      slot,
      distance: Math.hypot(slot.x - x, slot.y - y),
    }))
    .sort((first, second) => first.distance - second.distance)[0]
}

const raceDuration = 25000
const raceRoadLeft = 24
const raceRoadRight = 76
const racePlayerY = 80
const racePlayerLateralSpeed = 0.09
const raceScrollSpeed = 0.05
const raceObstacleSpawnInterval = 900
const raceObstacleHitRadiusX = 8
const raceObstacleHitRadiusY = 6
const raceObstacleDamage = 34
const raceInvulnerableDuration = 800
const raceLeanAngle = 16
const raceEmojis = ['🚧', '🪨', '🛢️']

function createRaceState() {
  return {
    status: 'racing',
    health: 100,
    elapsed: 0,
    scrollDistance: 0,
    player: { x: 50, lean: 0 },
    invulnerable: false,
    obstacles: [],
  }
}

const shooterRoomSize = 100
const shooterWallThickness = 8
const shooterDoorWidth = 34
const shooterRoomStarts = [0, shooterRoomSize + shooterWallThickness, (shooterRoomSize + shooterWallThickness) * 2]
const shooterRoomCenters = shooterRoomStarts.map((start) => start + shooterRoomSize / 2)
const shooterWorldSize = shooterRoomStarts[shooterRoomStarts.length - 1] + shooterRoomSize
const shooterViewRadius = 60
const shooterScale = 50 / shooterViewRadius
const shooterEnemyCount = 12
const shooterEnemySpeed = 0.014
const shooterEnemyRadius = 4
const shooterEnemyContactRadius = 6
const shooterEnemyDamage = 10
const shooterInvulnerableDuration = 700
const shooterBulletSpeed = 0.32
const shooterBulletHitRadius = 4
const shooterBulletLifespan = 1400
const shooterPlayerSpeed = 0.1
const shooterPlayerRadius = 4
const shooterBossHitRadius = 8
const shooterBossHealthMax = 100
const shooterBossDamagePerHit = 20

// splits an axis into wall segments, leaving a door-sized gap centered on each room
function buildAxisSegments(gapCenters, gapWidth, totalLength) {
  const cuts = gapCenters.flatMap((center) => [center - gapWidth / 2, center + gapWidth / 2])
  const segments = []
  let cursor = 0

  for (let index = 0; index < cuts.length; index += 2) {
    segments.push({ start: cursor, end: cuts[index] })
    cursor = cuts[index + 1]
  }
  segments.push({ start: cursor, end: totalLength })

  return segments.filter((segment) => segment.end - segment.start > 0.5)
}

// lays out a 3x3 grid of rooms divided by walls, with a door through to every room in each row/column
function buildDungeon() {
  const walls = [
    { x: -shooterWallThickness, y: -shooterWallThickness, width: shooterWorldSize + shooterWallThickness * 2, height: shooterWallThickness },
    { x: -shooterWallThickness, y: shooterWorldSize, width: shooterWorldSize + shooterWallThickness * 2, height: shooterWallThickness },
    { x: -shooterWallThickness, y: -shooterWallThickness, width: shooterWallThickness, height: shooterWorldSize + shooterWallThickness * 2 },
    { x: shooterWorldSize, y: -shooterWallThickness, width: shooterWallThickness, height: shooterWorldSize + shooterWallThickness * 2 },
  ]
  const doors = []
  const innerWallStarts = shooterRoomStarts.slice(0, -1).map((start) => start + shooterRoomSize)

  for (const wallStart of innerWallStarts) {
    for (const segment of buildAxisSegments(shooterRoomCenters, shooterDoorWidth, shooterWorldSize)) {
      walls.push({ x: wallStart, y: segment.start, width: shooterWallThickness, height: segment.end - segment.start })
      walls.push({ x: segment.start, y: wallStart, width: segment.end - segment.start, height: shooterWallThickness })
    }
    for (const center of shooterRoomCenters) {
      doors.push({ x: wallStart, y: center - shooterDoorWidth / 2, width: shooterWallThickness, height: shooterDoorWidth, orientation: 'vertical' })
      doors.push({ x: center - shooterDoorWidth / 2, y: wallStart, width: shooterDoorWidth, height: shooterWallThickness, orientation: 'horizontal' })
    }
  }

  return { walls, doors }
}

const shooterDungeon = buildDungeon()

function pointInWalls(x, y, walls) {
  return walls.some((wall) => x >= wall.x && x <= wall.x + wall.width && y >= wall.y && y <= wall.y + wall.height)
}

// pushes a circle out of any wall rectangle it overlaps
function resolveWalls(x, y, radius, walls) {
  let nextX = x
  let nextY = y

  for (const wall of walls) {
    const closestX = Math.max(wall.x, Math.min(nextX, wall.x + wall.width))
    const closestY = Math.max(wall.y, Math.min(nextY, wall.y + wall.height))
    const dx = nextX - closestX
    const dy = nextY - closestY
    const distance = Math.hypot(dx, dy)

    if (distance < radius) {
      if (distance === 0) {
        nextY = wall.y - radius
      } else {
        const overlap = radius - distance
        nextX += (dx / distance) * overlap
        nextY += (dy / distance) * overlap
      }
    }
  }

  return { x: nextX, y: nextY }
}

function createShooterState() {
  const rooms = []
  for (const centerY of shooterRoomCenters) {
    for (const centerX of shooterRoomCenters) {
      rooms.push({ x: centerX, y: centerY })
    }
  }

  const startRoomIndex = Math.floor(rooms.length / 2)
  const bossRoomIndex = rooms.length - 1
  const enemyRooms = rooms.filter((_, index) => index !== startRoomIndex && index !== bossRoomIndex)

  const enemies = Array.from({ length: shooterEnemyCount }, (_, index) => {
    const room = enemyRooms[index % enemyRooms.length]
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * (shooterRoomSize / 2 - 12)

    return {
      id: `enemy-${index}`,
      type: Math.random() < 0.5 ? 'pickle' : 'feet',
      x: room.x + Math.cos(angle) * distance,
      y: room.y + Math.sin(angle) * distance,
    }
  })

  return {
    status: 'playing',
    health: 100,
    elapsed: 0,
    player: { x: rooms[startRoomIndex].x, y: rooms[startRoomIndex].y },
    invulnerable: false,
    enemies,
    boss: { x: rooms[bossRoomIndex].x, y: rooms[bossRoomIndex].y, health: shooterBossHealthMax },
    bullets: [],
  }
}


const heiganDuration = 30000
const heiganColumnCount = 4
const heiganCycleDuration = 1800
const heiganTelegraphDuration = 1100
const thaddiusDuration = 30000
const thaddiusShiftInterval = 5000
const thaddiusWarningDuration = 1500
const thaddiusOrbRadius = 6
const thaddiusSwitchChance = 0.8

function createEncounterState() {
  return {
    stage: 'heigan',
    status: 'playing',
    health: 100,
    elapsed: 0,
    player: { x: 50, y: 88 },
    invulnerable: false,
    heiganUnsafeColumns: [0, 1],
    heiganEruptState: 'telegraph',
    thaddiusCharge: 'positive',
    thaddiusPositiveSide: 'left',
    thaddiusWarning: false,
    thaddiusOrbs: [
      { id: 'orb-1', x: 30, y: 30, vx: 0.02, vy: 0.017 },
      { id: 'orb-2', x: 70, y: 45, vx: -0.018, vy: 0.02 },
    ],
  }
}

function App() {
  const [puzzle, setPuzzle] = useState(1)
  const [lines, setLines] = useState(initialLines)
  const [draggingLine, setDraggingLine] = useState(null)
  const [password, setPassword] = useState('')
  const [showSineFiles, setShowSineFiles] = useState(false)
  const [boatPlaced, setBoatPlaced] = useState(false)
  const [boatPosition, setBoatPosition] = useState({ x: 50, y: 50, rotation: 0 })
  const [cannons, setCannons] = useState(initialCannons)
  const [rhythmNotes, setRhythmNotes] = useState([])
  const [rhythmScore, setRhythmScore] = useState({ hits: 0, misses: 0 })
  const [activeLaneKeys, setActiveLaneKeys] = useState([])
  const [rhythmResult, setRhythmResult] = useState(null)
  const [treasureCode, setTreasureCode] = useState(['', '', '', ''])
  const [raceState, setRaceState] = useState(createRaceState)
  const [raceRunId, setRaceRunId] = useState(0)
  const [encounterState, setEncounterState] = useState(createEncounterState)
  const [encounterRunId, setEncounterRunId] = useState(0)
  const [encounterCode, setEncounterCode] = useState(Array(14).fill(''))
  const [shooterState, setShooterState] = useState(createShooterState)
  const [shooterRunId, setShooterRunId] = useState(0)
  const [shooterCode, setShooterCode] = useState(['', '', '', ''])
  const treasureUnlocked = treasureCode.join('').toLowerCase() === 'fret'
  const encounterSolved =
    encounterCode.slice(0, 6).join('').toLowerCase() === 'heigan' &&
    encounterCode.slice(6, 14).join('').toLowerCase() === 'thaddius'
  const shooterSolved = shooterCode.join('').toLowerCase() === 'ball'
  const allLinesSnapped = lines.every((line) => line.slot !== null)
  const isGridPage = puzzle >= 4
  const gridIndex = puzzle - 4
  const gridRow = Math.floor(gridIndex / 3)
  const gridColumn = gridIndex % 3

  const moveThroughGrid = (direction) => {
    setPuzzle((current) => {
      if (current < 4) return current

      const currentIndex = current - 4
      const row = Math.floor(currentIndex / 3)
      const column = currentIndex % 3
      let nextRow = row
      let nextColumn = column

      if (direction === 'left') nextColumn -= 1
      if (direction === 'right') nextColumn += 1
      if (direction === 'up') nextRow -= 1
      if (direction === 'down') nextRow += 1

      if (nextRow < 0 || nextRow > 2 || nextColumn < 0 || nextColumn > 2) {
        if (current === 4 && direction === 'left') return 3
        return current
      }

      return 4 + nextRow * 3 + nextColumn
    })
  }

  const handleBoatDrop = (event) => {
    event.preventDefault()
    if (event.dataTransfer.getData('text/plain') !== 'boat') return

    setBoatPlaced(true)
  }

  const handleTreasureCodeChange = (index, value) => {
    const letter = value.slice(-1)
    setTreasureCode((current) => current.map((char, charIndex) => (charIndex === index ? letter : char)))

    if (letter && index < 3) {
      document.getElementById(`treasure-slot-${index + 1}`)?.focus()
    }
  }

  const handleTreasureCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !treasureCode[index] && index > 0) {
      document.getElementById(`treasure-slot-${index - 1}`)?.focus()
    }
  }

  const handleEncounterCodeChange = (index, value) => {
    const letter = value.slice(-1)
    setEncounterCode((current) => current.map((char, charIndex) => (charIndex === index ? letter : char)))

    if (letter && index < 13) {
      document.getElementById(`encounter-slot-${index + 1}`)?.focus()
    }
  }

  const handleEncounterCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !encounterCode[index] && index > 0) {
      document.getElementById(`encounter-slot-${index - 1}`)?.focus()
    }
  }

  const handleShooterCodeChange = (index, value) => {
    const letter = value.slice(-1)
    setShooterCode((current) => current.map((char, charIndex) => (charIndex === index ? letter : char)))

    if (letter && index < 3) {
      document.getElementById(`shooter-slot-${index + 1}`)?.focus()
    }
  }

  const handleShooterCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !shooterCode[index] && index > 0) {
      document.getElementById(`shooter-slot-${index - 1}`)?.focus()
    }
  }

  const resetEncounter = () => setEncounterRunId((current) => current + 1)

  const resetShooter = () => setShooterRunId((current) => current + 1)

  const resetRace = () => setRaceRunId((current) => current + 1)

  useEffect(() => {
    if (puzzle !== 4) return undefined

    const pressedKeys = new Set()
    let animationFrame
    let previousTime
    let invulnerableUntil = 0
    let spawnTimer = 0
    let finished = false
    let status = 'racing'
    let elapsed = 0
    let scrollDistance = 0
    let health = 100
    let player = { x: 50, lean: 0 }
    let obstacles = []
    let nextObstacleId = 0

    setRaceState(createRaceState())

    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement) return

      const key = event.key.toLowerCase()
      if (!['a', 'd'].includes(key)) return

      event.preventDefault()
      pressedKeys.add(key)
    }

    const handleKeyUp = (event) => {
      pressedKeys.delete(event.key.toLowerCase())
    }

    const animateRace = (time) => {
      if (finished) return

      const delta = previousTime === undefined ? 0 : Math.min(time - previousTime, 50)
      previousTime = time
      elapsed += delta
      scrollDistance += delta * raceScrollSpeed

      // you're always driving forward - steering only shifts you sideways while the road scrolls past
      const steerDirection = (pressedKeys.has('d') ? 1 : 0) - (pressedKeys.has('a') ? 1 : 0)
      player = {
        x: Math.max(raceRoadLeft + 6, Math.min(raceRoadRight - 6, player.x + steerDirection * delta * racePlayerLateralSpeed)),
        lean: steerDirection * raceLeanAngle,
      }

      spawnTimer += delta
      if (spawnTimer > raceObstacleSpawnInterval) {
        spawnTimer = 0
        nextObstacleId += 1
        obstacles = [
          ...obstacles,
          {
            id: `obstacle-${nextObstacleId}`,
            x: raceRoadLeft + 10 + Math.random() * (raceRoadRight - raceRoadLeft - 20),
            y: -10,
            emoji: raceEmojis[Math.floor(Math.random() * raceEmojis.length)],
          },
        ]
      }

      obstacles = obstacles
        .map((obstacle) => ({ ...obstacle, y: obstacle.y + delta * raceScrollSpeed }))
        .filter((obstacle) => obstacle.y < 112)

      const survivingObstacles = []
      for (const obstacle of obstacles) {
        const hit =
          time > invulnerableUntil &&
          Math.abs(obstacle.y - racePlayerY) < raceObstacleHitRadiusY &&
          Math.abs(obstacle.x - player.x) < raceObstacleHitRadiusX

        if (hit) {
          health -= raceObstacleDamage
          invulnerableUntil = time + raceInvulnerableDuration
        } else {
          survivingObstacles.push(obstacle)
        }
      }
      obstacles = survivingObstacles

      health = Math.max(0, health)
      if (health <= 0) status = 'lost'
      else if (elapsed >= raceDuration) status = 'won'

      setRaceState({
        status,
        health,
        elapsed,
        scrollDistance,
        player,
        invulnerable: time < invulnerableUntil,
        obstacles,
      })

      if (status !== 'racing') {
        finished = true
        return
      }

      animationFrame = window.requestAnimationFrame(animateRace)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    animationFrame = window.requestAnimationFrame(animateRace)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [puzzle, raceRunId])

  useEffect(() => {
    if (!boatPlaced || puzzle !== 9) return undefined

    const pressedKeys = new Set()
    let animationFrame
    let previousTime

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase()
      if (!['w', 'a', 'd'].includes(key)) return

      event.preventDefault()
      pressedKeys.add(key)
    }

    const handleKeyUp = (event) => {
      pressedKeys.delete(event.key.toLowerCase())
    }

    const animateBoat = (time) => {
      const elapsed = previousTime === undefined ? 0 : Math.min(time - previousTime, 50)
      previousTime = time

      if (elapsed > 0 && pressedKeys.size > 0) {
        setBoatPosition((current) => {
          const turnDirection = (pressedKeys.has('d') ? 1 : 0) - (pressedKeys.has('a') ? 1 : 0)
          const rotation = current.rotation + turnDirection * elapsed * 0.12
          const radians = (rotation * Math.PI) / 180
          const movement = pressedKeys.has('w') ? elapsed * 0.022 : 0

          const nextPosition = {
            x: Math.max(8, Math.min(92, current.x + Math.sin(radians) * movement)),
            y: Math.max(8, Math.min(92, current.y - Math.cos(radians) * movement)),
            rotation,
          }

          setCannons((currentCannons) =>
            currentCannons.map((cannon) =>
              !cannon.attached &&
              Math.hypot(cannon.x - nextPosition.x, cannon.y - nextPosition.y) < 7
                ? { ...cannon, attached: true }
                : cannon,
            ),
          )

          return nextPosition
        })
      }

      animationFrame = window.requestAnimationFrame(animateBoat)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    animationFrame = window.requestAnimationFrame(animateBoat)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [boatPlaced, puzzle])

  useEffect(() => {
    if (puzzle !== 8) return undefined

    let animationFrame
    let previousTime
    let spawnTimer = 0
    let notes = []
    let spawnQueue = buildRhythmQueue()
    let spawnedCount = 0
    let hits = 0
    let misses = 0
    let gameOver = false

    const handleKeyDown = (event) => {
      if (gameOver) return

      const key = event.key.toLowerCase()
      const lane = rhythmLanes.findIndex((laneInfo) => laneInfo.key === key)
      if (lane === -1 || event.repeat) return

      event.preventDefault()
      setActiveLaneKeys((current) => (current.includes(key) ? current : [...current, key]))

      // hit the closest note in this lane that's inside the target window
      const candidates = notes
        .filter((note) => note.lane === lane && Math.abs(note.y - rhythmTargetY) <= rhythmHitWindow)
        .sort((first, second) => Math.abs(first.y - rhythmTargetY) - Math.abs(second.y - rhythmTargetY))
      const target = candidates[0]

      if (!target) return

      notes = notes.filter((note) => note.id !== target.id)
      hits += 1
      setRhythmScore({ hits, misses })
      setRhythmNotes(notes)
    }

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase()
      setActiveLaneKeys((current) => current.filter((activeKey) => activeKey !== key))
    }

    const animateRhythm = (time) => {
      if (gameOver) return

      const elapsed = previousTime === undefined ? 0 : Math.min(time - previousTime, 50)
      previousTime = time

      spawnTimer += elapsed
      if (spawnTimer > 800 && spawnQueue.length > 0) {
        spawnTimer = 0
        const lane = spawnQueue.shift()
        spawnedCount += 1
        notes = [...notes, { id: `${time}-${Math.random()}`, lane, y: -5 }]
      }

      let missedCount = 0
      notes = notes
        .map((note) => ({ ...note, y: note.y + elapsed * 0.03 }))
        .filter((note) => {
          if (note.y - rhythmTargetY > rhythmHitWindow) {
            missedCount += 1
            return false
          }
          return true
        })

      if (missedCount > 0) {
        misses += missedCount
        setRhythmScore({ hits, misses })
      }

      setRhythmNotes(notes)

      if (spawnQueue.length === 0 && spawnedCount >= rhythmTotalNotes && notes.length === 0) {
        gameOver = true
        setRhythmResult({ win: misses <= rhythmMaxMistakes })
        return
      }

      animationFrame = window.requestAnimationFrame(animateRhythm)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    animationFrame = window.requestAnimationFrame(animateRhythm)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.cancelAnimationFrame(animationFrame)
      setRhythmNotes([])
      setRhythmScore({ hits: 0, misses: 0 })
      setActiveLaneKeys([])
      setRhythmResult(null)
      setTreasureCode(['', '', '', ''])
    }
  }, [puzzle])

  useEffect(() => {
    if (puzzle !== 10) return undefined

    const pressedKeys = new Set()
    let animationFrame
    let previousTime
    let invulnerableUntil = 0
    let lastShotTime = -Infinity
    let finished = false
    let status = 'playing'
    let elapsed = 0
    let aimAngle = 0

    const initialState = createShooterState()
    let player = { ...initialState.player }
    let health = initialState.health
    let enemies = initialState.enemies.map((enemy) => ({ ...enemy }))
    let boss = { ...initialState.boss }
    let bullets = []

    setShooterState(initialState)
    setShooterCode(['', '', '', ''])

    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement) return

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        if (finished) return

        const time = performance.now()
        if (time - lastShotTime < 220) return
        lastShotTime = time

        bullets = [
          ...bullets,
          {
            id: `bullet-${time}-${Math.random()}`,
            x: player.x,
            y: player.y,
            vx: Math.cos(aimAngle) * shooterBulletSpeed,
            vy: Math.sin(aimAngle) * shooterBulletSpeed,
            spawnTime: time,
          },
        ]
        return
      }

      const key = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd'].includes(key)) return

      event.preventDefault()
      pressedKeys.add(key)
    }

    const handleKeyUp = (event) => {
      pressedKeys.delete(event.key.toLowerCase())
    }

    // aim angle tracks the cursor relative to the player, who stays pinned at the arena's center
    const handleMouseMove = (event) => {
      const arena = document.querySelector('.shooter-arena')
      if (!arena) return

      const rect = arena.getBoundingClientRect()
      aimAngle = Math.atan2(
        event.clientY - (rect.top + rect.height / 2),
        event.clientX - (rect.left + rect.width / 2),
      )
    }

    const animateShooter = (time) => {
      if (finished) return

      const delta = previousTime === undefined ? 0 : Math.min(time - previousTime, 50)
      previousTime = time
      elapsed += delta

      const moveX = (pressedKeys.has('d') ? 1 : 0) - (pressedKeys.has('a') ? 1 : 0)
      const moveY = (pressedKeys.has('s') ? 1 : 0) - (pressedKeys.has('w') ? 1 : 0)
      if (moveX !== 0 || moveY !== 0) {
        const normalize = moveX !== 0 && moveY !== 0 ? 0.7071 : 1
        const targetX = player.x + moveX * normalize * shooterPlayerSpeed * delta
        const targetY = player.y + moveY * normalize * shooterPlayerSpeed * delta
        const resolved = resolveWalls(targetX, targetY, shooterPlayerRadius, shooterDungeon.walls)
        player = {
          x: Math.max(0, Math.min(shooterWorldSize, resolved.x)),
          y: Math.max(0, Math.min(shooterWorldSize, resolved.y)),
        }
      }

      enemies = enemies.map((enemy) => {
        const dx = player.x - enemy.x
        const dy = player.y - enemy.y
        const distance = Math.hypot(dx, dy) || 1
        const resolved = resolveWalls(
          enemy.x + (dx / distance) * shooterEnemySpeed * delta,
          enemy.y + (dy / distance) * shooterEnemySpeed * delta,
          shooterEnemyRadius,
          shooterDungeon.walls,
        )

        return { ...enemy, x: resolved.x, y: resolved.y }
      })

      for (const enemy of enemies) {
        if (
          time > invulnerableUntil &&
          Math.hypot(enemy.x - player.x, enemy.y - player.y) < shooterEnemyContactRadius
        ) {
          health -= shooterEnemyDamage
          invulnerableUntil = time + shooterInvulnerableDuration
        }
      }

      if (time > invulnerableUntil && Math.hypot(boss.x - player.x, boss.y - player.y) < shooterBossHitRadius) {
        health -= shooterEnemyDamage
        invulnerableUntil = time + shooterInvulnerableDuration
      }

      bullets = bullets
        .map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx * delta, y: bullet.y + bullet.vy * delta }))
        .filter(
          (bullet) =>
            time - bullet.spawnTime < shooterBulletLifespan && !pointInWalls(bullet.x, bullet.y, shooterDungeon.walls),
        )

      const survivingBullets = []
      for (const bullet of bullets) {
        let consumed = false

        if (boss.health > 0 && Math.hypot(bullet.x - boss.x, bullet.y - boss.y) < shooterBossHitRadius) {
          boss = { ...boss, health: Math.max(0, boss.health - shooterBossDamagePerHit) }
          consumed = true
        }

        if (!consumed) {
          const hitEnemy = enemies.find(
            (enemy) => Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < shooterBulletHitRadius,
          )
          if (hitEnemy) {
            enemies = enemies.filter((enemy) => enemy.id !== hitEnemy.id)
            consumed = true
          }
        }

        if (!consumed) survivingBullets.push(bullet)
      }
      bullets = survivingBullets

      health = Math.max(0, health)
      if (boss.health <= 0) status = 'won'
      else if (health <= 0) status = 'lost'

      setShooterState({
        status,
        health,
        elapsed,
        player,
        invulnerable: time < invulnerableUntil,
        enemies,
        boss,
        bullets,
      })

      if (status !== 'playing') {
        finished = true
        return
      }

      animationFrame = window.requestAnimationFrame(animateShooter)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    animationFrame = window.requestAnimationFrame(animateShooter)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [puzzle, shooterRunId])

  useEffect(() => {
    if (puzzle !== 11) return undefined

    const pressedKeys = new Set()
    let animationFrame
    let previousTime
    let invulnerableUntil = 0
    let finished = false
    let stage = 'heigan'
    let status = 'playing'
    let phaseElapsed = 0
    let player = { x: 50, y: 88 }
    let health = 100

    // heigan the unclean: eruption pattern snaking back and forth across the floor
    let heiganCycleTimer = 0
    let heiganPairStart = 0
    let heiganDirection = 1
    let heiganUnsafeColumns = [0, 1]
    let heiganEruptState = 'telegraph'

    // thaddius: polarity charge that must match the correct side of the room
    let thaddiusCharge = Math.random() < 0.5 ? 'positive' : 'negative'
    let thaddiusPositiveSide = Math.random() < 0.5 ? 'left' : 'right'
    let thaddiusTimer = 0
    let thaddiusWarning = false
    let thaddiusOrbs = [
      { id: 'orb-1', x: 30, y: 30, vx: 0.02, vy: 0.017 },
      { id: 'orb-2', x: 70, y: 45, vx: -0.018, vy: 0.02 },
    ]

    setEncounterState(createEncounterState())
    setEncounterCode(Array(14).fill(''))

    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement) return

      const key = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd'].includes(key)) return

      event.preventDefault()
      pressedKeys.add(key)
    }

    const handleKeyUp = (event) => {
      pressedKeys.delete(event.key.toLowerCase())
    }

    const animateEncounter = (time) => {
      if (finished) return

      const delta = previousTime === undefined ? 0 : Math.min(time - previousTime, 50)
      previousTime = time
      phaseElapsed += delta

      let moveX = (pressedKeys.has('d') ? 1 : 0) - (pressedKeys.has('a') ? 1 : 0)
      let moveY = (pressedKeys.has('s') ? 1 : 0) - (pressedKeys.has('w') ? 1 : 0)
      if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071
        moveY *= 0.7071
      }
      const speed = delta * 0.03
      player = {
        x: Math.max(4, Math.min(96, player.x + moveX * speed)),
        y: Math.max(6, Math.min(96, player.y + moveY * speed)),
      }

      if (stage === 'heigan') {
        heiganCycleTimer += delta

        if (heiganEruptState === 'telegraph' && heiganCycleTimer >= heiganTelegraphDuration) {
          heiganEruptState = 'erupt'

          const columnWidth = 100 / heiganColumnCount
          const playerColumn = Math.min(
            heiganColumnCount - 1,
            Math.floor(player.x / columnWidth),
          )

          if (heiganUnsafeColumns.includes(playerColumn) && time > invulnerableUntil) {
            health -= 22
            invulnerableUntil = time + 700
          }
        }

        if (heiganCycleTimer >= heiganCycleDuration) {
          heiganCycleTimer = 0
          heiganEruptState = 'telegraph'

          if (heiganPairStart <= 0) heiganDirection = 1
          if (heiganPairStart >= heiganColumnCount - 2) heiganDirection = -1
          heiganPairStart += heiganDirection
          heiganUnsafeColumns = [heiganPairStart, heiganPairStart + 1]
        }

        if (phaseElapsed >= heiganDuration) {
          stage = 'thaddius'
          phaseElapsed = 0
        }
      }

      if (stage === 'thaddius') {
        thaddiusTimer += delta
        thaddiusWarning = thaddiusTimer >= thaddiusShiftInterval - thaddiusWarningDuration

        if (thaddiusTimer >= thaddiusShiftInterval) {
          const targetSide = (thaddiusCharge === 'positive') === (thaddiusPositiveSide === 'left') ? 'left' : 'right'
          const correctZone = targetSide === 'left' ? player.x < 50 : player.x >= 50

          if (!correctZone && time > invulnerableUntil) {
            health -= 25
            invulnerableUntil = time + 700
          }

          thaddiusTimer = 0
          thaddiusWarning = false
          thaddiusCharge =
            Math.random() < thaddiusSwitchChance
              ? thaddiusCharge === 'positive'
                ? 'negative'
                : 'positive'
              : thaddiusCharge
          thaddiusPositiveSide = Math.random() < 0.5 ? 'left' : 'right'
        }

        thaddiusOrbs = thaddiusOrbs.map((orb) => {
          let { x, y, vx, vy } = orb
          x += vx * delta
          y += vy * delta
          if (x < 6 || x > 94) vx = -vx
          if (y < 16 || y > 94) vy = -vy
          x = Math.max(6, Math.min(94, x))
          y = Math.max(16, Math.min(94, y))
          return { ...orb, x, y, vx, vy }
        })
        for (const orb of thaddiusOrbs) {
          const distance = Math.hypot(orb.x - player.x, orb.y - player.y)
          if (distance < thaddiusOrbRadius && time > invulnerableUntil) {
            health -= 16
            invulnerableUntil = time + 500
          }
        }

        if (phaseElapsed >= thaddiusDuration) {
          status = 'won'
        }
      }

      health = Math.max(0, health)
      if (health <= 0) status = 'lost'

      setEncounterState({
        stage,
        status,
        health,
        elapsed: phaseElapsed,
        player,
        invulnerable: time < invulnerableUntil,
        heiganUnsafeColumns,
        heiganEruptState,
        thaddiusCharge,
        thaddiusPositiveSide,
        thaddiusWarning,
        thaddiusOrbs,
      })

      if (status !== 'playing') {
        finished = true
        return
      }

      animationFrame = window.requestAnimationFrame(animateEncounter)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    animationFrame = window.requestAnimationFrame(animateEncounter)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [puzzle, encounterRunId])

  useEffect(() => {
    if (draggingLine === null) return undefined

    const handleMouseMove = (event) => {
      const lineField = document.querySelector('.yellow-lines')
      if (!lineField) return

      const bounds = lineField.getBoundingClientRect()
      const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100
      const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100
      const x = Math.max(
        0,
        Math.min(100, pointerX - draggingLine.offsetX),
      )
      const y = Math.max(
        0,
        Math.min(100, pointerY - draggingLine.offsetY),
      )

      setLines((current) =>
        current.map((line, index) =>
          index === draggingLine.index ? { ...line, x, y } : line,
        ),
      )
    }

    const handleMouseUp = (event) => {
      const lineField = document.querySelector('.yellow-lines')
      if (!lineField) return

      const bounds = lineField.getBoundingClientRect()
      const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100
      const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100
      const x = Math.max(
        0,
        Math.min(100, pointerX - draggingLine.offsetX),
      )
      const y = Math.max(
        0,
        Math.min(100, pointerY - draggingLine.offsetY),
      )

      setLines((current) => {
        const line = current[draggingLine.index]
        const nearest = getNearestOpenSlot(
          x,
          y,
          line.rotation,
          current,
          draggingLine.index,
        )
        const snapped = nearest && nearest.distance <= 8 ? nearest.slot : null

        return current.map((currentLine, index) =>
          index === draggingLine.index
            ? {
                ...currentLine,
                x: snapped ? snapped.x : x,
                y: snapped ? snapped.y : y,
                slot: snapped ? snapped.angle : null,
              }
            : currentLine,
        )
      })
      setDraggingLine(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingLine])

  return (
    <main className="puzzle-page">
      {puzzle === 1 && (
        <>
          <div className="yellow-circle" aria-hidden="true" />
          <div className="yellow-lines" aria-hidden="true">
            {lines.map((line, index) => (
              <span
                key={index}
                className="draggable-line"
                style={{
                  left: `${line.x}%`,
                  top: `${line.y}%`,
                  transform: `translate(-50%, -50%) rotate(${line.rotation}deg)`,
                }}
                onMouseDown={(event) => {
                  event.preventDefault()
                  const lineField = event.currentTarget.closest('.yellow-lines')
                  const fieldBounds = lineField.getBoundingClientRect()
                  setDraggingLine({
                    index,
                    offsetX:
                      ((event.clientX - fieldBounds.left) / fieldBounds.width) *
                        100 -
                      line.x,
                    offsetY:
                      ((event.clientY - fieldBounds.top) / fieldBounds.height) *
                        100 -
                      line.y,
                  })
                  setLines((current) =>
                    current.map((currentLine, currentIndex) =>
                      currentIndex === index
                        ? { ...currentLine, slot: null }
                        : currentLine,
                    ),
                  )
                }}
              />
            ))}
          </div>
          {allLinesSnapped && (
            <div className="speech-bubble" role="status">
              <p>Welcome to Puzzles for my Dad. I&apos;m the sun and I&apos;ll be your guide.</p>
              <p>
                To solve my riddles 50 you will be faced with many challenges. You will be
                expected to problem solve, think outside of the box, and will probably need
                to use Google because there are a lot of references for my dad in here.
              </p>
              <p>This stage can be your warmup but after that, good luck.</p>
            </div>
          )}
        </>
      )}
      {puzzle === 2 && (
        <>
          <img className="page-sun" src="/img/sun.png" alt="Sun" />
          <div className="page-speech" role="status">
            <p>Ah, a riddle, how devastatingly tricky.</p>
          </div>
          <div className="question-box">Who was this puzzle made for?</div>
        </>
      )}
      {puzzle === 3 && (
        <>
          <img className="page-sun" src="/img/sun.png" alt="Sun" />
          <div className="page-speech" role="status">
            <p>
              {allLinesSnapped
                ? 'The answer to puzzle 2 and then the number of lines I have.'
                : "I'm not feeling very put together."}
            </p>
          </div>
          <label className="password-box">
            <span>Password</span>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
            />
          </label>
        </>
      )}
      {puzzle === 4 && (
        <div className="race-track" aria-label="Racing lane">
          <div className="race-verge race-verge--left" aria-hidden="true" />
          <div className="race-verge race-verge--right" aria-hidden="true" />
          <div
            className="race-road"
            style={{ backgroundPositionY: `${raceState.scrollDistance % 14}vh` }}
            aria-hidden="true"
          />

          {raceState.obstacles.map((obstacle) => (
            <span
              key={obstacle.id}
              className="race-obstacle"
              style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%` }}
              aria-hidden="true"
            >
              {obstacle.emoji}
            </span>
          ))}

          <span
            className={`race-kart${raceState.invulnerable ? ' race-kart--hit' : ''}`}
            style={{
              left: `${raceState.player.x}%`,
              top: `${racePlayerY}%`,
              transform: `translate(-50%, -50%) rotate(${90 + raceState.player.lean}deg)`,
            }}
            aria-label="Your kart"
          >
            🏎️
          </span>

          <div className="race-hud" role="status">
            <div className="race-health-bar" aria-label="Your health">
              <div className="race-health-fill" style={{ width: `${raceState.health}%` }} />
            </div>
            <span>{Math.min(100, Math.floor((raceState.elapsed / raceDuration) * 100))}% there</span>
          </div>

          {raceState.status !== 'racing' && (
            <div className="race-result" role="status">
              <p>{raceState.status === 'won' ? 'You won the race!' : 'You crashed!'}</p>
              <button type="button" onClick={resetRace}>
                Race again
              </button>
            </div>
          )}

          <p className="race-instructions">A/D to steer · dodge the obstacles as the road rushes by</p>
        </div>
      )}
      {puzzle === 5 && (
        <>
          <div className="word-search-prompts">
            <p>A spray of water</p>
            <p>An object to plug your guitar into</p>
            <p>A fast food burger without size specification</p>
            <p>A synonym for strong</p>
            <p>A part of a tree</p>
          </div>
          <div className="letter-grid" aria-label="Letter grid">
            {letterGridRows.flatMap((row, rowIndex) =>
              row.split('').map((letter, columnIndex) => (
                <span key={`${rowIndex}-${columnIndex}`}>{letter}</span>
              )),
            )}
          </div>
        </>
      )}
      {puzzle === 6 && (
        <>
          <div className="sine-wave-message" role="status">
            Oh no! Someone damaged my sine wave. I need a real champ to figure out which file
            to repair.
          </div>
          <svg
            className="sine-wave"
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
            role="img"
            aria-label="Sine wave"
          >
            <path d={sineWavePath} />
            {sineWaveMarks.map((mark, index) => (
              <g key={`${mark.x}-${index}`} transform={`translate(${mark.x} ${mark.y})`}>
                <line x1="-9" y1="-9" x2="9" y2="9" />
                <line x1="9" y1="-9" x2="-9" y2="9" />
              </g>
            ))}
          </svg>
          <button
            type="button"
            className="folder-button"
            onClick={() => setShowSineFiles((isVisible) => !isVisible)}
            aria-label={showSineFiles ? 'Close sine files' : 'Open sine files'}
          >
            <i className="folder-icon" aria-hidden="true" />
          </button>
          {showSineFiles && (
            <div className="sine-file-tiles" aria-label="Sine files">
              {sineFiles.map((fileName) => (
                <span key={fileName}>
                  <i className="file-icon" aria-hidden="true" />
                  {fileName}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {puzzle === 8 && (
        <section className="rhythm-game" aria-label="Guitar hero style rhythm game">
          <div className="rhythm-score" role="status">
            <span>Hits: {rhythmScore.hits}</span>
            <span>Misses: {rhythmScore.misses}</span>
          </div>
          <div className="rhythm-field">
            {rhythmLanes.map((lane, laneIndex) => (
              <div key={lane.key} className="rhythm-lane">
                {rhythmNotes
                  .filter((note) => note.lane === laneIndex)
                  .map((note) => (
                    <span
                      key={note.id}
                      className="rhythm-note"
                      style={{ top: `${note.y}%`, background: lane.color }}
                      aria-hidden="true"
                    />
                  ))}
                <div
                  className={`rhythm-target${activeLaneKeys.includes(lane.key) ? ' rhythm-target--active' : ''}`}
                  style={{ top: `${rhythmTargetY}%`, borderColor: lane.color }}
                >
                  {lane.key.toUpperCase()}
                </div>
              </div>
            ))}
            {rhythmResult && (
              <div className="rhythm-result" role="status">
                <p>{rhythmResult.win ? 'You win!' : 'Game over'}</p>
                <p>
                  {rhythmScore.misses} miss{rhythmScore.misses === 1 ? '' : 'es'} (only {rhythmMaxMistakes}{' '}
                  allowed)
                </p>
                {rhythmResult.win && (
                  treasureUnlocked ? (
                    <p className="treasure-message">yay good job puzzle coming lol fu</p>
                  ) : (
                    <>
                      <div className="treasure-box" aria-hidden="true">📦</div>
                      <div className="treasure-code" role="group" aria-label="Enter the 4 letter code">
                        {treasureCode.map((letter, index) => (
                          <input
                            key={index}
                            id={`treasure-slot-${index}`}
                            className="treasure-slot"
                            type="text"
                            inputMode="text"
                            maxLength={1}
                            value={letter}
                            onChange={(event) => handleTreasureCodeChange(index, event.target.value)}
                            onKeyDown={(event) => handleTreasureCodeKeyDown(index, event)}
                            autoComplete="off"
                            autoFocus={index === 0}
                            aria-label={`Code letter ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )
                )}
              </div>
            )}
          </div>
          <p className="rhythm-instructions">Press Z, X, C, V in time with the falling colors as they cross the target line.</p>
        </section>
      )}
      {puzzle === 9 && (
        <>
          <img className="page-sun boat-clue-sun" src="/img/sun.png" alt="Sun" />
          <div className="page-speech boat-clue-speech" role="status">
            <p>
              If only you could find a{' '}
              <span
                draggable="true"
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', 'boat')
                  event.dataTransfer.effectAllowed = 'move'
                }}
              >
                boat
              </span>{' '}
              you could find the treasure.
            </p>
          </div>
          <section
            className={`ocean-window${boatPlaced ? ' ocean-window--ready' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleBoatDrop}
            aria-label="Ocean drop window"
          >
            <div className="sailing-controls" aria-label="Sailing controls">
              <span className="sailing-controls__graphic" aria-hidden="true">
                <span className="sailing-controls__arrow sailing-controls__arrow--up">↑</span>
                <span className="sailing-controls__arrow sailing-controls__arrow--left">←</span>
                <span className="sailing-controls__arrow sailing-controls__arrow--right">→</span>
              </span>
              <span className="sailing-controls__copy">
                <span>w to sail forward</span>
                <span>a/d turn</span>
              </span>
            </div>
            <div
              className="ocean-scene"
              style={{
                transform: `translate(${50 - boatPosition.x}%, ${50 - boatPosition.y}%)`,
              }}
              aria-hidden="true"
            >
              <div className="ocean-sunlight" />
              <div className="ocean-horizon" />
              <div className="ocean-wave ocean-wave-one" />
              <div className="ocean-wave ocean-wave-two" />
              {cannons.map(
                (cannon) =>
                  !cannon.attached && (
                    <span
                      key={cannon.id}
                      className="dropped-boat ocean-cannon"
                      style={{ left: `${cannon.x}%`, top: `${cannon.y}%` }}
                    >
                      cannon
                    </span>
                  ),
              )}
            </div>
            {boatPlaced && (
              <span
                className="dropped-boat"
                style={{
                  transform: `translate(-50%, -50%) rotate(${boatPosition.rotation + 90}deg)`,
                }}
              >
                boat
              </span>
            )}
            {boatPlaced && (
              <span
                className="attached-cannon-position"
                style={{ transform: `translate(-50%, -50%) rotate(${boatPosition.rotation + 90}deg)` }}
              >
                {cannons.map(
                  (cannon, index) =>
                    cannon.attached && (
                      <span
                        key={cannon.id}
                        className="dropped-boat attached-cannon"
                        style={{
                          transform: `translateX(${index === 0 ? -2.1 : 2.1}rem) rotate(-90deg)`,
                        }}
                      >
                        cannon
                      </span>
                    ),
                )}
              </span>
            )}
          </section>
        </>
      )}
      {puzzle === 10 && (
        <div className="shooter-arena" aria-label="Boss hunt arena">
          <div className="shooter-hud">
            <span className="shooter-boss-name">Hunt the final boss</span>
            <div className="shooter-health-bar" aria-label="Your health">
              <div className="shooter-health-fill" style={{ width: `${shooterState.health}%` }} />
            </div>
            <div className="shooter-boss-health-bar" aria-label="Boss health">
              <div className="shooter-boss-health-fill" style={{ width: `${shooterState.boss.health}%` }} />
            </div>
          </div>

          {shooterDungeon.walls.map((wall, index) => (
            <span
              key={`wall-${index}`}
              className="shooter-wall"
              style={{
                left: `${50 + (wall.x - shooterState.player.x) * shooterScale}%`,
                top: `${50 + (wall.y - shooterState.player.y) * shooterScale}%`,
                width: `${wall.width * shooterScale}%`,
                height: `${wall.height * shooterScale}%`,
              }}
              aria-hidden="true"
            />
          ))}

          {shooterDungeon.doors.map((door, index) => (
            <span
              key={`door-${index}`}
              className={`shooter-door shooter-door--${door.orientation}`}
              style={{
                left: `${50 + (door.x - shooterState.player.x) * shooterScale}%`,
                top: `${50 + (door.y - shooterState.player.y) * shooterScale}%`,
                width: `${door.width * shooterScale}%`,
                height: `${door.height * shooterScale}%`,
              }}
              aria-hidden="true"
            />
          ))}

          {shooterState.enemies.map((enemy) => (
            <span
              key={enemy.id}
              className={`shooter-enemy shooter-enemy--${enemy.type}`}
              style={{
                left: `${50 + (enemy.x - shooterState.player.x) * shooterScale}%`,
                top: `${50 + (enemy.y - shooterState.player.y) * shooterScale}%`,
              }}
              aria-hidden="true"
            >
              {enemy.type === 'pickle' ? '🥒' : '🦶'}
            </span>
          ))}

          {shooterState.boss.health > 0 && (
            <span
              className="shooter-boss"
              style={{
                left: `${50 + (shooterState.boss.x - shooterState.player.x) * shooterScale}%`,
                top: `${50 + (shooterState.boss.y - shooterState.player.y) * shooterScale}%`,
              }}
              aria-hidden="true"
            >
              🧺
            </span>
          )}

          {shooterState.bullets.map((bullet) => (
            <span
              key={bullet.id}
              className="shooter-bullet"
              style={{
                left: `${50 + (bullet.x - shooterState.player.x) * shooterScale}%`,
                top: `${50 + (bullet.y - shooterState.player.y) * shooterScale}%`,
              }}
              aria-hidden="true"
            />
          ))}

          <div
            className={`shooter-player${shooterState.invulnerable ? ' shooter-player--hit' : ''}`}
            aria-label="Your character"
          />

          {shooterState.status !== 'playing' && (
            <div className="shooter-result" role="status">
              <p>{shooterState.status === 'won' ? 'You slew the final boss!' : 'You have been defeated.'}</p>
              {shooterState.status === 'lost' && (
                <button type="button" onClick={resetShooter}>
                  Try again
                </button>
              )}
              {shooterState.status === 'won' &&
                (shooterSolved ? (
                  <p className="treasure-message">nice you did it</p>
                ) : (
                  <div className="treasure-code" role="group" aria-label="Enter the 4 letter code">
                    {shooterCode.map((letter, index) => (
                      <input
                        key={index}
                        id={`shooter-slot-${index}`}
                        className="treasure-slot"
                        type="text"
                        inputMode="text"
                        maxLength={1}
                        value={letter}
                        onChange={(event) => handleShooterCodeChange(index, event.target.value)}
                        onKeyDown={(event) => handleShooterCodeKeyDown(index, event)}
                        autoComplete="off"
                        autoFocus={index === 0}
                        aria-label={`Code letter ${index + 1}`}
                      />
                    ))}
                  </div>
                ))}
            </div>
          )}

          <p className="shooter-instructions">
            WASD to move · aim with your mouse · space to shoot · find and slay the final boss
          </p>
        </div>
      )}
      {puzzle === 11 && (
        <div className={`encounter-arena encounter-arena--${encounterState.stage}`}>
          <div className="encounter-hud">
            <span className="encounter-boss-name">EXTRA RAID PRACTICE</span>
            <div className="encounter-health-bar" aria-label="Boss encounter health">
              <div className="encounter-health-fill" style={{ width: `${encounterState.health}%` }} />
            </div>
            <span className="encounter-timer">
              Survive:{' '}
              {Math.max(
                0,
                Math.ceil(
                  ((encounterState.stage === 'heigan' ? heiganDuration : thaddiusDuration) -
                    encounterState.elapsed) /
                    1000,
                ),
              )}
              s
            </span>
          </div>

          {encounterState.stage === 'heigan' && (
            <div className="heigan-floor" aria-hidden="true">
              {Array.from({ length: heiganColumnCount }, (_, column) => {
                const unsafe = encounterState.heiganUnsafeColumns.includes(column)
                const columnState = unsafe ? encounterState.heiganEruptState : 'safe'

                return (
                  <span
                    key={column}
                    className={`heigan-column heigan-column--${columnState}`}
                    style={{ left: `${(column * 100) / heiganColumnCount}%`, width: `${100 / heiganColumnCount}%` }}
                  />
                )
              })}
            </div>
          )}

          {encounterState.stage === 'thaddius' && (
            <div className="thaddius-room" aria-hidden="true">
              {['left', 'right'].map((side) => {
                const zoneCharge = side === encounterState.thaddiusPositiveSide ? 'positive' : 'negative'

                return (
                  <span
                    key={side}
                    className={`thaddius-zone thaddius-zone--${zoneCharge}${
                      encounterState.thaddiusWarning ? ' thaddius-zone--warning' : ''
                    }`}
                  />
                )
              })}
              {encounterState.thaddiusOrbs.map((orb) => (
                <span key={orb.id} className="thaddius-orb" style={{ left: `${orb.x}%`, top: `${orb.y}%` }} />
              ))}
            </div>
          )}

          <div
            className={`encounter-player${encounterState.invulnerable ? ' encounter-player--hit' : ''}${
              encounterState.stage === 'thaddius' ? ` encounter-player--${encounterState.thaddiusCharge}` : ''
            }`}
            style={{ left: `${encounterState.player.x}%`, top: `${encounterState.player.y}%` }}
            aria-label="Your character"
          />

          {encounterState.status !== 'playing' && (
            <div className="encounter-result" role="status">
              <p>{encounterState.status === 'won' ? "You're the real boss" : 'You have been defeated.'}</p>
              {encounterState.status === 'lost' && (
                <button type="button" onClick={resetEncounter}>
                  Try again
                </button>
              )}
              {encounterState.status === 'won' &&
                (encounterSolved ? (
                  <p className="treasure-message">yay you did it</p>
                ) : (
                  <div className="encounter-code" role="group" aria-label="Enter the two boss names">
                    {encounterCode.map((letter, index) => (
                      <Fragment key={index}>
                        {index === 6 && <span className="encounter-code-ampersand">&amp;</span>}
                        <input
                          id={`encounter-slot-${index}`}
                          className="treasure-slot"
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          value={letter}
                          onChange={(event) => handleEncounterCodeChange(index, event.target.value)}
                          onKeyDown={(event) => handleEncounterCodeKeyDown(index, event)}
                          autoComplete="off"
                          autoFocus={index === 0}
                          aria-label={`Code letter ${index + 1}`}
                        />
                      </Fragment>
                    ))}
                  </div>
                ))}
            </div>
          )}

          <p className="encounter-instructions">
            {encounterState.stage === 'heigan'
              ? 'WASD to move - survive this deadly dance'
              : 'WASD to move \u00b7 get to your polarity\u2019s side of the room before the shift, and dodge the ball lightning'}
          </p>
        </div>
      )}
      {!isGridPage && <nav className="puzzle-navigation" aria-label="Puzzle navigation">
        <button
          type="button"
          className="back-button"
          onClick={() => setPuzzle((current) => current - 1)}
          disabled={puzzle === 1}
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <button
          type="button"
          className="next-button"
          onClick={() => setPuzzle((current) => current + 1)}
          disabled={puzzle === 3 && password !== 'dad8'}
        >
          Next <span aria-hidden="true">→</span>
        </button>
      </nav>}
      {isGridPage && (
        <nav className="grid-navigation" aria-label="Grid page navigation">
          <button type="button" className="grid-arrow grid-arrow-left" onClick={() => moveThroughGrid('left')} disabled={gridColumn === 0 && puzzle !== 4} aria-label="Move left">←</button>
          <button type="button" className="grid-arrow grid-arrow-right" onClick={() => moveThroughGrid('right')} disabled={gridColumn === 2} aria-label="Move right">→</button>
          <button type="button" className="grid-arrow grid-arrow-up" onClick={() => moveThroughGrid('up')} disabled={gridRow === 0} aria-label="Move up">↑</button>
          <button type="button" className="grid-arrow grid-arrow-down" onClick={() => moveThroughGrid('down')} disabled={gridRow === 2} aria-label="Move down">↓</button>
        </nav>
      )}
    </main>
  )
}

export default App
