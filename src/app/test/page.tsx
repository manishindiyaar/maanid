'use client';

import React, { useState, useEffect } from 'react';

interface Bot {
  id: string;
  name: string;
  platform: string;
  username?: string | null;
  is_active: boolean;
  token: string | null;
  created_at: string;
}

export default function BotsViewer() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBots() {
      try {
        const res = await fetch('/api/bots/list-available');
        
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status} - ${res.statusText}`);
        }
        
        const result = await res.json();

        if (result.error) {
          throw new Error(result.error || 'Failed to fetch bots');
        }

        setBots(result.bots || []);
        console.log('Fetched bots:', result.bots);
      } catch (err) {
        console.error('Error fetching bots:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchBots();
  }, []);

  if (loading) return (
    <div className="p-4">
      <div className="h-6 w-24 bg-gray-200 animate-pulse rounded mb-4"></div>
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-4">
      <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Available Bots</h2>
      {bots.length === 0 ? (
        <div className="p-8 text-center border border-gray-200 rounded bg-gray-50">
          <p className="text-gray-500">No bots found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bots.map((bot) => (
            <div key={bot.id} className="p-4 border rounded bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">{bot.name}</h3>
                  <p className="text-sm text-gray-500">
                    @{bot.username || 'no-username'} • {bot.platform}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  bot.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {bot.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Created: {new Date(bot.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
