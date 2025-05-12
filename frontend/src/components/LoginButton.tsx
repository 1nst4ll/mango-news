  import React, { useState } from 'react';
  import { Button } from './ui/button';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from './ui/dropdown-menu';
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

    return (
      <>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => {}}> {/* Added empty onClick handler */}
            <User className="h-[1.2rem] w-[1.2rem]" /> {/* User icon */}
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end"> {/* Removed forceMount */}
          {isLoggedIn ? (
            <>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setIsLoginDialogOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>Login</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
