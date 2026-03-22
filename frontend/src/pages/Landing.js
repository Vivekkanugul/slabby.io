import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Sparkles, Shield, BarChart3, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: BarChart3,
      title: 'Portfolio Tracking',
      description: 'Track your entire card collection with real-time valuations and profit/loss analytics.',
    },
    {
      icon: TrendingUp,
      title: 'Marketplace',
      description: 'Buy and sell cards in our secure marketplace with transparent pricing.',
    },
    {
      icon: Sparkles,
      title: 'AI Predictions',
      description: 'Advanced ML models analyze eBay trends, player stats, and social sentiment.',
    },
    {
      icon: Shield,
      title: 'Risk Analysis',
      description: 'Understand your portfolio risk with detailed analytics and alerts.',
    },
  ];

  const stats = [
    { value: '$52M+', label: 'Cards Tracked' },
    { value: '10K+', label: 'Active Collectors' },
    { value: '95%', label: 'Prediction Accuracy' },
    { value: '24/7', label: 'Market Monitoring' },
  ];

  return (
    <div className="min-h-screen bg-[#05050A]" data-testid="landing-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#007AFF]/10 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] text-sm mb-8">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Card Analytics</span>
            </div>

            {/* Headline */}
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white mb-6">
              The Smarter Way to{' '}
              <span className="gradient-text">Collect & Invest</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Track your portfolio, discover market trends, and get AI-powered predictions for collectible card values. Built for collectors and investors.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-8" data-testid="go-to-dashboard-btn">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-8" data-testid="get-started-btn">
                      Get Started Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/marketplace">
                    <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10 px-8" data-testid="explore-marketplace-btn">
                      Explore Marketplace
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
                <div className="font-heading font-bold text-3xl sm:text-4xl text-white mb-2">
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
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              From tracking to trading, CardWise gives you the tools to make smarter decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 transition-all duration-300 hover:border-white/20 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-[#007AFF]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#007AFF]" />
                </div>
                <h3 className="font-medium text-lg text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-[#0A0A0C] to-[#05050A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-6">
            Ready to Level Up Your Collection?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
            Join thousands of collectors using AI-powered insights to make smarter investment decisions.
          </p>
          {!isAuthenticated && (
            <Link to="/register">
              <Button size="lg" className="bg-[#007AFF] text-white hover:bg-[#005bb5] px-8" data-testid="cta-register-btn">
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#00E5FF] flex items-center justify-center">
                <span className="font-heading font-bold text-white text-sm">CW</span>
              </div>
              <span className="font-heading font-bold text-lg">CardWise</span>
            </div>
            <p className="text-sm text-zinc-500">
              © 2024 CardWise. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
