import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Store, Shuffle, Dice6, User, LogOut, Menu, X, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/marketplace', label: 'Marketplace', icon: Store },
    { to: '/trades', label: 'Trades', icon: Shuffle },
    { to: '/razz', label: 'Razz', icon: Dice6 },
    { to: '/wallet', label: 'Wallet', icon: Wallet },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const displayName = user?.profile?.display_name || user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/10" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#BCFF00] to-[#9FD900] flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(0,229,255,0.5)]">
              <span className="font-heading font-semibold text-black text-sm">S</span>
            </div>
            <span className="font-heading font-medium text-xl tracking-tight text-white">Slabby</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  data-testid={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? 'text-white bg-white/5'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                  {isActive(link.to) && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#BCFF00] rounded-full" />
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid="user-menu-trigger"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#BCFF00] to-[#9FD900] flex items-center justify-center ring-2 ring-white/10">
                      <span className="text-black text-xs font-semibold">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm text-zinc-300 font-medium">{displayName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#0A0A0E] border-white/10 shadow-xl shadow-black/50">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2.5 text-sm" data-testid="profile-link">
                      <User className="w-4 h-4" />Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 text-red-400 text-sm"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" />Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" data-testid="login-btn" className="text-sm text-zinc-400 hover:text-white hover:bg-white/5 h-9 px-4">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button data-testid="register-btn" className="bg-[#BCFF00] hover:bg-[#D4FF4D] text-black text-sm font-semibold h-9 px-5 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] transition-all">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-all"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-zinc-400" /> : <Menu className="w-5 h-5 text-zinc-400" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`mobile-nav-${link.label.toLowerCase().replace(' ', '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive(link.to)
                    ? 'text-white bg-white/5'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};
