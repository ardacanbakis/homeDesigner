import { useEffect, useState } from 'react'
import { useDesignStore } from './store/design'
import { Toolbar } from './ui/Toolbar'
import { Palette } from './ui/Palette'
import { Inspector } from './ui/Inspector'
import { Canvas2D } from './editor2d/Canvas2D'
import { Scene3D } from './scene3d/Scene3D'

function useWorkspaceSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

export default function App() {
  const { viewMode } = useDesignStore()
  const { width, height } = useWorkspaceSize()

  const TOOLBAR_H = 48
  const PALETTE_W = 208
  const INSPECTOR_W = 224
  const workspaceW = width - PALETTE_W - INSPECTOR_W
  const workspaceH = height - TOOLBAR_H

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Palette />
        <div className="flex-1 relative overflow-hidden">
          {viewMode === '2d' ? (
            <Canvas2D width={workspaceW} height={workspaceH} />
          ) : (
            <Scene3D />
          )}
        </div>
        <Inspector />
      </div>
    </div>
  )
}
