import React, { useState, useEffect } from 'react';
import { Plus, RotateCw, Trash2, Settings, X, Save } from 'lucide-react';

export default function ChoreTracker() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize data and settings
  useEffect(() => {
    const initData = localStorage.getItem('choreData');
    const initSettings = localStorage.getItem('choreSettings');
    
    const defaultSettings = {
      bathroomWindow: 10,
      windowStartDay: 6,
      windowEndDay: 9,
      penaltyDay10: 1,
      penaltyAfterDay10: 2,
      dishDutiesPerWeek: 2,
      user1Name: 'You',
      user2Name: 'Your Brother',
    };

    if (initData) {
      setData(JSON.parse(initData));
    } else {
      const newData = {
        bathroom: {
          lastCleaner: 'user1',
          lastCleanDate: new Date().toISOString(),
          history: []
        },
        dishes: {
          user1: { completed: 0, week: getCurrentWeek(), penaltyDays: 0 },
          user2: { completed: 0, week: getCurrentWeek(), penaltyDays: 0 }
        },
        trash: {
          user1: { bags: 0, week: getCurrentWeek() },
          user2: { bags: 0, week: getCurrentWeek() }
        }
      };
      setData(newData);
      localStorage.setItem('choreData', JSON.stringify(newData));
    }

    if (initSettings) {
      setSettings(JSON.parse(initSettings));
    } else {
      setSettings(defaultSettings);
      localStorage.setItem('choreSettings', JSON.stringify(defaultSettings));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (data) {
      localStorage.setItem('choreData', JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    if (settings) {
      localStorage.setItem('choreSettings', JSON.stringify(settings));
    }
  }, [settings]);

  const getCurrentWeek = () => {
    const now = new Date();
    return `${now.getFullYear()}-W${Math.ceil((now.getDate()) / 7)}`;
  };

  const getOther = (u) => u === 'user1' ? 'user2' : 'user1';
  const getName = (u) => u === 'user1' ? (settings?.user1Name || 'You') : (settings?.user2Name || 'Your Brother');
  const getOtherName = (u) => u === 'user1' ? (settings?.user2Name || 'Your Brother') : (settings?.user1Name || 'You');

  const handleBathroomClean = (cleaner) => {
    const newData = { ...data };
    const other = getOther(cleaner);
    
    newData.bathroom.lastCleaner = cleaner;
    newData.bathroom.lastCleanDate = new Date().toISOString();
    newData.bathroom.history.push({
      cleaner,
      date: newData.bathroom.lastCleanDate,
      daysCleaned: 0
    });

    // Reset penalty for other user
    if (newData.dishes[other].week === getCurrentWeek()) {
      newData.dishes[other].penaltyDays = 0;
    }

    setData(newData);
  };

  const getBathroomStatus = () => {
    if (!data?.bathroom || !settings) return null;
    const lastClean = new Date(data.bathroom.lastCleanDate);
    const now = new Date();
    const daysElapsed = Math.floor((now - lastClean) / (1000 * 60 * 60 * 24));
    const nextCleaner = data.bathroom.lastCleaner === 'user1' ? 'user2' : 'user1';
    
    let penalty = 0;
    if (daysElapsed === settings.bathroomWindow) {
      penalty = settings.penaltyDay10;
    } else if (daysElapsed > settings.bathroomWindow) {
      penalty = settings.penaltyAfterDay10;
    }
    
    return {
      daysElapsed,
      currentTurn: nextCleaner,
      isDue: daysElapsed >= settings.windowStartDay && daysElapsed <= settings.windowEndDay,
      isOverdue: daysElapsed > settings.windowEndDay,
      windowOpen: daysElapsed >= settings.windowStartDay,
      penalty
    };
  };

  const handleDishDuty = (user) => {
    const newData = { ...data };
    const currentWeek = getCurrentWeek();
    
    if (newData.dishes[user].week !== currentWeek) {
      newData.dishes[user] = { completed: 0, week: currentWeek, penaltyDays: 0 };
    }
    
    newData.dishes[user].completed += 1;
    setData(newData);
  };

  const handleTrash = (user) => {
    const newData = { ...data };
    const currentWeek = getCurrentWeek();
    
    if (newData.trash[user].week !== currentWeek) {
      newData.trash[user] = { bags: 0, week: currentWeek };
    }
    
    newData.trash[user].bags += 1;
    setData(newData);
  };

  const handleApplyPenalty = (user, penaltyDays) => {
    const newData = { ...data };
    const currentWeek = getCurrentWeek();
    
    if (newData.dishes[user].week !== currentWeek) {
      newData.dishes[user] = { completed: 0, week: currentWeek, penaltyDays: 0 };
    }
    
    newData.dishes[user].penaltyDays = penaltyDays;
    setData(newData);
  };

  const resetWeek = () => {
    const newData = {
      ...data,
      dishes: {
        user1: { completed: 0, week: getCurrentWeek(), penaltyDays: 0 },
        user2: { completed: 0, week: getCurrentWeek(), penaltyDays: 0 }
      },
      trash: {
        user1: { bags: 0, week: getCurrentWeek() },
        user2: { bags: 0, week: getCurrentWeek() }
      }
    };
    setData(newData);
  };

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
  };

  if (loading || !data || !settings) {
    return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">Loading...</div>;
  }

  const bathroomStatus = getBathroomStatus();
  const currentWeek = getCurrentWeek();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Chore Tracker</h1>
          <button
            onClick={() => setTempSettings(settings) || setShowSettings(true)}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={24} />
          </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Person 1 Name</label>
                  <input
                    type="text"
                    value={tempSettings?.user1Name || 'You'}
                    onChange={(e) => setTempSettings({...tempSettings, user1Name: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Person 2 Name</label>
                  <input
                    type="text"
                    value={tempSettings?.user2Name || 'Your Brother'}
                    onChange={(e) => setTempSettings({...tempSettings, user2Name: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <hr className="border-slate-600" />

                <div>
                  <label className="block text-sm font-semibold mb-2">Bathroom Window (days)</label>
                  <input
                    type="number"
                    value={tempSettings?.bathroomWindow || 10}
                    onChange={(e) => setTempSettings({...tempSettings, bathroomWindow: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Window Start Day</label>
                  <input
                    type="number"
                    value={tempSettings?.windowStartDay || 6}
                    onChange={(e) => setTempSettings({...tempSettings, windowStartDay: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Window End Day</label>
                  <input
                    type="number"
                    value={tempSettings?.windowEndDay || 9}
                    onChange={(e) => setTempSettings({...tempSettings, windowEndDay: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Penalty on Day {tempSettings?.bathroomWindow || 10}</label>
                  <input
                    type="number"
                    value={tempSettings?.penaltyDay10 || 1}
                    onChange={(e) => setTempSettings({...tempSettings, penaltyDay10: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">dish duties</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Penalty After Day {tempSettings?.bathroomWindow || 10}</label>
                  <input
                    type="number"
                    value={tempSettings?.penaltyAfterDay10 || 2}
                    onChange={(e) => setTempSettings({...tempSettings, penaltyAfterDay10: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">dish duties</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Dish Duties Per Week</label>
                  <input
                    type="number"
                    value={tempSettings?.dishDutiesPerWeek || 2}
                    onChange={(e) => setTempSettings({...tempSettings, dishDutiesPerWeek: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Bathroom */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-6 text-blue-400">Bathroom</h2>
            
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">Current Turn</p>
              <p className="text-2xl font-bold">{getName(bathroomStatus.currentTurn)}</p>
              <p className="text-xs text-slate-400 mt-2">
                {bathroomStatus.daysElapsed} of {settings.bathroomWindow} days elapsed
              </p>
            </div>

            {bathroomStatus.windowOpen && (
              <div className={`mb-6 p-4 rounded-lg ${
                bathroomStatus.isDue ? 'bg-yellow-900 border border-yellow-700' : 
                bathroomStatus.isOverdue ? 'bg-red-900 border border-red-700' : 'bg-slate-700'
              }`}>
                {bathroomStatus.isDue && <p className="text-sm font-semibold text-yellow-200">‚è∞ Should clean between days {settings.windowStartDay}-{settings.windowEndDay}</p>}
                {bathroomStatus.isOverdue && <p className="text-sm font-semibold text-red-200">üö® Overdue! Penalty: {bathroomStatus.penalty} dish duties</p>}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleBathroomClean('user1')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                You Cleaned It
              </button>
              <button
                onClick={() => handleBathroomClean('user2')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Brother Cleaned It
              </button>
            </div>

            {bathroomStatus.penalty > 0 && bathroomStatus.isOverdue && (
              <button
                onClick={() => handleApplyPenalty(bathroomStatus.currentTurn, bathroomStatus.penalty)}
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                Apply {bathroomStatus.penalty} Dish Penalty
              </button>
            )}
          </div>

          {/* Dish Duty */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-6 text-green-400">Dish Duty</h2>
            
            <div className="space-y-4 mb-6">
              {['user1', 'user2'].map((user) => {
                const dishes = data.dishes[user];
                const targetDuties = settings.dishDutiesPerWeek + (dishes.penaltyDays || 0);
                const remaining = Math.max(0, targetDuties - dishes.completed);
                
                return (
                  <div key={user} className="p-4 bg-slate-700 rounded-lg">
                    <p className="text-sm text-slate-300 mb-2">{getName(user)}</p>
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-3xl font-bold">{dishes.completed}</p>
                        <p className="text-xs text-slate-400">of {targetDuties} duties</p>
                      </div>
                      {dishes.penaltyDays > 0 && (
                        <span className="text-xs bg-red-700 px-2 py-1 rounded text-red-100">
                          +{dishes.penaltyDays} penalty
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDishDuty(user)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Log Duty
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={resetWeek}
              className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <RotateCw size={16} />
              Reset Week
            </button>
          </div>

          {/* Trash */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-6 text-orange-400">Trash</h2>
            
            <div className="space-y-4">
              {['user1', 'user2'].map((user) => (
                <div key={user} className="p-4 bg-slate-700 rounded-lg">
                  <p className="text-sm text-slate-300 mb-3">{getName(user)}</p>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-3xl font-bold">{data.trash[user].bags}</p>
                    <p className="text-xs text-slate-400">bags</p>
                  </div>
                  <button
                    onClick={() => handleTrash(user)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Log Bag
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={resetWeek}
              className="w-full mt-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <RotateCw size={16} />
              Reset Week
            </button>
          </div>
        </div>

        {/* History */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-slate-300">Bathroom History</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...data.bathroom.history].reverse().map((entry, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg text-sm">
                <span>{getName(entry.cleaner)} cleaned</span>
                <span className="text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
