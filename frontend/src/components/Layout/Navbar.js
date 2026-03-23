import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Store, Briefcase, Brain, User, LogOut, Menu, X, BarChart3 } from 'lucide-react';
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
    { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/ai-insights', label: 'AI Research', icon: Brain },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="logo-link">
            <div className="w-7 h-7 rounded-md bg-[#007AFF] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <span className="font-heading font-bold text-white text-xs tracking-tight">CW</span>
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-white">CardWise</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  data-testid={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-200 ${
                    isActive(link.to)
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                  {isActive(link.to) && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#007AFF] rounded-full" />
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
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors duration-200"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007AFF] to-[#00E5FF] flex items-center justify-center ring-1 ring-white/10">
                      <span className="text-white text-[11px] font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden sm:block text-[13px] text-zinc-400 font-medium">{user?.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-[#121214] border-white/[0.08] shadow-xl shadow-black/50">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 text-[13px]" data-testid="profile-link">
                      <User className="w-3.5 h-3.5" />Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-400 text-[13px]"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" data-testid="login-btn" className="text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.06] h-8 px-3">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button data-testid="register-btn" className="bg-[#007AFF] hover:bg-[#0066DD] text-white text-[13px] font-semibold h-8 px-4 rounded-md">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                className="md:hidden p-1.5 rounded-md hover:bg-white/[0.06] transition-colors duration-200"
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
          <div className="md:hidden py-3 border-t border-white/[0.06]">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`mobile-nav-${link.label.toLowerCase().replace(' ', '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium ${
                  isActive(link.to)
                    ? 'text-white bg-white/[0.06]'
                    : 'text-zinc-500 hover:text-white hover:bg-white/[0.04]'
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
