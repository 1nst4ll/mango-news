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
import { User, Settings, LogOut } from 'lucide-react';
import { LoginDialog } from './LoginDialog';
import useTranslations from '../lib/hooks/useTranslations';

interface LoginButtonProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

export function LoginButton({ isLoggedIn, setIsLoggedIn }: LoginButtonProps) {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const { t } = useTranslations();

  const handleLogout = async () => {
    const apiUrl = (import.meta.env.PUBLIC_API_URL as string | undefined) || 'http://localhost:3000';
    try {
      await fetch(`${apiUrl}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setIsLoggedIn(false);
    window.location.replace('/');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {isLoggedIn ? (
            <>
              <DropdownMenuLabel>{t.my_account || 'My Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { window.location.href = '/settings'; }}>
                <Settings className="h-4 w-4" />
                {t.settings || 'Settings'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                {t.sign_out || 'Sign out'}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setIsLoginDialogOpen(true)}>
              <User className="h-4 w-4" />
              {t.login || 'Login'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <LoginDialog
        isOpen={isLoginDialogOpen}
        setIsOpen={setIsLoginDialogOpen}
        onLoginSuccess={() => {
          setIsLoggedIn(true);
          window.location.reload();
        }}
      />
    </>
  );
}
