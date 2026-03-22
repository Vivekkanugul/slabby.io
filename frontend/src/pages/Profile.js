import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { User, Mail, Bell, Shield, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    aiSignals: true,
    marketNews: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Settings saved');
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="profile-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-2">Profile Settings</h1>
        <p className="text-zinc-400">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#007AFF] to-[#00E5FF] flex items-center justify-center">
            <span className="text-2xl font-heading font-bold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-medium text-white">{user?.name}</h2>
            <p className="text-zinc-400">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              defaultValue={user?.name}
              className="bg-white/5 border-white/10 focus:border-white/30"
              data-testid="profile-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={user?.email}
              disabled
              className="bg-white/5 border-white/10 opacity-60"
              data-testid="profile-email-input"
            />
            <p className="text-xs text-zinc-500">Email cannot be changed</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-[#007AFF]" />
          <h3 className="text-lg font-medium text-white">Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white">Price Alerts</span>
              <p className="text-sm text-zinc-500">Get notified when cards hit your target price</p>
            </div>
            <Switch
              checked={notifications.priceAlerts}
              onCheckedChange={(checked) => setNotifications({ ...notifications, priceAlerts: checked })}
              data-testid="price-alerts-switch"
            />
          </div>
          
          <Separator className="bg-white/10" />
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white">AI Signals</span>
              <p className="text-sm text-zinc-500">Receive AI-generated buy/sell recommendations</p>
            </div>
            <Switch
              checked={notifications.aiSignals}
              onCheckedChange={(checked) => setNotifications({ ...notifications, aiSignals: checked })}
              data-testid="ai-signals-switch"
            />
          </div>
          
          <Separator className="bg-white/10" />
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white">Market News</span>
              <p className="text-sm text-zinc-500">Daily digest of market trends and news</p>
            </div>
            <Switch
              checked={notifications.marketNews}
              onCheckedChange={(checked) => setNotifications({ ...notifications, marketNews: checked })}
              data-testid="market-news-switch"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-[#007AFF]" />
          <h3 className="text-lg font-medium text-white">Security</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              className="bg-white/5 border-white/10 focus:border-white/30"
              data-testid="current-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              className="bg-white/5 border-white/10 focus:border-white/30"
              data-testid="new-password-input"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-white text-black hover:bg-gray-200"
          data-testid="save-settings-btn"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
        <Button
          variant="outline"
          onClick={logout}
          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          data-testid="logout-profile-btn"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
