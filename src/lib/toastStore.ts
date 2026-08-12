export type ToastKind = 'error' | 'info'

export interface Toast {
  id: string
  message: string
  kind: ToastKind
}

let _listeners: Array<(toasts: Toast[]) => void> = []
let _toasts: Toast[] = []

function emit() { _listeners.forEach(l => l(_toasts)) }

export function showToast(message: string, kind: ToastKind = 'error', duration = 5000) {
  const id = Math.random().toString(36).slice(2, 9)
  _toasts = [..._toasts, { id, message, kind }]
  emit()
  setTimeout(() => dismissToast(id), duration)
}

export function dismissToast(id: string) {
  _toasts = _toasts.filter(t => t.id !== id)
  emit()
}

export function subscribeToasts(listener: (toasts: Toast[]) => void) {
  _listeners.push(listener)
  return () => { _listeners = _listeners.filter(l => l !== listener) }
}

export function getToasts() { return _toasts }
