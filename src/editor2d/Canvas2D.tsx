import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text, Group, Arrow } from 'react-konva'
import type Konva from 'konva'
import { useDesignStore } from '../store/design'
import { snapPoint, wallLength, wallAngle } from '../geometry/walls'
import { CATALOG_MAP } from '../geometry/catalog'
import type { Vec2 } from '../store/types'

const PX_PER_CM = 1   // at scale=1, 1 cm = 1 px
const MINOR_CM = 5    // minor grid spacing (cm) — matches snap step
const MAJOR_CM = 50   // major grid spacing (cm)

function pxToCm(px: number, scale: number): number {
  return px / (PX_PER_CM * scale)
}

function cmToPx(cm: number, scale: number): number {
  return cm * PX_PER_CM * scale
}

function stagePosToCm(stageX: number, stageY: number, offset: Vec2, scale: number): Vec2 {
  return {
    x: pxToCm(stageX - offset.x, scale),
    y: pxToCm(stageY - offset.y, scale),
  }
}

function cmToStagePos(cm: Vec2, offset: Vec2, scale: number): { x: number; y: number } {
  return {
    x: cmToPx(cm.x, scale) + offset.x,
    y: cmToPx(cm.y, scale) + offset.y,
  }
}

export function Canvas2D({ width, height }: { width: number; height: number }) {
  const {
    design, activeTool, selectedId, snapEnabled, gridSize,
    setSelected, addWall, moveWallEndpoint, deleteWall, deleteOpening,
    addFurniture, moveFurniture, deleteFurniture, rotateFurniture, setActiveTool,
  } = useDesignStore()

  const stageRef = useRef<Konva.Stage>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Vec2>({ x: width / 2, y: height / 2 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ mouse: Vec2; offset: Vec2 } | null>(null)

  // Wall drawing state
  const [drawStart, setDrawStart] = useState<Vec2 | null>(null)
  const [mousePos, setMousePos] = useState<Vec2>({ x: 0, y: 0 })

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') setActiveTool('wall')
      if (e.key === 'v' || e.key === 'V') setActiveTool('select')
      if (e.key === 'Escape') {
        setActiveTool('select')
        setDrawStart(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if (design.walls.some(w => w.id === selectedId)) deleteWall(selectedId)
        else if (design.furniture.some(f => f.id === selectedId)) deleteFurniture(selectedId)
        else if (design.openings.some(o => o.id === selectedId)) deleteOpening(selectedId)
      }
      if ((e.key === 'r' || e.key === 'R') && selectedId) {
        const isFurniture = design.furniture.some(f => f.id === selectedId)
        if (isFurniture) rotateFurniture(selectedId, Math.PI / 2)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, design, setActiveTool, deleteWall, deleteFurniture, rotateFurniture])

  const getStageMousePos = useCallback((): Vec2 => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    return pos ?? { x: 0, y: 0 }
  }, [])

  const getSnappedCmPos = useCallback((stagePos: Vec2): Vec2 => {
    const cm = stagePosToCm(stagePos.x, stagePos.y, offset, scale)
    return snapEnabled ? snapPoint(cm, design.walls, gridSize) : cm
  }, [offset, scale, snapEnabled, design.walls, gridSize])

  // Zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const scaleBy = 1.08
    const stage = stageRef.current!
    const pointer = stage.getPointerPosition()!
    const oldScale = scale
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clamped = Math.max(0.3, Math.min(5, newScale))

    // Zoom toward pointer
    const mousePointTo = {
      x: (pointer.x - offset.x) / oldScale,
      y: (pointer.y - offset.y) / oldScale,
    }
    setOffset({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    })
    setScale(clamped)
  }, [scale, offset])

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getStageMousePos()

    // Middle mouse or right click = pan
    if (e.evt.button === 1 || e.evt.button === 2) {
      setIsPanning(true)
      setPanStart({ mouse: pos, offset: { ...offset } })
      return
    }

    if (activeTool === 'wall') {
      const cm = getSnappedCmPos(pos)
      if (!drawStart) {
        setDrawStart(cm)
      } else {
        // Commit wall
        addWall(drawStart, cm)
        // Continue from this point (chaining)
        setDrawStart(cm)
      }
    } else {
      // Select tool: clicking background deselects
      const target = e.target
      const stage = stageRef.current
      if (target === stage || target.name() === 'grid' || target.name() === 'floor') {
        setSelected(null)
      }
    }
  }, [activeTool, drawStart, getStageMousePos, getSnappedCmPos, addWall, offset, setSelected])

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getStageMousePos()

    if (isPanning && panStart) {
      setOffset({
        x: panStart.offset.x + (pos.x - panStart.mouse.x),
        y: panStart.offset.y + (pos.y - panStart.mouse.y),
      })
      return
    }

    const cm = getSnappedCmPos(pos)
    setMousePos(cm)
  }, [isPanning, panStart, getStageMousePos, getSnappedCmPos])

  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || e.evt.button === 2) {
      setIsPanning(false)
      setPanStart(null)
    }
  }, [])

  const handleDblClick = useCallback(() => {
    if (activeTool === 'wall') {
      setDrawStart(null)
      setActiveTool('select')
    }
  }, [activeTool, setActiveTool])

  // Drag-from-palette drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('furniture-kind') as Parameters<typeof addFurniture>[0]
    if (!kind) return
    const stage = stageRef.current
    if (!stage) return
    const stageBox = stage.container().getBoundingClientRect()
    const stagePos = {
      x: e.clientX - stageBox.left,
      y: e.clientY - stageBox.top,
    }
    const cm = stagePosToCm(stagePos.x, stagePos.y, offset, scale)
    const snapped = snapEnabled
      ? { x: Math.round(cm.x / gridSize) * gridSize, y: Math.round(cm.y / gridSize) * gridSize }
      : cm
    addFurniture(kind, snapped)
  }, [addFurniture, offset, scale, snapEnabled, gridSize])

  // Adaptive grid: minor lines every MINOR_CM, major every MAJOR_CM.
  // Skips a tier when it would be denser than ~6px to stay readable + fast.
  const gridLines = () => {
    const lines: React.ReactNode[] = []
    const minX = pxToCm(-offset.x, scale)
    const maxX = pxToCm(width - offset.x, scale)
    const minY = pxToCm(-offset.y, scale)
    const maxY = pxToCm(height - offset.y, scale)

    const drawTier = (stepCm: number, color: string, key: string) => {
      if (cmToPx(stepCm, scale) < 6) return // too dense, skip this tier
      const x0 = Math.floor(minX / stepCm) * stepCm
      for (let cx = x0; cx <= maxX; cx += stepCm) {
        const sx = cmToPx(cx, scale) + offset.x
        lines.push(
          <Line key={`${key}v${cx}`} name="grid" points={[sx, 0, sx, height]} stroke={color} strokeWidth={1} listening={false} />
        )
      }
      const y0 = Math.floor(minY / stepCm) * stepCm
      for (let cy = y0; cy <= maxY; cy += stepCm) {
        const sy = cmToPx(cy, scale) + offset.y
        lines.push(
          <Line key={`${key}h${cy}`} name="grid" points={[0, sy, width, sy]} stroke={color} strokeWidth={1} listening={false} />
        )
      }
    }

    drawTier(MINOR_CM, '#21212e', 'min')
    drawTier(MAJOR_CM, '#333346', 'maj')
    return lines
  }

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ cursor: activeTool === 'wall' ? 'crosshair' : isPanning ? 'grabbing' : 'default' }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleDblClick}
        onContextMenu={e => e.evt.preventDefault()}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          <Rect name="floor" x={0} y={0} width={width} height={height} fill="#12121e" />
          {gridLines()}
        </Layer>

        {/* Walls layer */}
        <Layer>
          {design.walls.map(wall => {
            const ap = cmToStagePos(wall.a, offset, scale)
            const bp = cmToStagePos(wall.b, offset, scale)
            const isSelected = selectedId === wall.id
            const len = wallLength(wall)
            const midX = (ap.x + bp.x) / 2
            const midY = (ap.y + bp.y) / 2

            return (
              <Group key={wall.id}>
                <Line
                  points={[ap.x, ap.y, bp.x, bp.y]}
                  stroke={isSelected ? '#60a5fa' : '#94a3b8'}
                  strokeWidth={Math.max(2, cmToPx(wall.thickness, scale))}
                  lineCap="square"
                  onClick={() => setSelected(wall.id)}
                  onTap={() => setSelected(wall.id)}
                />
                {/* Endpoint handles */}
                {isSelected && ['a', 'b'].map(ep => {
                  const pos = ep === 'a' ? ap : bp
                  return (
                    <Circle
                      key={ep}
                      x={pos.x}
                      y={pos.y}
                      radius={6}
                      fill="#60a5fa"
                      stroke="#fff"
                      strokeWidth={1.5}
                      draggable
                      onDragMove={de => {
                        const np = stagePosToCm(de.target.x(), de.target.y(), offset, scale)
                        const snapped = snapEnabled ? snapPoint(np, design.walls, gridSize) : np
                        moveWallEndpoint(wall.id, ep as 'a' | 'b', snapped)
                        de.target.x(cmToStagePos(snapped, offset, scale).x)
                        de.target.y(cmToStagePos(snapped, offset, scale).y)
                      }}
                    />
                  )
                })}
                {/* Length label */}
                {scale > 0.5 && (
                  <Text
                    x={midX}
                    y={midY - 12}
                    text={`${Math.round(len)} cm`}
                    fontSize={10}
                    fill={isSelected ? '#93c5fd' : '#64748b'}
                    align="center"
                    offsetX={20}
                    listening={false}
                  />
                )}

                {/* Openings (doors/windows) drawn along this wall */}
                {design.openings
                  .filter(o => o.wallId === wall.id)
                  .map(op => {
                    const opSeleted = selectedId === op.id
                    const wallT = Math.max(4, cmToPx(wall.thickness, scale))
                    const opOffPx = cmToPx(op.offset, scale)
                    const opWPx = cmToPx(op.width, scale)
                    const isDoor = op.type === 'door'
                    return (
                      <Group
                        key={op.id}
                        x={ap.x}
                        y={ap.y}
                        rotation={(wallAngle(wall) * 180) / Math.PI}
                        onClick={e => { e.cancelBubble = true; setSelected(op.id) }}
                      >
                        {/* White gap over wall */}
                        <Rect
                          x={opOffPx}
                          y={-wallT / 2}
                          width={opWPx}
                          height={wallT}
                          fill={opSeleted ? '#dbeafe' : '#f8fafc'}
                          stroke={opSeleted ? '#3b82f6' : '#94a3b8'}
                          strokeWidth={1}
                        />
                        {isDoor ? (
                          /* Door: quarter-circle arc representing swing */
                          <Line
                            points={[opOffPx, -wallT / 2, opOffPx, -wallT / 2 - opWPx * 0.85]}
                            stroke={opSeleted ? '#3b82f6' : '#64748b'}
                            strokeWidth={1}
                            listening={false}
                          />
                        ) : (
                          /* Window: three lines across gap */
                          [0.25, 0.5, 0.75].map(t => (
                            <Line
                              key={t}
                              points={[
                                opOffPx + opWPx * t, -wallT / 2,
                                opOffPx + opWPx * t, wallT / 2,
                              ]}
                              stroke={opSeleted ? '#3b82f6' : '#64748b'}
                              strokeWidth={1}
                              listening={false}
                            />
                          ))
                        )}
                      </Group>
                    )
                  })}
              </Group>
            )
          })}

          {/* Wall preview while drawing */}
          {activeTool === 'wall' && drawStart && (
            <Arrow
              points={[
                cmToStagePos(drawStart, offset, scale).x,
                cmToStagePos(drawStart, offset, scale).y,
                cmToStagePos(mousePos, offset, scale).x,
                cmToStagePos(mousePos, offset, scale).y,
              ]}
              stroke="#60a5fa"
              strokeWidth={3}
              fill="#60a5fa"
              dash={[8, 4]}
              listening={false}
            />
          )}
        </Layer>

        {/* Furniture layer */}
        <Layer>
          {design.furniture.map(f => {
            const cat = CATALOG_MAP[f.kind]
            const cx = cmToStagePos({ x: f.position.x + f.size.w / 2, y: f.position.y + f.size.d / 2 }, offset, scale)
            const pw = cmToPx(f.size.w, scale)
            const pd = cmToPx(f.size.d, scale)
            const isSelected = selectedId === f.id

            return (
              <Group
                key={f.id}
                x={cx.x}
                y={cx.y}
                rotation={(f.rotation * 180) / Math.PI}
                draggable={activeTool === 'select'}
                onMouseDown={e => { e.cancelBubble = true; setSelected(f.id) }}
                onTap={e => { e.cancelBubble = true; setSelected(f.id) }}
                onClick={e => { e.cancelBubble = true; setSelected(f.id) }}
                onDragStart={e => { e.cancelBubble = true; setSelected(f.id) }}
                onDragMove={e => {
                  e.cancelBubble = true
                  const node = e.target
                  // node x/y is the group center in stage px
                  const center = stagePosToCm(node.x(), node.y(), offset, scale)
                  let topLeft = { x: center.x - f.size.w / 2, y: center.y - f.size.d / 2 }
                  if (snapEnabled) {
                    topLeft = {
                      x: Math.round(topLeft.x / gridSize) * gridSize,
                      y: Math.round(topLeft.y / gridSize) * gridSize,
                    }
                    // keep the Konva node in sync with the snapped position
                    const snappedCenter = cmToStagePos(
                      { x: topLeft.x + f.size.w / 2, y: topLeft.y + f.size.d / 2 },
                      offset,
                      scale
                    )
                    node.position(snappedCenter)
                  }
                  moveFurniture(f.id, topLeft)
                }}
              >
                <Rect
                  x={-pw / 2}
                  y={-pd / 2}
                  width={pw}
                  height={pd}
                  fill={f.color ?? cat.color}
                  opacity={0.85}
                  stroke={isSelected ? '#60a5fa' : '#fff'}
                  strokeWidth={isSelected ? 2 : 0.5}
                  cornerRadius={3}
                />
                {scale > 0.6 && (
                  <Text
                    x={-pw / 2}
                    y={-pd / 2}
                    width={pw}
                    height={pd}
                    text={`${cat.icon}\n${cat.label}`}
                    fontSize={Math.max(9, Math.min(14, pw / 6))}
                    fill="#fff"
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
                )}
              </Group>
            )
          })}
        </Layer>
      </Stage>

      {/* Hint overlays */}
      {design.walls.length === 0 && design.furniture.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-3">🏠</div>
            <div className="text-sm">Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 text-xs">W</kbd> and click to draw walls</div>
            <div className="text-xs mt-1 text-gray-700">Double-click or Esc to stop drawing</div>
          </div>
        </div>
      )}

      {activeTool === 'wall' && drawStart && (() => {
        const lenCm = Math.hypot(mousePos.x - drawStart.x, mousePos.y - drawStart.y)
        const mid = cmToStagePos(
          { x: (drawStart.x + mousePos.x) / 2, y: (drawStart.y + mousePos.y) / 2 },
          offset,
          scale
        )
        return (
          <>
            {/* Big live length readout near the cursor */}
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white font-bold rounded-lg px-3 py-1 shadow-lg tabular-nums"
              style={{ left: mid.x, top: mid.y - 28, fontSize: 22 }}
            >
              {Math.round(lenCm)} cm
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-blue-300 text-xs px-3 py-1.5 rounded-full border border-gray-700 pointer-events-none">
              Click to add point · Double-click or Esc to finish
            </div>
          </>
        )
      })()}

      <div className="absolute bottom-2 right-3 text-[10px] text-gray-700 pointer-events-none">
        {Math.round(scale * 100)}% · Scroll to zoom · Middle-drag to pan
      </div>
    </div>
  )
}
