import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCard, createTrade } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { 
  ArrowLeft, Tag, Calendar, User, Package, Shuffle, DollarSign,
  Image as ImageIcon
} from 'lucide-react';

export default function CardDetail() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCard();
  }, [cardId]);

  const fetchCard = async () => {
    try {
      const response = await getCard(cardId);
      setCard(response.data);
    } catch (error) {
      console.error('Error fetching card:', error);
      toast.error('Card not found');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error('Enter a valid offer amount');
      return;
    }

    setSubmitting(true);
    try {
      await createTrade({
        receiver_id: card.owner_id,
        trade_type: 'cash_for_cards',
        initiator_side: {
          card_ids: [],
          cash_amount: parseFloat(offerAmount)
        },
        receiver_side: {
          card_ids: [card.id],
          cash_amount: 0
        },
        message: `Cash offer for ${card.title}`
      });
      toast.success('Trade offer sent!');
      setShowTradeModal(false);
      setOfferAmount('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create offer');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <div className="text-center">
          <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Card Not Found</h2>
          <Link to="/marketplace">
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === card.owner_id;

  return (
    <div className="min-h-screen bg-[#05050A] py-8" data-testid="card-detail-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
          data-testid="back-to-marketplace"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="aspect-square bg-[#0A0A0C] border border-white/10 rounded-2xl overflow-hidden">
            {card.images?.[0]?.url ? (
              <img 
                src={card.images[0].url} 
                alt={card.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-24 h-24 text-zinc-700" />
              </div>
            )}
          </div>

          {/* Details Section */}
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20 rounded">
                  {getCategoryLabel(card.category)}
                </span>
                <span className="px-2 py-0.5 text-xs bg-white/5 text-zinc-400 border border-white/10 rounded">
                  {getConditionLabel(card.condition)}
                </span>
              </div>
              
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{card.title}</h1>
              
              {card.player_name && (
                <p className="text-lg text-zinc-400 mb-4">{card.player_name}</p>
              )}
            </div>

            {/* Price */}
            {card.asking_price && (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-6">
                <p className="text-sm text-zinc-500 mb-1">Asking Price</p>
                <div className="flex items-center gap-2 text-3xl font-bold text-white">
                  <DollarSign className="w-6 h-6 text-[#FF6B00]" />
                  {card.asking_price.toLocaleString()}
                </div>
              </div>
            )}

            {/* Card Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {card.team && (
                <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-1">Team</p>
                  <p className="text-white font-medium">{card.team}</p>
                </div>
              )}
              {card.year && (
                <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-1">Year</p>
                  <p className="text-white font-medium">{card.year}</p>
                </div>
              )}
              {card.set_name && (
                <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-1">Set</p>
                  <p className="text-white font-medium">{card.set_name}</p>
                </div>
              )}
              {card.card_number && (
                <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-1">Card #</p>
                  <p className="text-white font-medium">{card.card_number}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {isAuthenticated && !isOwner && card.status === 'available' && (
              <div className="space-y-3">
                <Button
                  className="w-full bg-[#FF6B00] hover:bg-[#E55A00] h-12"
                  onClick={() => setShowTradeModal(true)}
                  data-testid="make-offer-btn"
                >
                  <Shuffle className="w-5 h-5 mr-2" />
                  Make an Offer
                </Button>
              </div>
            )}

            {isOwner && (
              <div className="bg-[#0A0A0C] border border-[#FF6B00]/20 rounded-xl p-4">
                <p className="text-[#FF6B00] font-medium">This is your card</p>
                <p className="text-sm text-zinc-400">Manage it from your portfolio</p>
              </div>
            )}

            {!isAuthenticated && (
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 text-center">
                <p className="text-zinc-400 mb-4">Sign in to make offers on this card</p>
                <Link to="/login">
                  <Button className="bg-[#FF6B00] hover:bg-[#E55A00]">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Trade Offer Modal */}
        {showTradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">Make an Offer</h2>
              
              <div className="mb-6">
                <p className="text-sm text-zinc-400 mb-2">{card.title}</p>
                {card.asking_price && (
                  <p className="text-sm text-zinc-500">Asking: ${card.asking_price.toLocaleString()}</p>
                )}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Your Cash Offer</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="pl-10 bg-[#121214] border-white/10 h-12 text-lg"
                    data-testid="offer-amount-input"
                  />
                </div>
              </div>
              
              <p className="text-xs text-zinc-500 mb-6">
                The seller will be notified of your offer. They can accept, reject, or counter.
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowTradeModal(false); setOfferAmount(''); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#FF6B00] hover:bg-[#E55A00]"
                  onClick={handleMakeOffer}
                  disabled={submitting || !offerAmount}
                  data-testid="submit-offer-btn"
                >
                  {submitting ? 'Sending...' : 'Send Offer'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
