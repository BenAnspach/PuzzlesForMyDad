import { useEffect, useState } from 'react'
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

function App() {
  const [puzzle, setPuzzle] = useState(1)
  const [lines, setLines] = useState(initialLines)
  const [draggingLine, setDraggingLine] = useState(null)
  const [password, setPassword] = useState('')
  const [showSineFiles, setShowSineFiles] = useState(false)
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
      {puzzle === 9 && (
        <>
          <img className="page-sun boat-clue-sun" src="/img/sun.png" alt="Sun" />
          <div className="page-speech boat-clue-speech" role="status">
            <p>If only you could find a boat you could find the treasure.</p>
          </div>
        </>
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
