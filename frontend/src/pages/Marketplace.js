import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCards, getMyCards, createCard, publishCard, getTrendingCards } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Search, Plus, TrendingUp, DollarSign, Package, Eye, CheckCircle2,
  Image as ImageIcon, X
} from 'lucide-react';

export default function Marketplace() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [cards, setCards] = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  
  // Create card modal
  const [showCreate, setShowCreate] = useState(false);
  const [newCard, setNewCard] = useState({
    title: '',
    player_name: '',
    team: '',
    year: '',
    set_name: '',
    category: 'basketball',
    condition: 'raw',
    asking_price: '',
    images: []
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { 
        q: search || undefined,
        category: category !== 'all' ? category : undefined 
      };
      const [cardsRes, myCardsRes] = await Promise.all([
        getCards(params),
        isAuthenticated ? getMyCards() : Promise.resolve({ data: [] })
      ]);
      setCards(cardsRes.data || []);
      setMyCards(myCardsRes.data || []);
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  }, [category, search, isAuthenticated]);

  useEffect(() => { 
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleCreateCard = async () => {
    if (!newCard.title.trim()) {
      toast.error('Card title is required');
      return;
    }

    setSubmitting(true);
    try {
      const cardData = {
        ...newCard,
        year: newCard.year ? parseInt(newCard.year) : null,
        asking_price: newCard.asking_price ? parseFloat(newCard.asking_price) : null,
        images: newCard.images.filter(Boolean)
      };
      
      const response = await createCard(cardData);
      toast.success('Card created! Publish it to list on marketplace.');
      setShowCreate(false);
      setNewCard({
        title: '',
        player_name: '',
        team: '',
        year: '',
        set_name: '',
        category: 'basketball',
        condition: 'raw',
        asking_price: '',
        images: []
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create card');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (cardId) => {
    try {
      await publishCard(cardId);
      toast.success('Card published to marketplace!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to publish');
    }
  };

  const getConditionLabel = (condition) => {
    const labels = {
      raw: 'Raw',
      psa_10: 'PSA 10',
      psa_9: 'PSA 9',
      psa_8: 'PSA 8',
      bgs_10: 'BGS 10',
      bgs_9_5: 'BGS 9.5',
    };
    return labels[condition] || condition;
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      basketball: 'Basketball',
      baseball: 'Baseball',
      football: 'Football',
      hockey: 'Hockey',
      soccer: 'Soccer',
      pokemon: 'Pokemon',
      other: 'Other'
    };
    return labels[cat] || cat;
  };

  const tabs = [
    { id: 'browse', label: 'Browse Cards', icon: Search },
    { id: 'my-cards', label: 'My Cards', icon: Package, requireAuth: true },
  ];

  return (
    <div className="min-h-screen bg-[#05050A] py-8" data-testid="marketplace-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Marketplace</h1>
            <p className="text-zinc-400 mt-1">Browse and list cards for trading</p>
          </div>
          
          {isAuthenticated && (
            <Button
              className="bg-[#FF6B00] hover:bg-[#E55A00]"
              onClick={() => setShowCreate(true)}
              data-testid="list-card-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              List a Card
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.filter(tab => !tab.requireAuth || isAuthenticated).map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'bg-[#FF6B00] hover:bg-[#E55A00]' : 'text-zinc-400 hover:text-white'}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Filters */}
        {activeTab === 'browse' && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search cards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#0A0A0C] border-white/10"
                data-testid="search-input"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px] bg-[#0A0A0C] border-white/10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="basketball">Basketball</SelectItem>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="football">Football</SelectItem>
                <SelectItem value="hockey">Hockey</SelectItem>
                <SelectItem value="pokemon">Pokemon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'browse' ? (
          <>
            {cards.length === 0 ? (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
                <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No cards listed yet</h3>
                <p className="text-zinc-400 text-sm">
                  {isAuthenticated 
                    ? "Be the first to list a card on the marketplace!"
                    : "Sign in to list your first card."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cards.map((card) => (
                  <CardItem 
                    key={card.id} 
                    card={card} 
                    getConditionLabel={getConditionLabel}
                    getCategoryLabel={getCategoryLabel}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {myCards.length === 0 ? (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-12 text-center">
                <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No cards yet</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  List your first card to start trading!
                </p>
                <Button
                  className="bg-[#FF6B00] hover:bg-[#E55A00]"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  List a Card
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myCards.map((card) => (
                  <CardItem 
                    key={card.id} 
                    card={card} 
                    isOwner={true}
                    onPublish={() => handlePublish(card.id)}
                    getConditionLabel={getConditionLabel}
                    getCategoryLabel={getCategoryLabel}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Card Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-[#0A0A0C] px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">List a Card</h2>
                <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Card Title *</label>
                  <Input
                    placeholder="e.g., 2023 Panini Prizm Victor Wembanyama RC #280"
                    value={newCard.title}
                    onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                    className="bg-[#121214] border-white/10"
                    data-testid="card-title-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Player Name</label>
                    <Input
                      placeholder="Victor Wembanyama"
                      value={newCard.player_name}
                      onChange={(e) => setNewCard({ ...newCard, player_name: e.target.value })}
                      className="bg-[#121214] border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Team</label>
                    <Input
                      placeholder="San Antonio Spurs"
                      value={newCard.team}
                      onChange={(e) => setNewCard({ ...newCard, team: e.target.value })}
                      className="bg-[#121214] border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Year</label>
                    <Input
                      type="number"
                      placeholder="2023"
                      value={newCard.year}
                      onChange={(e) => setNewCard({ ...newCard, year: e.target.value })}
                      className="bg-[#121214] border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Set Name</label>
                    <Input
                      placeholder="Panini Prizm"
                      value={newCard.set_name}
                      onChange={(e) => setNewCard({ ...newCard, set_name: e.target.value })}
                      className="bg-[#121214] border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Category</label>
                    <Select 
                      value={newCard.category} 
                      onValueChange={(v) => setNewCard({ ...newCard, category: v })}
                    >
                      <SelectTrigger className="bg-[#121214] border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basketball">Basketball</SelectItem>
                        <SelectItem value="baseball">Baseball</SelectItem>
                        <SelectItem value="football">Football</SelectItem>
                        <SelectItem value="hockey">Hockey</SelectItem>
                        <SelectItem value="pokemon">Pokemon</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Condition</label>
                    <Select 
                      value={newCard.condition} 
                      onValueChange={(v) => setNewCard({ ...newCard, condition: v })}
                    >
                      <SelectTrigger className="bg-[#121214] border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="psa_10">PSA 10</SelectItem>
                        <SelectItem value="psa_9">PSA 9</SelectItem>
                        <SelectItem value="psa_8">PSA 8</SelectItem>
                        <SelectItem value="bgs_10">BGS 10</SelectItem>
                        <SelectItem value="bgs_9_5">BGS 9.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Asking Price (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newCard.asking_price}
                      onChange={(e) => setNewCard({ ...newCard, asking_price: e.target.value })}
                      className="pl-10 bg-[#121214] border-white/10"
                      data-testid="card-price-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Image URL</label>
                  <Input
                    placeholder="https://..."
                    value={newCard.images[0] || ''}
                    onChange={(e) => setNewCard({ ...newCard, images: [e.target.value] })}
                    className="bg-[#121214] border-white/10"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Optional: Add a direct link to an image of your card</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-[#FF6B00] hover:bg-[#E55A00]"
                    onClick={handleCreateCard}
                    disabled={submitting || !newCard.title.trim()}
                    data-testid="create-card-btn"
                  >
                    {submitting ? 'Creating...' : 'Create Card'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardItem({ card, isOwner, onPublish, getConditionLabel, getCategoryLabel }) {
  const isDraft = card.status === 'draft';
  
  return (
    <div 
      className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden hover:border-[#FF6B00]/30 transition-all group"
      data-testid={`card-${card.id}`}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-[#121214] to-[#0A0A0C] relative overflow-hidden">
        {card.images?.[0]?.url ? (
          <img 
            src={card.images[0].url} 
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        
        {/* Status badge */}
        {isDraft && isOwner && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-500 text-xs">
            Draft
          </div>
        )}
        
        {/* Category badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
          {getCategoryLabel(card.category)}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-medium line-clamp-2 mb-1">{card.title}</h3>
        
        {card.player_name && (
          <p className="text-sm text-zinc-400 mb-2">{card.player_name}</p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs px-2 py-0.5 bg-[#121214] rounded text-zinc-400">
            {getConditionLabel(card.condition)}
          </span>
          {card.year && (
            <span className="text-xs text-zinc-500">{card.year}</span>
          )}
        </div>
        
        {card.asking_price && (
          <div className="flex items-center gap-1 text-lg font-bold text-white mb-3">
            <DollarSign className="w-4 h-4 text-[#FF6B00]" />
            {card.asking_price.toLocaleString()}
          </div>
        )}
        
        {/* Actions */}
        {isOwner && isDraft ? (
          <Button
            className="w-full bg-[#FF6B00] hover:bg-[#E55A00]"
            size="sm"
            onClick={onPublish}
            data-testid={`publish-${card.id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Publish
          </Button>
        ) : !isOwner && (
          <Button
            className="w-full"
            variant="outline"
            size="sm"
            data-testid={`view-${card.id}`}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        )}
      </div>
    </div>
  );
}
