import React, { useState, useEffect } from 'react';
import { Plus, RotateCw, Trash2, Settings, X, Save } from 'lucide-react';

export default function ChoreTracker() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingWeek, setEditingWeek] = useState(null);

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
      weekStartDay: 0, // 0 = Sunday, 1 = Monday, etc.
    };

    // Set settings first
    let loadedSettings = defaultSettings;
    if (initSettings) {
      loadedSettings = JSON.parse(initSettings);
      setSettings(loadedSettings);
    } else {
      setSettings(defaultSettings);
      localStorage.setItem('choreSettings', JSON.stringify(defaultSettings));
    }

    // Now load/create data after settings are ready
    if (initData) {
      const parsedData = JSON.parse(initData);
      // Ensure lastTrackedWeek exists
      if (!parsedData.lastTrackedWeek) {
        parsedData.lastTrackedWeek = null;
      }
      setData(parsedData);
    } else {
      // Create default week string without calling getCurrentWeek yet
      const defaultWeek = `${new Date().getFullYear()}-W1`;
      const newData = {
        bathroom: {
          lastCleaner: 'user1',
          lastCleanDate: new Date().toISOString(),
          history: []
        },
        dishes: {
          user1: { completed: 0, week: defaultWeek, penaltyDays: 0 },
          user2: { completed: 0, week: defaultWeek, penaltyDays: 0 }
        },
        trash: {
          user1: { bags: 0, week: defaultWeek },
          user2: { bags: 0, week: defaultWeek }
        },
        weeklyHistory: {},
        lastTrackedWeek: null
      };
      setData(newData);
      localStorage.setItem('choreData', JSON.stringify(newData));
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

  useEffect(() => {
    // Auto-apply penalty when overdue
    applyPenaltyAutomatically();
  }, []);

  // Auto-populate performance history when week changes
  useEffect(() => {
    if (!data || !settings) return;
    
    const currentWeek = getCurrentWeek();
    const lastTrackedWeek = data.lastTrackedWeek;
    const currentDishWeek = data.dishes?.user1?.week;
    
    // Initialize lastTrackedWeek if it doesn't exist
    if (!lastTrackedWeek && currentDishWeek) {
      const newData = { ...data };
      newData.lastTrackedWeek = currentDishWeek;
      setData(newData);
      return;
    }
    
    // Check if we've moved to a new week
    if (lastTrackedWeek && lastTrackedWeek !== currentWeek) {
      // Week has changed, save the old week's data
      const newData = { ...data };
      newData.weeklyHistory = newData.weeklyHistory || {};
      newData.weeklyHistory[lastTrackedWeek] = {
        user1Dishes: newData.dishes.user1.completed,
        user2Dishes: newData.dishes.user2.completed,
        user1Trash: newData.trash.user1.bags,
        user2Trash: newData.trash.user2.bags,
      };
      
      // Reset current week
      newData.dishes = {
        user1: { completed: 0, week: currentWeek, penaltyDays: 0 },
        user2: { completed: 0, week: currentWeek, penaltyDays: 0 }
      };
      newData.trash = {
        user1: { bags: 0, week: currentWeek },
        user2: { bags: 0, week: currentWeek }
      };
      newData.lastTrackedWeek = currentWeek;
      
      setData(newData);
    }
  }, [data?.lastTrackedWeek, settings]);

  const getCurrentWeek = () => {
    const now = new Date();
    const adjustedDate = new Date(now.getTime() + testDateOffset * 24 * 60 * 60 * 1000);
    const weekStartDay = settings?.weekStartDay || 0;
    
    // Calculate week number based on custom week start day
    const firstDay = new Date(adjustedDate.getFullYear(), 0, 1);
    const firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstDay.getDate() - ((firstDay.getDay() - weekStartDay + 7) % 7));
    
    const weekNum = Math.ceil((adjustedDate - firstWeekStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return `${adjustedDate.getFullYear()}-W${weekNum}`;
  };

  const getOther = (u) => u === 'user1' ? 'user2' : 'user1';
  const getName = (u) => u === 'user1' ? (settings?.user1Name || 'You') : (settings?.user2Name || 'Your Brother');
  const getOtherName = (u) => u === 'user1' ? (settings?.user2Name || 'Your Brother') : (settings?.user1Name || 'You');

  const handleBathroomClean = (cleaner) => {
    const newData = { ...data };
    const other = getOther(cleaner);
    
    const now = new Date();
    const cleanDate = now.toISOString();
    
    newData.bathroom.lastCleaner = cleaner;
    newData.bathroom.lastCleanDate = cleanDate;
    newData.bathroom.history.push({
      cleaner,
      date: cleanDate,
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
    
    // Calculate days elapsed based on calendar dates
    const lastCleanDate = new Date(lastClean.getFullYear(), lastClean.getMonth(), lastClean.getDate());
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysElapsed = Math.floor((todayDate - lastCleanDate) / (1000 * 60 * 60 * 24));
    
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

  const handleRemoveDishDuty = (user) => {
    const newData = { ...data };
    const currentWeek = getCurrentWeek();
    
    if (newData.dishes[user].week !== currentWeek) {
      newData.dishes[user] = { completed: 0, week: currentWeek, penaltyDays: 0 };
    }
    
    newData.dishes[user].completed = Math.max(0, newData.dishes[user].completed - 1);
    setData(newData);
  };

  const applyPenaltyAutomatically = () => {
    const bathroomStatus = getBathroomStatus();
    if (!bathroomStatus || bathroomStatus.penalty === 0) return;
    
    const currentWeek = getCurrentWeek();
    const nextCleaner = bathroomStatus.currentTurn;
    const newData = { ...data };
    
    if (newData.dishes[nextCleaner].week !== currentWeek) {
      newData.dishes[nextCleaner] = { completed: 0, week: currentWeek, penaltyDays: 0 };
    }
    
    // Always update to the current penalty value (not just if it's 0)
    if (newData.dishes[nextCleaner].penaltyDays !== bathroomStatus.penalty) {
      newData.dishes[nextCleaner].penaltyDays = bathroomStatus.penalty;
      setData(newData);
    }
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

  const handleRemoveTrash = (user) => {
    const newData = { ...data };
    const currentWeek = getCurrentWeek();
    
    if (newData.trash[user].week !== currentWeek) {
      newData.trash[user] = { bags: 0, week: currentWeek };
    }
    
    newData.trash[user].bags = Math.max(0, newData.trash[user].bags - 1);
    setData(newData);
  };

  const updatePerformanceHistory = (week, metric, change) => {
    const newData = { ...data };
    
    if (newData.weeklyHistory[week]) {
      const newValue = Math.max(0, newData.weeklyHistory[week][metric] + change);
      newData.weeklyHistory[week][metric] = newValue;
      setData(newData);
    }
  };

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
  };

  if (loading || !data || !settings) {
    return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">Loading...</div>;
  }

  const workingData = testMode ? testData : data;
  const bathroomStatus = getBathroomStatus();
  const currentWeek = getCurrentWeek();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Chore Tracker</h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setTempSettings(settings) || setShowSettings(true)}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={24} />
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-800">
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
                  <label className="block text-sm font-semibold mb-2">Week Starts On</label>
                  <select
                    value={tempSettings?.weekStartDay || 0}
                    onChange={(e) => setTempSettings({...tempSettings, weekStartDay: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
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
                  Save & Close
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
                {bathroomStatus.isDue && <p className="text-sm font-semibold text-yellow-200">Should clean between days {settings.windowStartDay}-{settings.windowEndDay}</p>}
                {bathroomStatus.isOverdue && <p className="text-sm font-semibold text-red-200">Overdue! Penalty: {bathroomStatus.penalty} dish duties</p>}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleBathroomClean('user1')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {getName('user1')} Cleaned It
              </button>
              <button
                onClick={() => handleBathroomClean('user2')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {getName('user2')} Cleaned It
              </button>
            </div>
          </div>

          {/* Dish Duty */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-6 text-green-400">Dish Duty</h2>
            
            <div className="space-y-4 mb-6">
              {['user1', 'user2'].map((user) => {
                const dishes = workingData.dishes[user];
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
              <button
                onClick={() => handleRemoveDishDuty(user)}
                className="w-full mt-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                Remove Duty
              </button>
                  </div>
                );
              })}
            </div>
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
                  <button
                    onClick={() => handleRemoveTrash(user)}
                    className="w-full mt-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    Remove Bag
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History Dashboard */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-bold mb-6 text-slate-300">Performance History</h2>
          {Object.keys(data.weeklyHistory || {}).length === 0 ? (
            <p className="text-slate-400">No history yet. Weeks will automatically populate here once 7 days have passed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Week</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">{getName('user1')} Dishes</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">{getName('user2')} Dishes</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">{getName('user1')} Trash</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">{getName('user2')} Trash</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.weeklyHistory || {}).sort().reverse().map(([week, stats]) => (
                    <tr key={week} className="border-b border-slate-700 hover:bg-slate-700 group">
                      <td className="py-3 px-4 text-slate-300">{week}</td>
                      {editingWeek === week ? (
                        <>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-400 font-semibold">{stats.user1Dishes}</span>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user1Dishes', 1)}
                                  className="text-blue-400 hover:text-blue-300 text-xs leading-none font-semibold"
                                >
                                  Up
                                </button>
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user1Dishes', -1)}
                                  className="text-blue-400 hover:text-blue-300 text-xs leading-none font-semibold"
                                >
                                  Dn
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400 font-semibold">{stats.user2Dishes}</span>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user2Dishes', 1)}
                                  className="text-purple-400 hover:text-purple-300 text-xs leading-none font-semibold"
                                >
                                  Up
                                </button>
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user2Dishes', -1)}
                                  className="text-purple-400 hover:text-purple-300 text-xs leading-none font-semibold"
                                >
                                  Dn
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-orange-400 font-semibold">{stats.user1Trash}</span>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user1Trash', 1)}
                                  className="text-orange-400 hover:text-orange-300 text-xs leading-none font-semibold"
                                >
                                  Up
                                </button>
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user1Trash', -1)}
                                  className="text-orange-400 hover:text-orange-300 text-xs leading-none font-semibold"
                                >
                                  Dn
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-orange-400 font-semibold">{stats.user2Trash}</span>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user2Trash', 1)}
                                  className="text-orange-400 hover:text-orange-300 text-xs leading-none font-semibold"
                                >
                                  Up
                                </button>
                                <button
                                  onClick={() => updatePerformanceHistory(week, 'user2Trash', -1)}
                                  className="text-orange-400 hover:text-orange-300 text-xs leading-none font-semibold"
                                >
                                  Dn
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setEditingWeek(null)}
                              className="text-slate-400 hover:text-slate-200 text-sm"
                            >
                              Done
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-blue-400 font-semibold">{stats.user1Dishes}</td>
                          <td className="py-3 px-4 text-purple-400 font-semibold">{stats.user2Dishes}</td>
                          <td className="py-3 px-4 text-orange-400 font-semibold">{stats.user1Trash}</td>
                          <td className="py-3 px-4 text-orange-400 font-semibold">{stats.user2Trash}</td>
                          <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingWeek(week)}
                              className="text-slate-400 hover:text-slate-200 text-sm"
                              title="Edit"
                            >
                              Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-bold mb-6 text-slate-300">Bathroom Cleaning History</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.bathroom.history.length === 0 ? (
              <p className="text-slate-400">No bathroom cleanings logged yet.</p>
            ) : (
              [...data.bathroom.history].reverse().map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg text-sm">
                  <span>{getName(entry.cleaner)} cleaned</span>
                  <span className="text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clear History Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              const setWorkingData = testMode ? setTestData : setData;
              const workingData = testMode ? testData : data;
              const newData = { ...workingData };
              newData.bathroom.history = [];
              setWorkingData(newData);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Clear Bathroom History
          </button>
          <button
            onClick={() => {
              const setWorkingData = testMode ? setTestData : setData;
              const workingData = testMode ? testData : data;
              const newData = { ...workingData };
              newData.weeklyHistory = {};
              setWorkingData(newData);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Clear All Performance History
          </button>
        </div>
      </div>
    </div>
  );
}
