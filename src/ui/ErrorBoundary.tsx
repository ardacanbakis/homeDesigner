import { Component, type ReactNode } from 'react'

type Props = {
  /** Rendered instead of the children after an error; a function gets the error and a reset callback. */
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  children: ReactNode
}

/** Contains render/load errors to the subtree that threw, so one failing part
 *  (a 3D asset, WebGL itself) can't unmount the whole editor. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[HomeDesigner] contained error:', error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const { fallback } = this.props
    return typeof fallback === 'function' ? fallback(error, () => this.setState({ error: null })) : fallback
  }
}
