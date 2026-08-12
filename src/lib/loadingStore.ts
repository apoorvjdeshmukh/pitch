import { showToast } from './toastStore'

interface LoadingState {
  visible: boolean
  message: string
  startedAt: number
  streamText: string
}

let _listeners: Array<(state: LoadingState) => void> = []
let _state: LoadingState = { visible: false, message: 'Loading...', startedAt: 0, streamText: '' }

export function showLoading(msg = 'Loading...') {
  _state = { visible: true, message: msg, startedAt: Date.now(), streamText: '' }
  _listeners.forEach(l => l(_state))
}

// Appends a chunk of live-streamed text to the overlay (raw text, shown as it
// arrives — swapped out for the rendered UI once hideLoading is called).
export function appendStreamText(chunk: string) {
  _state = { ..._state, streamText: _state.streamText + chunk }
  _listeners.forEach(l => l(_state))
}

// Replaces the streamed preview text wholesale — used when combining two
// parallel generations, where naive appending would interleave their chunks.
export function setStreamText(text: string) {
  _state = { ..._state, streamText: text }
  _listeners.forEach(l => l(_state))
}

// Pass doneLabel (e.g. "Generated") to surface a toast reporting how long the
// just-finished generation took — the closest thing this app has to a speed metric.
export function hideLoading(doneLabel?: string) {
  const elapsedMs = Date.now() - _state.startedAt
  _state = { visible: false, message: '', startedAt: 0, streamText: '' }
  _listeners.forEach(l => l(_state))
  if (doneLabel) {
    showToast(`${doneLabel} in ${(elapsedMs / 1000).toFixed(1)}s`, 'info', 3000)
  }
}

export function subscribeLoading(listener: (state: LoadingState) => void) {
  _listeners.push(listener)
  return () => { _listeners = _listeners.filter(l => l !== listener) }
}

export function getLoadingState() { return _state }
