import { useState, useEffect } from 'react';
import { getCards, getMarketplaceListings } from '../lib/api';
import { CardItem } from '../components/Cards/CardItem';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Search, Filter, Grid3X3, List, Loader2 } from 'lucide-react';

export default function Marketplace() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('current_price');
  const [order, setOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchCards();
  }, [category, sortBy, order]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const params = {
        category: category !== 'all' ? category : undefined,
        sort_by: sortBy,
        order: order,
      };
      const response = await getCards(params);
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCardsWithSearch();
  };

  const fetchCardsWithSearch = async () => {
    setLoading(true);
    try {
      const params = {
        category: category !== 'all' ? category : undefined,
        search: search || undefined,
        sort_by: sortBy,
        order: order,
      };
      const response = await getCards(params);
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'Basketball', 'Baseball', 'Football'];
  const sortOptions = [
    { value: 'current_price', label: 'Price' },
    { value: 'price_change_pct', label: 'Price Change' },
    { value: 'volume_24h', label: 'Volume' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="marketplace-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-2">Marketplace</h1>
        <p className="text-zinc-400">Browse and discover collectible cards</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by card name or player..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:border-white/30"
                data-testid="marketplace-search-input"
              />
            </div>
          </form>

          {/* Category Filter */}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full lg:w-40 bg-white/5 border-white/10" data-testid="category-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0C] border-white/10">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-40 bg-white/5 border-white/10" data-testid="sort-filter">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0C] border-white/10">
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Order */}
          <Select value={order} onValueChange={setOrder}>
            <SelectTrigger className="w-full lg:w-32 bg-white/5 border-white/10" data-testid="order-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0C] border-white/10">
              <SelectItem value="desc">High to Low</SelectItem>
              <SelectItem value="asc">Low to High</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-white/10' : ''}
              data-testid="view-grid-btn"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-white/10' : ''}
              data-testid="view-list-btn"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          Showing <span className="text-white font-medium">{cards.length}</span> cards
        </p>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-400">No cards found matching your criteria</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {cards.map((card) => (
            viewMode === 'grid' ? (
              <CardItem key={card.id} card={card} />
            ) : (
              <ListCardItem key={card.id} card={card} />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// List view card item
const ListCardItem = ({ card }) => {
  const isPositive = card.price_change_pct >= 0;
  
  return (
    <a
      href={`/card/${card.id}`}
      className="flex items-center gap-4 p-4 bg-[#0A0A0C] border border-white/10 rounded-xl hover:border-white/20 transition-colors"
      data-testid={`list-card-${card.id}`}
    >
      <img
        src={card.image_url}
        alt={card.name}
        className="w-20 h-28 object-cover rounded-lg"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">{card.category}</span>
            <h3 className="font-medium text-white truncate">{card.name}</h3>
            <p className="text-sm text-zinc-400">{card.player_name} • {card.grade}</p>
          </div>
          <div className="text-right">
            <span className="font-heading font-bold text-lg text-white">
              ${card.current_price.toLocaleString()}
            </span>
            <div className={`text-sm font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{card.price_change_pct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </a>
  );
};
