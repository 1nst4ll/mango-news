import React, { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2 } from 'lucide-react';

interface LoginDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLoginSuccess: () => void;
}

export function LoginDialog({ isOpen, setIsOpen, onLoginSuccess }: LoginDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const backendApiUrl = import.meta.env.PUBLIC_BACKEND_API_URL || 'http://localhost:3000/api';
    try {
      const response = await fetch(`${backendApiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess();
        setIsOpen(false);
        setUsername('');
        setPassword('');
        setRememberMe(false);
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) setError(''); setIsOpen(open); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
          <DialogDescription>
            Enter your username and password to access the admin features.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Email</Label>
            <Input
              id="username"
              type="email"
              placeholder="admin@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              disabled={loading}
            />
            <Label htmlFor="rememberMe" className="cursor-pointer font-normal">
              Remember me for 30 days
            </Label>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" onClick={handleLogin} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Login'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
