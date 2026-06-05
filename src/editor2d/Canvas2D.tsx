import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text, Group, Arrow } from 'react-konva'
import type Konva from 'konva'
import { useDesignStore, useActiveFloor } from '../store/design'
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
    design, activeFloorId, activeTool, selectedId, selectedIds, snapEnabled, gridSize,
    setSelected, setSelectedIds, toggleSelected,
    addWall, moveWallEndpoint, deleteWall, deleteOpening,
    addFurniture, moveFurniture, deleteFurniture, rotateFurniture, setActiveTool,
    duplicateFurniture, nudgeFurniture, copySelection, pasteClipboard,
  } = useDesignStore()

  const floor = useActiveFloor()
  // Walls of the floor directly below, shown faintly so rooms can be aligned.
  const ghostWalls = (() => {
    const idx = design.floors.findIndex(f => f.id === activeFloorId)
    return idx > 0 ? design.floors[idx - 1].walls : []
  })()

  const stageRef = useRef<Konva.Stage>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Vec2>({ x: width / 2, y: height / 2 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ mouse: Vec2; offset: Vec2 } | null>(null)

  // Wall drawing state
  const [drawStart, setDrawStart] = useState<Vec2 | null>(null)
  const [mousePos, setMousePos] = useState<Vec2>({ x: 0, y: 0 })

  // Measurement tool — toggle with M, click two points to read the distance
  const [measureMode, setMeasureMode] = useState(false)
  const [measureStart, setMeasureStart] = useState<Vec2 | null>(null)

  // Marquee (rubber-band) selection — drag on empty space with select tool
  const [marquee, setMarquee] = useState<{ a: Vec2; b: Vec2 } | null>(null)

  /** Frame all walls + furniture on the active floor with padding. */
  const fitToView = useCallback(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const wl of floor.walls) {
      minX = Math.min(minX, wl.a.x, wl.b.x); maxX = Math.max(maxX, wl.a.x, wl.b.x)
      minY = Math.min(minY, wl.a.y, wl.b.y); maxY = Math.max(maxY, wl.a.y, wl.b.y)
    }
    for (const fr of floor.furniture) {
      minX = Math.min(minX, fr.position.x); maxX = Math.max(maxX, fr.position.x + fr.size.w)
      minY = Math.min(minY, fr.position.y); maxY = Math.max(maxY, fr.position.y + fr.size.d)
    }
    if (!isFinite(minX)) return
    const pad = 60
    const nextScale = Math.min(width / ((maxX - minX) + pad * 2), height / ((maxY - minY) + pad * 2), 5)
    const clamped = Math.max(0.3, nextScale)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    setScale(clamped)
    setOffset({ x: width / 2 - cx * clamped, y: height / 2 - cy * clamped })
  }, [floor, width, height])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const ctrl = e.ctrlKey || e.metaKey
      // Resolve furniture selection (single or multi) against the active floor.
      const selFurnIds = selectedIds.filter(id => floor.furniture.some(f => f.id === id))
      const hasFurnSel = selFurnIds.length > 0

      // Ctrl+D / Ctrl+C / Ctrl+V
      if (ctrl && (e.key === 'd' || e.key === 'D') && hasFurnSel) {
        e.preventDefault()
        selFurnIds.forEach(id => duplicateFurniture(id))
        return
      }
      if (ctrl && (e.key === 'c' || e.key === 'C') && hasFurnSel) {
        e.preventDefault()
        copySelection()
        return
      }
      if (ctrl && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        pasteClipboard()
        return
      }
      if (ctrl) return // leave other Ctrl combos (undo/redo) to the global handler

      if (e.key === 'w' || e.key === 'W') setActiveTool('wall')
      if (e.key === 'v' || e.key === 'V') setActiveTool('select')
      if (e.key === 'f' || e.key === 'F') fitToView()
      if (e.key === 'm' || e.key === 'M') {
        setMeasureMode(prev => {
          if (prev) setMeasureStart(null)
          return !prev
        })
        setActiveTool('select')
      }
      if (e.key === 'Escape') {
        setActiveTool('select')
        setDrawStart(null)
        setMeasureMode(false); setMeasureStart(null)
        setMarquee(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        if (floor.walls.some(w => w.id === selectedId)) deleteWall(selectedId)
        else if (hasFurnSel) selFurnIds.forEach(id => deleteFurniture(id))
        else if (floor.openings.some(o => o.id === selectedId)) deleteOpening(selectedId)
      }
      if ((e.key === 'r' || e.key === 'R') && hasFurnSel) {
        selFurnIds.forEach(id => rotateFurniture(id, Math.PI / 2))
      }
      // Arrow-key nudge for selected furniture (all in multi-selection)
      if (hasFurnSel && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = snapEnabled ? gridSize : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        if (dx || dy) selFurnIds.forEach(id => nudgeFurniture(id, dx, dy))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // floor.walls/furniture/openings are read via `floor` (a closure on the active floor) — re-binding on every tiny change is undesirable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedIds, snapEnabled, gridSize, mousePos, fitToView, setActiveTool, deleteWall, deleteFurniture, deleteOpening, rotateFurniture, duplicateFurniture, nudgeFurniture, copySelection, pasteClipboard])

  const getStageMousePos = useCallback((): Vec2 => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    return pos ?? { x: 0, y: 0 }
  }, [])

  const getSnappedCmPos = useCallback((stagePos: Vec2): Vec2 => {
    const cm = stagePosToCm(stagePos.x, stagePos.y, offset, scale)
    return snapEnabled ? snapPoint(cm, floor.walls, gridSize) : cm
  }, [offset, scale, snapEnabled, floor.walls, gridSize])

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

    // Measurement mode swallows clicks before tool/selection logic.
    if (measureMode) {
      const cm = getSnappedCmPos(pos)
      if (!measureStart) setMeasureStart(cm)
      else setMeasureStart(null) // 2nd click clears (esc-or-click-again to restart)
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
      // Select tool: clicking background starts a marquee selection.
      const target = e.target
      const stage = stageRef.current
      if (target === stage || target.name() === 'grid' || target.name() === 'floor') {
        const cm = stagePosToCm(pos.x, pos.y, offset, scale)
        setMarquee({ a: cm, b: cm })
        if (!e.evt.shiftKey) setSelected(null)
      }
    }
  }, [activeTool, drawStart, measureMode, measureStart, getStageMousePos, getSnappedCmPos, addWall, offset, scale, setSelected])

  const handleStageMouseMove = useCallback(() => {
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

    // Marquee drag — update its second corner with raw (un-snapped) cm position.
    if (marquee) {
      const rawCm = stagePosToCm(pos.x, pos.y, offset, scale)
      setMarquee({ a: marquee.a, b: rawCm })
    }
  }, [isPanning, panStart, marquee, offset, scale, getStageMousePos, getSnappedCmPos])

  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || e.evt.button === 2) {
      setIsPanning(false)
      setPanStart(null)
    }
    // Commit marquee selection on left-up. Anything bigger than a tiny click counts.
    if (marquee && e.evt.button === 0) {
      const dx = marquee.b.x - marquee.a.x
      const dy = marquee.b.y - marquee.a.y
      if (Math.hypot(dx, dy) > 4) {
        const minX = Math.min(marquee.a.x, marquee.b.x)
        const maxX = Math.max(marquee.a.x, marquee.b.x)
        const minY = Math.min(marquee.a.y, marquee.b.y)
        const maxY = Math.max(marquee.a.y, marquee.b.y)
        const hits = floor.furniture.filter(f => {
          // Treat furniture as enclosed if its footprint is fully inside the marquee.
          return f.position.x >= minX
            && f.position.y >= minY
            && f.position.x + f.size.w <= maxX
            && f.position.y + f.size.d <= maxY
        }).map(f => f.id)
        if (e.evt.shiftKey) {
          // Merge with current selection.
          const merged = Array.from(new Set([...selectedIds, ...hits]))
          setSelectedIds(merged)
        } else {
          setSelectedIds(hits)
        }
      }
      setMarquee(null)
    }
  }, [marquee, floor.furniture, selectedIds, setSelectedIds])

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

        {/* Ghost of the floor below, to help align rooms */}
        {ghostWalls.length > 0 && (
          <Layer listening={false}>
            {ghostWalls.map(gw => {
              const ap = cmToStagePos(gw.a, offset, scale)
              const bp = cmToStagePos(gw.b, offset, scale)
              return (
                <Line
                  key={`ghost-${gw.id}`}
                  points={[ap.x, ap.y, bp.x, bp.y]}
                  stroke="#3b4252"
                  strokeWidth={Math.max(1, cmToPx(gw.thickness, scale))}
                  lineCap="square"
                  dash={[6, 6]}
                />
              )
            })}
          </Layer>
        )}

        {/* Walls layer */}
        <Layer>
          {floor.walls.map(wall => {
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
                        const snapped = snapEnabled ? snapPoint(np, floor.walls, gridSize) : np
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
                {floor.openings
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
          {floor.furniture.map(f => {
            const cat = CATALOG_MAP[f.kind]
            const cx = cmToStagePos({ x: f.position.x + f.size.w / 2, y: f.position.y + f.size.d / 2 }, offset, scale)
            const pw = cmToPx(f.size.w, scale)
            const pd = cmToPx(f.size.d, scale)
            const isPrimary = selectedId === f.id
            const isInMulti = selectedIds.includes(f.id)
            const handleSelect = (shift: boolean) => {
              if (shift) toggleSelected(f.id)
              else setSelected(f.id)
            }

            return (
              <Group
                key={f.id}
                x={cx.x}
                y={cx.y}
                rotation={(f.rotation * 180) / Math.PI}
                draggable={activeTool === 'select'}
                onMouseDown={e => { e.cancelBubble = true; handleSelect(e.evt.shiftKey) }}
                onTap={e => { e.cancelBubble = true; handleSelect(false) }}
                onClick={e => { e.cancelBubble = true; handleSelect(e.evt.shiftKey) }}
                onDragStart={e => { e.cancelBubble = true }}
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
                    const snappedCenter = cmToStagePos(
                      { x: topLeft.x + f.size.w / 2, y: topLeft.y + f.size.d / 2 },
                      offset,
                      scale
                    )
                    node.position(snappedCenter)
                  }
                  // Group-drag: when multiple are selected and the dragged one is part of it,
                  // nudge the others by the same delta.
                  const dx = topLeft.x - f.position.x
                  const dy = topLeft.y - f.position.y
                  if (selectedIds.length > 1 && selectedIds.includes(f.id)) {
                    selectedIds.forEach(id => {
                      const other = floor.furniture.find(x => x.id === id)
                      if (!other) return
                      if (id === f.id) moveFurniture(id, topLeft)
                      else moveFurniture(id, { x: other.position.x + dx, y: other.position.y + dy })
                    })
                  } else {
                    moveFurniture(f.id, topLeft)
                  }
                }}
              >
                <Rect
                  x={-pw / 2}
                  y={-pd / 2}
                  width={pw}
                  height={pd}
                  fill={f.color ?? cat.color}
                  opacity={0.85}
                  stroke={isPrimary ? '#60a5fa' : isInMulti ? '#3b82f6' : '#fff'}
                  strokeWidth={isPrimary || isInMulti ? 2 : 0.5}
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

        {/* Marquee + measurement overlay */}
        <Layer listening={false}>
          {marquee && (() => {
            const a = cmToStagePos(marquee.a, offset, scale)
            const b = cmToStagePos(marquee.b, offset, scale)
            return (
              <Rect
                x={Math.min(a.x, b.x)}
                y={Math.min(a.y, b.y)}
                width={Math.abs(b.x - a.x)}
                height={Math.abs(b.y - a.y)}
                fill="#60a5fa"
                opacity={0.15}
                stroke="#60a5fa"
                strokeWidth={1}
                dash={[4, 4]}
              />
            )
          })()}

          {measureMode && measureStart && (() => {
            const a = cmToStagePos(measureStart, offset, scale)
            const b = cmToStagePos(mousePos, offset, scale)
            return (
              <>
                <Line points={[a.x, a.y, b.x, b.y]} stroke="#f97316" strokeWidth={2} dash={[6, 4]} />
                <Circle x={a.x} y={a.y} radius={4} fill="#f97316" />
                <Circle x={b.x} y={b.y} radius={4} fill="#f97316" />
              </>
            )
          })()}
        </Layer>
      </Stage>

      {/* Hint overlays */}
      {floor.walls.length === 0 && floor.furniture.length === 0 && (
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

      {/* Measurement readout */}
      {measureMode && measureStart && (() => {
        const distCm = Math.hypot(mousePos.x - measureStart.x, mousePos.y - measureStart.y)
        const mid = cmToStagePos(
          { x: (measureStart.x + mousePos.x) / 2, y: (measureStart.y + mousePos.y) / 2 },
          offset, scale,
        )
        return (
          <>
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white font-bold rounded-lg px-3 py-1 shadow-lg tabular-nums"
              style={{ left: mid.x, top: mid.y - 28, fontSize: 18 }}
            >
              {distCm < 100 ? `${Math.round(distCm)} cm` : `${(distCm / 100).toFixed(2)} m`}
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-orange-300 text-xs px-3 py-1.5 rounded-full border border-gray-700 pointer-events-none">
              📏 Measuring · Click two points · Esc or M to exit
            </div>
          </>
        )
      })()}

      {/* Fit to view button (only when there's something to fit) */}
      {(floor.walls.length > 0 || floor.furniture.length > 0) && (
        <button
          onClick={fitToView}
          title="Fit to view (F)"
          className="absolute top-2 right-3 px-2 py-1 text-xs bg-gray-800/90 text-gray-300 hover:bg-gray-700 rounded-lg border border-gray-700 backdrop-blur-sm"
        >
          ⛶ Fit
        </button>
      )}

      {/* Multi-select count + align bar */}
      {selectedIds.length > 1 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 bg-gray-900/90 border border-gray-700 rounded-lg backdrop-blur-sm text-xs">
          <span className="text-blue-300 font-medium px-1.5">{selectedIds.length} selected</span>
          <AlignBar />
        </div>
      )}

      <div className="absolute bottom-2 right-3 text-[10px] text-gray-700 pointer-events-none">
        {Math.round(scale * 100)}% · Scroll zoom · Middle-drag pan · Shift-click multi
      </div>
    </div>
  )
}

function AlignBar() {
  const { alignSelected, distributeSelected } = useDesignStore()
  const btn = 'px-1.5 py-0.5 rounded hover:bg-gray-700 text-gray-300'
  return (
    <>
      <div className="w-px h-4 bg-gray-700 mx-0.5" />
      <button className={btn} title="Align left" onClick={() => alignSelected('left')}>⇤</button>
      <button className={btn} title="Center vertically" onClick={() => alignSelected('vcenter')}>⇼</button>
      <button className={btn} title="Align right" onClick={() => alignSelected('right')}>⇥</button>
      <div className="w-px h-4 bg-gray-700 mx-0.5" />
      <button className={btn} title="Align top" onClick={() => alignSelected('top')}>⤒</button>
      <button className={btn} title="Center horizontally" onClick={() => alignSelected('hcenter')}>⇿</button>
      <button className={btn} title="Align bottom" onClick={() => alignSelected('bottom')}>⤓</button>
      <div className="w-px h-4 bg-gray-700 mx-0.5" />
      <button className={btn} title="Distribute horizontally" onClick={() => distributeSelected('horizontal')}>↔</button>
      <button className={btn} title="Distribute vertically" onClick={() => distributeSelected('vertical')}>↕</button>
    </>
  )
}
