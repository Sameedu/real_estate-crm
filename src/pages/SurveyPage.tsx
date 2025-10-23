import React, { useState } from 'react';
import { Home, MapPin, DollarSign, Bed, Maximize } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import { sendToN8N } from '../lib/n8n';
import { checkUserForMatches } from '../lib/matches';

interface SurveyPageProps {
  onComplete: () => void;
}

export const SurveyPage: React.FC<SurveyPageProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    city: '',
    max_price: '',
    property_type: '',
    size_range: '',
    bedrooms: '',
  });

  const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Goa'];
  const propertyTypes = ['apartment', 'villa', 'plot'];
  const sizeRanges = ['< 1000 sq.ft', '1000-2000 sq.ft', '2000-3000 sq.ft', '> 3000 sq.ft'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase.from('user_preferences').insert({
        user_id: user.id,
        city: preferences.city,
        max_price: preferences.max_price ? parseFloat(preferences.max_price) : null,
        property_type: preferences.property_type,
        size_range: preferences.size_range,
        bedrooms: preferences.bedrooms ? parseInt(preferences.bedrooms) : null,
      });

      if (error) throw error;

      await sendToN8N({
        event: 'survey',
        user_id: user.id,
        preferences: {
          city: preferences.city,
          price: preferences.max_price ? parseFloat(preferences.max_price) : undefined,
          type: preferences.property_type,
          size: preferences.size_range,
          rooms: preferences.bedrooms ? parseInt(preferences.bedrooms) : undefined,
        },
      });

      const matchCount = await checkUserForMatches(user.id);

      if (matchCount > 0) {
        addNotification(`Preferences saved! Found ${matchCount} matching properties!`, 'success');
      } else {
        addNotification('Preferences saved successfully!', 'success');
      }

      onComplete();
    } catch (error) {
      addNotification('Failed to save preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-blue-600 rounded-full">
              <Home className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Tell Us Your Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Help us find your perfect property match
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="h-4 w-4 mr-2" />
                Preferred City
              </label>
              <select
                required
                value={preferences.city}
                onChange={(e) => setPreferences({ ...preferences, city: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a city</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="h-4 w-4 mr-2" />
                Maximum Price (INR)
              </label>
              <input
                type="number"
                required
                value={preferences.max_price}
                onChange={(e) => setPreferences({ ...preferences, max_price: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10000000"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Home className="h-4 w-4 mr-2" />
                Property Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {propertyTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, property_type: type })}
                    className={`py-3 rounded-lg border-2 font-medium capitalize transition-all ${
                      preferences.property_type === type
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Maximize className="h-4 w-4 mr-2" />
                Size Range
              </label>
              <select
                required
                value={preferences.size_range}
                onChange={(e) => setPreferences({ ...preferences, size_range: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select size range</option>
                {sizeRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Bed className="h-4 w-4 mr-2" />
                Number of Bedrooms
              </label>
              <input
                type="number"
                required
                min="1"
                max="10"
                value={preferences.bedrooms}
                onChange={(e) => setPreferences({ ...preferences, bedrooms: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="3"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
