  import React, { useState } from 'react';
  import { Button } from './ui/button';
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from './ui/popover'; // Changed to Popover
  // DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator will be replaced with basic elements
  import { User, Settings, LogOut } from 'lucide-react'; // Import User, Settings, and LogOut icons
  import { LoginDialog } from './LoginDialog'; // Import the LoginDialog component

  interface LoginButtonProps {
    isLoggedIn: boolean;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
  }

  export function LoginButton({ isLoggedIn, setIsLoggedIn }: LoginButtonProps) {
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

    const handleLogout = () => {
      // Remove the token from localStorage
      localStorage.removeItem('jwtToken');
      setIsLoggedIn(false); // Update login state
      // Optional: Redirect to homepage or update UI state
      window.location.href = '/';
    };

    // Basic styling for popover items (can be improved later)
    const itemStyle: React.CSSProperties = {
      padding: '8px 16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
    };

    const separatorStyle: React.CSSProperties = {
      height: '1px',
      backgroundColor: '#e5e7eb', // A light gray, adjust as needed
      margin: '4px 0',
    };

    const labelStyle: React.CSSProperties = {
      padding: '8px 16px',
      fontWeight: 'bold',
      fontSize: '0.875rem', // text-sm
      color: '#6b7280', // text-gray-500, adjust as needed
    };

    return (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon"> {/* Removed potentially problematic empty onClick */}
              <User className="h-[1.2rem] w-[1.2rem]" /> {/* User icon */}
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0"> {/* Adjusted PopoverContent styling */}
            {isLoggedIn ? (
              <div className="flex flex-col">
                <div style={labelStyle}>My Account</div>
                <div style={separatorStyle} />
                <button style={itemStyle} onClick={() => window.location.href = '/settings'}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </button>
                <button style={itemStyle} onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button style={itemStyle} onClick={() => setIsLoginDialogOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                <span>Login</span>
              </button>
            )}
          </PopoverContent>
        </Popover>

        {/* Render the LoginDialog, controlled by isLoginDialogOpen state */}
        <LoginDialog
          isOpen={isLoginDialogOpen}
          setIsOpen={setIsLoginDialogOpen}
          onLoginSuccess={() => {
            setIsLoggedIn(true); // Update isLoggedIn state in Header on successful login
            window.location.reload(); // Reload the page to update UI based on login status
          }}
        />
      </>
    );
  }
