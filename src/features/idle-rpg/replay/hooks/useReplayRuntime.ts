import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

type ReplayTurn = {
  turnIndex?: number
}

interface ReplayRuntimeOptions<TTurn extends ReplayTurn> {
  turns: TTurn[]
  onPlayTurn: (turn: TTurn, index: number) => Promise<void> | void
  startDelayMs?: number
  betweenTurnsDelayMs?: number
  abortRef?: MutableRefObject<boolean>
}

/**
 * Shared replay timeline runtime used by combat and raid scenes.
 * It owns turn stepping, cancellation, and finished state.
 */
export function useReplayRuntime<TTurn extends ReplayTurn>({
  turns,
  onPlayTurn,
  startDelayMs = 600,
  betweenTurnsDelayMs = 300,
  abortRef: externalAbortRef,
}: ReplayRuntimeOptions<TTurn>) {
  const [currentTurn, setCurrentTurn] = useState(-1)
  const [isFinished, setIsFinished] = useState(false)
  const internalAbortRef = useRef(false)
  const abortRef = externalAbortRef ?? internalAbortRef
  const onPlayTurnRef = useRef(onPlayTurn)

  useEffect(() => {
    onPlayTurnRef.current = onPlayTurn
  }, [onPlayTurn])

  const sleep = useCallback((ms: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  }), [])

  useEffect(() => {
    if (turns.length === 0) {
      setCurrentTurn(-1)
      setIsFinished(true)
      return
    }

    abortRef.current = false
    setCurrentTurn(-1)
    setIsFinished(false)

    const run = async () => {
      await sleep(startDelayMs)
      for (let i = 0; i < turns.length; i++) {
        if (abortRef.current) {
          return
        }
        const turn = turns[i]
        setCurrentTurn(turn.turnIndex ?? i)
        await onPlayTurnRef.current(turn, i)
        if (abortRef.current) {
          return
        }
        await sleep(betweenTurnsDelayMs)
      }

      if (!abortRef.current) {
        setIsFinished(true)
      }
    }

    run()
    return () => {
      abortRef.current = true
    }
  }, [turns, startDelayMs, betweenTurnsDelayMs, sleep])

  const stop = useCallback(() => {
    abortRef.current = true
  }, [])

  const finishAtTurn = useCallback((turnIndex: number) => {
    setCurrentTurn(turnIndex)
    setIsFinished(true)
  }, [])

  return {
    abortRef,
    currentTurn,
    isFinished,
    sleep,
    stop,
    finishAtTurn,
  }
}
