import React, { useState, useEffect } from 'react';
import { Heart, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase, PropertyMatch, Property } from '../lib/supabase';
import { checkUserForMatches } from '../lib/matches';
import { PropertyCard } from '../components/PropertyCard';

export const MatchesPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [matches, setMatches] = useState<(PropertyMatch & { property: Property })[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [user]);

  const loadMatches = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('property_matches')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      addNotification('Failed to load matches', 'error');
    } else {
      setMatches(data as any || []);
    }

    setLoading(false);
  };

  const checkForNewMatches = async () => {
    if (!user) return;

    setChecking(true);

    try {
      const newMatchCount = await checkUserForMatches(user.id);

      if (newMatchCount > 0) {
        addNotification(`Found ${newMatchCount} new property matches!`, 'success');
        await loadMatches();
      } else {
        addNotification('No new matches found', 'info');
      }
    } catch (error) {
      addNotification('Failed to check for matches', 'error');
    } finally {
      setChecking(false);
    }
  };

  const markAsViewed = async (matchId: string) => {
    await supabase
      .from('property_matches')
      .update({ viewed: true })
      .eq('id', matchId);

    setMatches(matches.map(m => m.id === matchId ? { ...m, viewed: true } : m));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your Property Matches
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Properties that match your preferences
            </p>
          </div>
          <button
            onClick={checkForNewMatches}
            disabled={checking || loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
            <span>Check Matches</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No matches yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Click the button above to check for new property matches
            </p>
            <button
              onClick={checkForNewMatches}
              disabled={checking}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Check for Matches'}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400">
                {matches.length} matches found
              </p>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  {matches.filter(m => !m.viewed).length} New
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => (
                <div key={match.id} className="relative">
                  {!match.viewed && (
                    <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                      NEW
                    </div>
                  )}
                  <PropertyCard
                    property={match.property}
                    onClick={() => markAsViewed(match.id)}
                  />
                  <div className="mt-2 text-center">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      Match Score: {Math.round(match.match_score)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
