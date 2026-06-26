import type { Amount, Move } from '../cube/moves.ts'
import { printMove } from '../cube/notation.ts'

export interface ControlsHandles {
  onMove: (move: Move) => void
  getLastMove: () => Move | null
  onScramble: () => void
  onReset: () => void
  onStop: () => void
  onSolve: () => void
}

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']

export function setupControls(
  host: HTMLElement,
  handles: ControlsHandles,
): { dispose: () => void; clearHistory: () => void; appendMove: (move: Move) => void; setSolution: (moves: Move[]) => void; setSolving: (busy: boolean) => void; tickProgress: () => void } {
  host.innerHTML = `
    <div class="ui-panel">
      <div class="move-grid">
        <button class="move-btn" data-face="U" type="button">U</button>
        <button class="move-btn" data-face="D" type="button">D</button>
        <button class="move-btn" data-face="L" type="button">L</button>
        <button class="move-btn" data-face="R" type="button">R</button>
        <button class="move-btn" data-face="F" type="button">F</button>
        <button class="move-btn" data-face="B" type="button">B</button>
      </div>
      <label class="prime-toggle">
        <input id="prime" type="checkbox" />
        <span>Prime (') &mdash; CCW</span>
      </label>
      <div class="notation"><span class="notation-label">History</span><span id="notation" class="notation-list">&ndash;</span></div>
      <div class="move-counter" id="move-counter" hidden><span id="counter-current">0</span> / <span id="counter-total">0</span></div>
      <div class="lifecycle">
        <button class="lc-btn" data-action="scramble" type="button">Scramble</button>
        <button class="lc-btn" data-action="solve" type="button">Solve</button>
        <button class="lc-btn" data-action="reset" type="button">Reset</button>
        <button class="lc-btn" data-action="stop" type="button">Stop</button>
      </div>
      <div class="hint">
        Keys <kbd>U D L R F B</kbd> = CW &middot; hold <kbd>Shift</kbd> = prime &middot;
        press <kbd>2</kbd> after a face = double.
      </div>
      <div class="hint">
        <kbd>Space</kbd> = Scramble &middot; <kbd>Enter</kbd> = Solve &middot; <kbd>Esc</kbd> = Stop.
      </div>
    </div>
  `

  const notationEl = host.querySelector<HTMLSpanElement>('#notation')!
  const primeEl = host.querySelector<HTMLInputElement>('#prime')!
  const moveGrid = host.querySelector<HTMLDivElement>('.move-grid')!
  const counterEl = host.querySelector<HTMLDivElement>('#move-counter')!
  const counterCurrentEl = host.querySelector<HTMLSpanElement>('#counter-current')!
  const counterTotalEl = host.querySelector<HTMLSpanElement>('#counter-total')!
  const history: string[] = []
  const MAX_HISTORY = 24
  let solutionTotal = 0
  let solutionPlayed = 0
  let solutionStrings: string[] = []

  function renderSolutionNotation(): void {
    let html = ''
    for (let i = 0; i < solutionStrings.length; i++) {
      if (i > 0) html += ' '
      if (i === solutionPlayed - 1) html += `<span class="current-move">${solutionStrings[i]}</span>`
      else if (i < solutionPlayed - 1) html += `<span class="played-move">${solutionStrings[i]}</span>`
      else html += solutionStrings[i]
    }
    notationEl.innerHTML = html
    const cur = notationEl.querySelector<HTMLElement>('.current-move')
    if (cur) cur.scrollIntoView({ block: 'nearest' })
  }

  function appendHistory(move: Move): void {
    solutionTotal = 0
    solutionPlayed = 0
    solutionStrings = []
    counterEl.hidden = true
    history.push(printMove(move))
    const overflow = history.length > MAX_HISTORY
    if (overflow) history.shift()
    notationEl.textContent = (overflow ? '\u2026 ' : '') + history.join(' ')
  }

  function setSolution(moves: Move[]): void {
    solutionTotal = moves.length
    solutionPlayed = 0
    solutionStrings = moves.map(printMove)
    history.length = 0
    if (moves.length > 0) {
      counterEl.hidden = false
      counterCurrentEl.textContent = '0'
      counterTotalEl.textContent = String(moves.length)
      renderSolutionNotation()
    } else {
      counterEl.hidden = true
      notationEl.textContent = '\u2013'
    }
  }

  function tickProgress(): void {
    if (solutionTotal === 0) return
    solutionPlayed++
    counterCurrentEl.textContent = String(solutionPlayed)
    renderSolutionNotation()
    if (solutionPlayed >= solutionTotal) {
      solutionTotal = 0
      solutionPlayed = 0
      solutionStrings = []
    }
  }

  function clearHistory(): void {
    history.length = 0
    solutionTotal = 0
    solutionPlayed = 0
    solutionStrings = []
    counterEl.hidden = true
    notationEl.textContent = '\u2013'
  }

  const solveBtn = host.querySelector<HTMLButtonElement>('[data-action="solve"]')!

  function setSolving(busy: boolean): void {
    solveBtn.disabled = busy
    solveBtn.textContent = busy ? 'Solving\u2026' : 'Solve'
    if (busy) {
      counterEl.hidden = true
      notationEl.textContent = 'Solving\u2026'
    }
  }

  function play(face: Move['face'], amount: Amount): void {
    const move: Move = { face, amount }
    handles.onMove(move)
    appendHistory(move)
  }

  function currentAmount(prime: boolean): Amount {
    return prime ? -1 : 1
  }

  const onButtonClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-face]')
    if (!btn) return
    e.preventDefault()
    const face = btn.dataset.face as Move['face']
    play(face, currentAmount(primeEl.checked))
  }

  const onLifecycleClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
    if (!btn) return
    e.preventDefault()
    const action = btn.dataset.action
    if (action === 'scramble') handles.onScramble()
    else if (action === 'solve') handles.onSolve()
    else if (action === 'reset') handles.onReset()
    else if (action === 'stop') handles.onStop()
  }

  let lastFace: Move['face'] | null = null
  let lastPrime = false
  let doubleTimer: ReturnType<typeof setTimeout> | null = null
  const DOUBLE_WINDOW = 350

  function clearDoubleTimer(): void {
    if (doubleTimer) {
      clearTimeout(doubleTimer)
      doubleTimer = null
    }
  }

  // Scheme: a face key press is deferred for DOUBLE_WINDOW ms. If `2` arrives
  // within the window, a double (amount 2) is enqueued instead and the deferred
  // quarter is dropped. Otherwise the quarter (or prime if Shift was held) is
  // enqueued on timeout. This makes `R` then `2` = `R2` without double-counting,
  // while keeping single turns feeling near-instant.
  function deferFace(face: Move['face'], prime: boolean): void {
    clearDoubleTimer()
    lastFace = face
    lastPrime = prime
    doubleTimer = setTimeout(() => {
      play(face, currentAmount(lastPrime))
      lastFace = null
      lastPrime = false
      doubleTimer = null
    }, DOUBLE_WINDOW)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return
    const k = e.key.toLowerCase()

    if (k === ' ' || e.code === 'Space') {
      e.preventDefault()
      clearDoubleTimer()
      handles.onScramble()
      return
    }
    if (k === 'enter') {
      e.preventDefault()
      clearDoubleTimer()
      handles.onSolve()
      return
    }
    if (k === 'escape') {
      e.preventDefault()
      clearDoubleTimer()
      handles.onStop()
      return
    }

    if (k === '2') {
      if (lastFace) {
        e.preventDefault()
        clearDoubleTimer()
        play(lastFace, 2)
        lastFace = null
        lastPrime = false
      }
      return
    }

    const face = k.toUpperCase()
    if ((FACES as readonly string[]).includes(face) && k !== '2') {
      e.preventDefault()
      deferFace(face as Move['face'], e.shiftKey)
    }
  }

  const lifecyclePanel = host.querySelector<HTMLDivElement>('.lifecycle')!
  moveGrid.addEventListener('click', onButtonClick)
  lifecyclePanel.addEventListener('click', onLifecycleClick)
  window.addEventListener('keydown', onKey)

  return {
    dispose: () => {
      moveGrid.removeEventListener('click', onButtonClick)
      lifecyclePanel.removeEventListener('click', onLifecycleClick)
      window.removeEventListener('keydown', onKey)
      clearDoubleTimer()
    },
    clearHistory,
    appendMove: appendHistory,
    setSolution,
    setSolving,
    tickProgress,
  }
}