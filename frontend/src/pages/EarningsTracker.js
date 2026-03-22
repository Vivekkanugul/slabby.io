import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPerformanceLeaderboard, getEarningsCalendar, getCards, getPlayerEarnings } from '../lib/api';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { 
  TrendingUp, TrendingDown, Loader2, Calendar, Trophy, 
  Activity, Flame, Snowflake, Target, Clock, BarChart3, Award
} from 'lucide-react';
import { formatCurrency, formatPercent, getPriceChangeColor } from '../lib/utils';

export default function EarningsTracker() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaderboardRes, calendarRes] = await Promise.all([
        getPerformanceLeaderboard(),
        getEarningsCalendar()
      ]);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      setCalendar(calendarRes.data.events || []);
      
      // Select first player by default
      if (leaderboardRes.data.leaderboard?.length > 0) {
        handleSelectPlayer(leaderboardRes.data.leaderboard[0].card_id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = async (cardId) => {
    setSelectedPlayer(cardId);
    setPlayerLoading(true);
    try {
      const response = await getPlayerEarnings(cardId);
      setPlayerData(response.data);
    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setPlayerLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'hot') return <Flame className="w-4 h-4 text-red-400" />;
    if (trend === 'cold') return <Snowflake className="w-4 h-4 text-blue-400" />;
    return <Activity className="w-4 h-4 text-amber-400" />;
  };

  const getTrendBadge = (trend) => {
    const styles = {
      hot: 'bg-red-500/20 text-red-400 border-red-500/30',
      cold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      stable: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[trend] || styles.stable}`}>
        {trend?.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="earnings-tracker-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">Earnings Tracker</h1>
            <p className="text-zinc-400">Player performance impact on card values</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#007AFF]" />
              Performance Leaderboard
            </h3>
            <div className="space-y-2">
              {leaderboard.map((player, index) => (
                <button
                  key={player.card_id}
                  onClick={() => handleSelectPlayer(player.card_id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedPlayer === player.card_id
                      ? 'bg-[#007AFF]/20 border border-[#007AFF]/50'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-amber-500 text-black' :
                      index === 1 ? 'bg-zinc-400 text-black' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-white/10 text-zinc-400'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-medium truncate block">{player.player_name}</span>
                      <span className="text-xs text-zinc-500">{player.team} • {player.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {getTrendIcon(player.trend)}
                        <span className="font-mono text-sm text-white">{player.avg_impact_score}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{player.recent_record}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Player Detail */}
        <div className="lg:col-span-2 space-y-6">
          {playerLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
            </div>
          ) : playerData ? (
            <>
              {/* Player Header */}
              <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-heading font-bold text-2xl text-white">
                        {playerData.player_name}
                      </h2>
                      {getTrendBadge(playerData.performance_trend)}
                    </div>
                    <p className="text-zinc-400">{playerData.card_name}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-sm text-zinc-500">
                        {playerData.player_data?.sport} • {playerData.player_data?.position}
                      </span>
                      <span className={`text-sm ${
                        playerData.player_data?.status === 'Active' ? 'text-emerald-400' : 'text-zinc-400'
                      }`}>
                        {playerData.player_data?.status}
                      </span>
                    </div>
                  </div>
                  <Link to={`/card/${playerData.card_id}`}>
                    <Button variant="outline" className="border-white/20 hover:bg-white/10">
                      View Card
                    </Button>
                  </Link>
                </div>

                {/* Career Highlights */}
                {playerData.player_data?.career_highlights?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex flex-wrap gap-2">
                      {playerData.player_data.career_highlights.map((highlight, i) => (
                        <span key={i} className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400">
                          <Award className="w-3 h-3 inline mr-1" />
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-zinc-500 block mb-2">Impact Score</span>
                  <span className="font-heading font-bold text-2xl text-white">
                    {playerData.avg_impact_score || '—'}
                  </span>
                </div>
                <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-zinc-500 block mb-2">Value Correlation</span>
                  <div className="flex items-center gap-2">
                    <Progress value={playerData.value_correlation * 100} className="flex-1 h-2" />
                    <span className="font-mono text-sm text-white">{(playerData.value_correlation * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-zinc-500 block mb-2">Legacy Score</span>
                  <span className="font-heading font-bold text-2xl text-white">
                    {playerData.player_data?.legacy_score || '—'}
                  </span>
                </div>
                <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-zinc-500 block mb-2">Performance</span>
                  {getTrendBadge(playerData.performance_trend)}
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="games" className="space-y-4">
                <TabsList className="bg-[#0A0A0C] border border-white/10 p-1">
                  <TabsTrigger value="games" className="data-[state=active]:bg-white/10">
                    Recent Games
                  </TabsTrigger>
                  <TabsTrigger value="season" className="data-[state=active]:bg-white/10">
                    Season Stats
                  </TabsTrigger>
                  <TabsTrigger value="catalysts" className="data-[state=active]:bg-white/10">
                    Catalysts
                  </TabsTrigger>
                </TabsList>

                {/* Recent Games */}
                <TabsContent value="games">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden">
                    {playerData.player_data?.recent_games?.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left text-xs font-medium text-zinc-500 uppercase p-4">Date</th>
                            <th className="text-left text-xs font-medium text-zinc-500 uppercase p-4">Opponent</th>
                            <th className="text-right text-xs font-medium text-zinc-500 uppercase p-4">Stats</th>
                            <th className="text-center text-xs font-medium text-zinc-500 uppercase p-4">Result</th>
                            <th className="text-right text-xs font-medium text-zinc-500 uppercase p-4">Impact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerData.player_data.recent_games.map((game, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="p-4 text-zinc-400">{game.date}</td>
                              <td className="p-4 text-white">vs {game.opponent}</td>
                              <td className="p-4 text-right text-zinc-300">
                                {game.points && `${game.points} PTS`}
                                {game.rebounds && ` / ${game.rebounds} REB`}
                                {game.assists && ` / ${game.assists} AST`}
                                {game.passing_yards && `${game.passing_yards} YDS / ${game.touchdowns} TD`}
                                {game.hits !== undefined && `${game.hits} H / ${game.home_runs} HR`}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  game.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {game.result}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                                  game.impact_score > 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                  game.impact_score < 50 ? 'bg-red-500/20 text-red-400' :
                                  'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {game.impact_score > 70 ? <TrendingUp className="w-3 h-3" /> : 
                                   game.impact_score < 50 ? <TrendingDown className="w-3 h-3" /> :
                                   <Activity className="w-3 h-3" />}
                                  <span className="font-mono text-sm">{game.impact_score}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-zinc-500">
                        No recent game data available
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Season Stats */}
                <TabsContent value="season">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                    {playerData.player_data?.season_stats ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(playerData.player_data.season_stats).map(([key, value]) => (
                          <div key={key} className="p-4 bg-white/5 rounded-lg">
                            <span className="text-xs text-zinc-500 uppercase block mb-1">{key}</span>
                            <span className="font-heading font-bold text-xl text-white">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 py-8">
                        {playerData.player_data?.status === 'Retired' || playerData.player_data?.status === 'Deceased'
                          ? 'Career stats not available for historical players'
                          : 'Season stats not available'}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Catalysts */}
                <TabsContent value="catalysts">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
                    <h3 className="font-medium text-white mb-4">Upcoming Catalysts</h3>
                    {playerData.next_catalyst ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-[#007AFF]/10 to-[#00E5FF]/10 rounded-lg border border-[#007AFF]/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-medium text-white">{playerData.next_catalyst.event}</span>
                              <span className="text-sm text-zinc-400 block mt-1">
                                Timeframe: {playerData.next_catalyst.timeframe}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-400 font-mono">{playerData.next_catalyst.potential_impact}</span>
                              <span className="text-xs text-zinc-500 block">
                                {(playerData.next_catalyst.probability * 100).toFixed(0)}% probability
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Upcoming Events */}
                        {playerData.upcoming_events?.length > 0 && (
                          <div>
                            <h4 className="text-sm text-zinc-400 mb-3">Upcoming Games</h4>
                            <div className="space-y-2">
                              {playerData.upcoming_events.slice(0, 3).map((event, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-zinc-500" />
                                    <span className="text-white">{event.date}</span>
                                    <span className="text-zinc-400">vs {event.opponent}</span>
                                  </div>
                                  <div className={`text-sm font-mono ${
                                    event.projected_impact > 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {event.projected_impact > 0 ? '+' : ''}{event.projected_impact}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 py-8">
                        No upcoming catalysts identified
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-20 text-zinc-500">
              Select a player to view performance data
            </div>
          )}
        </div>
      </div>

      {/* Earnings Calendar */}
      <div className="mt-8">
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6">
          <h3 className="font-medium text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Upcoming Events Calendar
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {calendar.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border ${
                  event.event_type === 'market' 
                    ? 'bg-[#007AFF]/10 border-[#007AFF]/30' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <span className="text-xs text-zinc-500 block mb-1">{event.date_display}</span>
                {event.player_name ? (
                  <Link to={`/card/${event.card_id}`} className="text-white font-medium hover:text-[#007AFF] block truncate">
                    {event.player_name}
                  </Link>
                ) : (
                  <span className="text-white font-medium block">{event.description}</span>
                )}
                {event.description && event.player_name && (
                  <span className="text-xs text-zinc-400">{event.description}</span>
                )}
                <div className={`text-xs font-mono mt-2 ${
                  event.projected_impact > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {event.projected_impact > 0 ? '+' : ''}{event.projected_impact}% projected
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
