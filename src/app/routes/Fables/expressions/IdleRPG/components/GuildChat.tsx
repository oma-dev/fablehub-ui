import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getGroupMessages, sendGroupMessage } from '@features/idle-rpg/api'
import type { CharacterState, GroupMessage } from '@features/idle-rpg/api'

interface Props {
  fableId: string
  realmId: string
  groupId: string
  character: CharacterState
}

const MAX_UI_MESSAGES = 30

function keepLatestMessages(messages: GroupMessage[]): GroupMessage[] {
  return [...messages]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_UI_MESSAGES)
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
  const listRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(() => {
    return getGroupMessages(fableId, realmId, groupId)
      .then((incoming) => setMessages(keepLatestMessages(incoming)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load messages'))
  }, [fableId, realmId, groupId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchMessages().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchMessages])

  // Poll for new messages (e.g. PvP announcements)
  useEffect(() => {
    const id = setInterval(fetchMessages, 5000)
    return () => clearInterval(id)
  }, [fetchMessages])

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
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
      setMessages((prev) => keepLatestMessages([msg, ...prev]))
      setInput('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const ordered = [...messages].reverse()

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 360, md: 420 },
        maxHeight: { xs: 360, md: 420 },
        overflow: 'hidden',
      }}
    >
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
        ref={listRef}
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
            const isSystem = !msg.character
            const isOwn = !isSystem && msg.characterId === character.id
            return (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: isSystem ? 'center' : isOwn ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: isSystem ? 'rgba(168,85,247,0.12)' : isOwn ? 'primary.main' : 'action.hover',
                  color: isSystem ? 'text.secondary' : isOwn ? 'primary.contrastText' : 'text.primary',
                  border: isSystem ? '1px solid rgba(168,85,247,0.2)' : undefined,
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                  {msg.character?.name ?? 'Arena'}
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

