import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { createFable } from '../../../services/api'

const FableCreate = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSubmitting(true)
    try {
      const fable = await createFable({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      navigate(`/fables/${fable.id}`)
    } catch (err) {
      const message = err && typeof err === 'object' && 'data' in err
        ? String((err as { data?: unknown }).data)
        : err instanceof Error ? err.message : 'Failed to create fable.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="sm">
        <Typography
          component="h1"
          variant="h4"
          color="primary.dark"
          fontWeight={700}
          gutterBottom
        >
          Create a Fable
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Name and optional description. Canon (entities, tags, relationships)
          can be added later.
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Name"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
            error={!!error}
            helperText={error}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Fable'}
            </Button>
            <Button component={Link} to="/fables" variant="outlined" color="primary">
              Cancel
            </Button>
          </Box>
        </form>
      </Container>
    </Box>
  )
}

export default FableCreate
