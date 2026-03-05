import { memo, useCallback, useEffect, useRef, useState } from 'react'
import MuiTextField, { type TextFieldProps } from '@mui/material/TextField'

const COMMIT_DELAY_MS = 220

function normalizeFieldValue(value: TextFieldProps['value']): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function createSyntheticChangeEvent(
  nextValue: string,
): React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> {
  return {
    target: { value: nextValue },
    currentTarget: { value: nextValue },
  } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
}

const BufferedTextField = memo(function BufferedTextField({
  value,
  onChange,
  onBlur,
  onFocus,
  ...rest
}: TextFieldProps) {
  const [draftValue, setDraftValue] = useState(() => normalizeFieldValue(value))
  const isFocusedRef = useRef(false)
  const lastCommittedRef = useRef(normalizeFieldValue(value))

  useEffect(() => {
    const normalizedValue = normalizeFieldValue(value)
    if (!isFocusedRef.current) {
      setDraftValue(normalizedValue)
      lastCommittedRef.current = normalizedValue
    }
  }, [value])

  const commitDraftValue = useCallback(() => {
    if (!onChange) return
    if (draftValue === lastCommittedRef.current) return
    onChange(createSyntheticChangeEvent(draftValue))
    lastCommittedRef.current = draftValue
  }, [draftValue, onChange])

  useEffect(() => {
    if (!isFocusedRef.current || !onChange) return
    const timer = window.setTimeout(() => {
      commitDraftValue()
    }, COMMIT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [commitDraftValue, draftValue, onChange])

  return (
    <MuiTextField
      {...rest}
      value={draftValue}
      onFocus={(event) => {
        isFocusedRef.current = true
        onFocus?.(event)
      }}
      onChange={(event) => {
        setDraftValue(event.target.value)
      }}
      onBlur={(event) => {
        isFocusedRef.current = false
        commitDraftValue()
        onBlur?.(event)
      }}
    />
  )
})

export default BufferedTextField
