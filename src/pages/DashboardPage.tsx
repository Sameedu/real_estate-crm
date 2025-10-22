import React, { useState, useEffect } from 'react';
import { Users, Search as SearchIcon, MessageCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchDashboardData } from '../lib/n8n';
import { useNotification } from '../contexts/NotificationContext';

interface DashboardStats {
  totalUsers: number;
  recentSignups: number;
  totalSearches: number;
  totalChats: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export const DashboardPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    recentSignups: 0,
    totalSearches: 0,
    totalChats: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [usersResult, searchesResult, chatsResult] = await Promise.all([
        supabase.from('profiles').select('id, created_at', { count: 'exact' }),
        supabase.from('search_history').select('id', { count: 'exact' }),
        supabase.from('chat_messages').select('id', { count: 'exact' }),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recentSignupsResult = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', today.toISOString());

      const activities: RecentActivity[] = [];

      const recentSearches = await supabase
        .from('search_history')
        .select('id, query, timestamp, profiles(name)')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (recentSearches.data) {
        recentSearches.data.forEach((search: any) => {
          activities.push({
            id: search.id,
            type: 'search',
            description: `${search.profiles?.name || 'User'} searched for "${search.query || 'properties'}"`,
            timestamp: search.timestamp,
          });
        });
      }

      const recentChats = await supabase
        .from('chat_messages')
        .select('id, message, timestamp, profiles(name)')
        .eq('is_user', true)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (recentChats.data) {
        recentChats.data.forEach((chat: any) => {
          activities.push({
            id: chat.id,
            type: 'chat',
            description: `${chat.profiles?.name || 'User'} sent a message`,
            timestamp: chat.timestamp,
          });
        });
      }

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setStats({
        totalUsers: usersResult.count || 0,
        recentSignups: recentSignupsResult.data?.length || 0,
        totalSearches: searchesResult.count || 0,
        totalChats: chatsResult.count || 0,
      });

      setRecentActivities(activities.slice(0, 10));

      const n8nData = await fetchDashboardData();
      if (n8nData) {
        console.log('N8N Dashboard Data:', n8nData);
      }
    } catch (error) {
      addNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: `+${stats.recentSignups} today`,
    },
    {
      title: 'Total Searches',
      value: stats.totalSearches,
      icon: SearchIcon,
      color: 'bg-green-500',
      change: 'All time',
    },
    {
      title: 'Chat Messages',
      value: stats.totalChats,
      icon: MessageCircle,
      color: 'bg-purple-500',
      change: 'All time',
    },
    {
      title: 'Engagement',
      value: stats.totalUsers > 0 ? Math.round((stats.totalSearches + stats.totalChats) / stats.totalUsers) : 0,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: 'Avg per user',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor platform activity and user engagement
            </p>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 ${card.color} rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  {card.title}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.change}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Recent Activity
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : recentActivities.length === 0 ? (
            <p className="text-center py-12 text-gray-600 dark:text-gray-400">
              No recent activity
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'search'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-purple-100 dark:bg-purple-900/30'
                    }`}
                  >
                    {activity.type === 'search' ? (
                      <SearchIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
