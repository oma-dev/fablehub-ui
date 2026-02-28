import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getGroupMessages, sendGroupMessage } from '../../../../../../services/api'
import type { CharacterState, GroupMessage } from '../../../../../../services/api'

interface Props {
  fableId: string
  realmId: string
  groupId: string
  character: CharacterState
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString()
}

export default function GuildChat({ fableId, realmId, groupId, character }: Props) {
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getGroupMessages(fableId, realmId, groupId)
      .then((list) => {
        if (!cancelled) setMessages(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load messages')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fableId, realmId, groupId])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setError(null)
    try {
      const msg = await sendGroupMessage(fableId, realmId, groupId, {
        characterId: character.id,
        content,
      })
      setMessages((prev) => [msg, ...prev])
      setInput('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const ordered = [...messages].reverse()

  return (
    <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minHeight: 280, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Guild chat
        </Typography>
      </Box>
      {error && (
        <Typography color="error" variant="body2" sx={{ px: 2, py: 1 }}>
          {error}
        </Typography>
      )}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minHeight: 0,
        }}
      >
        {loading ? (
          <Typography color="text.secondary" variant="body2">
            Loading...
          </Typography>
        ) : ordered.length === 0 ? (
          <Typography color="text.disabled" variant="body2">
            No messages yet. Say hello!
          </Typography>
        ) : (
          ordered.map((msg) => {
            const isOwn = msg.characterId === character.id
            return (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: isOwn ? 'primary.main' : 'action.hover',
                  color: isOwn ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                  {msg.character.name}
                  <Box component="span" sx={{ ml: 1, opacity: 0.7 }}>
                    {formatTime(msg.createdAt)}
                  </Box>
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.content}
                </Typography>
              </Box>
            )
          })
        )}
        <div ref={listEndRef} />
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          placeholder="Type a message..."
          size="small"
          fullWidth
          multiline
          maxRows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={sending}
        />
        <Button variant="contained" onClick={handleSend} disabled={sending || !input.trim()}>
          {sending ? '…' : 'Send'}
        </Button>
      </Box>
    </Paper>
  )
}
