import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function LoginButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for JWT token in localStorage on component mount
    const token = localStorage.getItem('jwtToken');
    setIsLoggedIn(!!token); // Set isLoggedIn to true if token exists
  }, []);

  const handleLogin = async () => {
    setError(''); // Clear previous errors
    const backendApiUrl = import.meta.env.PUBLIC_BACKEND_API_URL || 'http://localhost:3000/api'; // Use environment variable or fallback
    try {
      const response = await fetch(`${backendApiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful
        console.log('Login successful:', data);
        // Store the token (e.g., in localStorage)
        localStorage.setItem('jwtToken', data.token);
        setIsLoggedIn(true); // Update login state
        // Close the dialog
        setIsOpen(false);
        // Clear form fields
        setUsername('');
        setPassword('');
        // Optional: Reload the page or update UI state to reflect login
        window.location.reload();
      } else {
        // Login failed
        console.error('Login failed:', data.error);
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      setError('An error occurred during login.');
    }
  };

  const handleLogout = () => {
    // Remove the token from localStorage
    localStorage.removeItem('jwtToken');
    setIsLoggedIn(false); // Update login state
    // Optional: Redirect to homepage or update UI state
    window.location.href = '/';
  };

  if (isLoggedIn) {
    return <Button variant="ghost" onClick={handleLogout}>Logout</Button>;
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setIsOpen(true)}>Login</Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>
              Enter your username and password to access the admin features.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            {error && <p className="text-red-500 text-sm col-span-4 text-center">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleLogin}>Login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
