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

    // Styling will be handled by Tailwind classes now

    return (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-[1.2rem] w-[1.2rem]" /> {/* User icon */}
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1 bg-popover text-popover-foreground rounded-md border shadow-md"> {/* Added base PopoverContent styling */}
            {isLoggedIn ? (
              <div className="flex flex-col">
                <div className="px-2 py-1.5 text-sm font-semibold">My Account</div> {/* Label style */}
                <div className="bg-border -mx-1 my-1 h-px" /> {/* Separator style */}
                <button
                  className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left"
                  onClick={() => window.location.href = '/settings'}
                >
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </button>
                <button
                  className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button
                className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left"
                onClick={() => setIsLoginDialogOpen(true)}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
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
