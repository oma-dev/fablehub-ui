import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { supabase } from '../../../lib/supabase'
import { setAccessToken } from '../../../services/webclient'

const Register = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (authError) throw authError
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token)
        navigate('/', { replace: true })
      } else {
        setSuccess(true)
        setError(
          'Account created. If your project requires email confirmation, check your inbox. Otherwise you can log in.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
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
          Create account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Register with Supabase Auth. Your JWT is then used for backend
          requests (e.g. create fable, create Idle RPG).
        </Typography>

        {success && (
          <Typography color="success.main" sx={{ mb: 2 }}>
            Account created. Check your email if confirmation is enabled, or try
            logging in.
          </Typography>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            error={!!error && !success}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
            error={!!error && !success}
            helperText={error}
          />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? 'Creating account…' : 'Register'}
            </Button>
            <Button component={Link} to="/login" variant="outlined" color="primary">
              Log in
            </Button>
          </Box>
        </form>
      </Container>
    </Box>
  )
}

export default Register
