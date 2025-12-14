'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowLeft } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: "var(--gradient-mesh)" }}
      />
      
      {/* Animated Background Elements */}
      <motion.div
        className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-[var(--accent-secondary)]/10 blur-3xl"
        animate={{
          x: [0, -100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-[var(--accent-primary)]/10 blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        
        <Card variant="glass" padding="lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
              🎸 Lineup Wars
            </h1>
            <p className="text-[var(--foreground-muted)]">
              Create your account
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 text-[var(--accent-error)]"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="John Doe"
              icon={<User className="h-5 w-5" />}
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              icon={<Mail className="h-5 w-5" />}
            />

            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
              />
              <p className="mt-1.5 text-xs text-[var(--foreground-subtle)]">
                Password must be at least 6 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={loading}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium">
              Sign In
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
