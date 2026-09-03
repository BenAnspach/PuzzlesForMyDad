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
        </>
      )}
      <nav className="puzzle-navigation" aria-label="Puzzle navigation">
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
          onClick={() => setPuzzle((current) => (current % 3) + 1)}
        >
          Next <span aria-hidden="true">→</span>
        </button>
      </nav>
    </main>
  )
}

export default App
