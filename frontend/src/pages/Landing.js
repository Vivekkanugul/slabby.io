import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Sparkles, Shield, BarChart3, ArrowRight, ChevronRight, Shuffle, Dice6, Wallet, Users } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Shuffle,
      title: 'P2P Trading',
      description: 'Trade cards directly with other collectors. Multi-asset trades with cash + cards supported.',
    },
    {
      icon: Dice6,
      title: 'Provably Fair Razz',
      description: 'Cryptographically verifiable raffles. Every draw is transparent and auditable.',
    },
    {
      icon: Wallet,
      title: 'Secure Wallet',
      description: 'Instant deposits and withdrawals. Escrow protection on every transaction.',
    },
    {
      icon: Shield,
      title: 'Event-Sourced',
      description: 'Every action is recorded immutably. Full audit trail for complete transparency.',
    },
  ];

  const stats = [
    { value: '$0', label: 'Platform Fees Held' },
    { value: '0', label: 'Active Trades' },
    { value: '100%', label: 'Provably Fair' },
    { value: '24/7', label: 'Always Open' },
  ];

  return (
    <div className="min-h-screen bg-[#05050A]" data-testid="landing-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B00]/10 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-sm mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Project Marvel - Event-Sourced Architecture</span>
            </div>

            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF9500] flex items-center justify-center shadow-lg shadow-[#FF6B00]/30">
                <span className="font-bold text-white text-2xl">S</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white mb-6">
              Trade. Razz.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] to-[#FF9500]">Collect.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              The premier P2P trading and razz platform for collectible cards. Powered by event-sourced architecture with provably fair drawings.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link to="/marketplace">
                  <Button size="lg" className="bg-[#FF6B00] text-white hover:bg-[#E55A00] px-8" data-testid="go-to-marketplace-btn">
                    Enter Marketplace
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="bg-[#FF6B00] text-white hover:bg-[#E55A00] px-8" data-testid="get-started-btn">
                      Get Started Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10 px-8" data-testid="login-btn">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-white/10 bg-[#0A0A0C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-bold text-3xl sm:text-4xl text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-bold text-3xl sm:text-4xl text-white mb-4">
              Built for Serious Collectors
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Enterprise-grade infrastructure meets collector-first design. Every feature built with trust and transparency in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 transition-all duration-300 hover:border-[#FF6B00]/30 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <h3 className="font-medium text-lg text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-[#0A0A0C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-bold text-3xl sm:text-4xl text-white mb-4">
              How Slabby Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#FF6B00]">1</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">List Your Cards</h3>
              <p className="text-sm text-zinc-400">Upload photos and set your asking price. Accept trades, cash, or both.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#FF6B00]">2</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Trade or Razz</h3>
              <p className="text-sm text-zinc-400">Negotiate P2P trades or host provably fair raffles. Escrow protects everyone.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#FF6B00]">3</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Ship & Settle</h3>
              <p className="text-sm text-zinc-400">Once both parties confirm, funds release automatically. Simple.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-[#0A0A0C] to-[#05050A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-bold text-3xl sm:text-4xl text-white mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
            Join the next generation of card collecting. Zero listing fees. Transparent fees only when you sell.
          </p>
          {!isAuthenticated && (
            <Link to="/register">
              <Button size="lg" className="bg-[#FF6B00] text-white hover:bg-[#E55A00] px-8" data-testid="cta-register-btn">
                Create Free Account
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FF9500] flex items-center justify-center">
                <span className="font-bold text-white text-sm">S</span>
              </div>
              <span className="font-bold text-lg text-white">Slabby</span>
            </div>
            <p className="text-sm text-zinc-500">
              © 2026 Slabby. Project Marvel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
