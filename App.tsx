
import React, { useState, useEffect, useRef } from 'react';
import { View, Parcel, ParcelStatus, Hub, ChatMessage, Notification } from './types';
import { MOCK_NOTIFICATIONS, Icons } from './constants';
import { QRGenerator } from './components/QRGenerator';
import { getChatResponse } from './services/geminiService';
import { parcelsService, hubsService } from './services/firebaseService';
import { useAuth } from './contexts/AuthContext';
import { getUserData } from './services/userService';

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<View>('home');
  const [viewHistory, setViewHistory] = useState<View[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive States
  const [userProfile, setUserProfile] = useState({
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    phone: '+1 (555) 012-3456',
    uniDropId: 'UD-284-911-X'
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: true,
    biometric: true,
    marketing: false
  });

  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! How can I help you with your parcels today?', timestamp: new Date() }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load user data from Firebase
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        const userData = await getUserData(user.uid);
        if (userData) {
          setUserProfile(prev => ({
            ...prev,
            name: userData.displayName || user?.displayName || prev.name,
            email: userData.email || user?.email || prev.email,
            uniDropId: userData.unidropID || prev.uniDropId
          }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user]);

  // Load data from Firebase - ONLY real data, no mock fallbacks
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const userId = user.uid;
        const [parcelsData, hubsData] = await Promise.all([
          parcelsService.getParcels(userId),
          hubsService.getHubs()
        ]);
        // Only use real data from Firebase
        setParcels(parcelsData);
        setHubs(hubsData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Set empty arrays on error - no mock data
        setParcels([]);
        setHubs([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time subscriptions - only real data
    const unsubscribeParcels = parcelsService.subscribeToParcels(user.uid, (updatedParcels) => {
      setParcels(updatedParcels);
    });

    const unsubscribeHubs = hubsService.subscribeToHubs((updatedHubs) => {
      setHubs(updatedHubs);
    });

    return () => {
      unsubscribeParcels();
      unsubscribeHubs();
    };
  }, [user]);

  // Navigation Helpers
  const navigateTo = (view: View) => {
    if (view !== activeView) {
      setViewHistory(prev => [...prev, activeView]);
      setActiveView(view);
      const mainEl = document.getElementById('main-content');
      if (mainEl) mainEl.scrollTop = 0;
    }
  };

  const goBack = () => {
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setViewHistory(prevStack => prevStack.slice(0, -1));
      setActiveView(prev);
    } else {
      setActiveView('home');
    }
  };

  const getTabForView = (view: View) => {
    if (view === 'home') return 'home';
    if (view === 'parcels' || view === 'parcel-detail') return 'parcels';
    if (view === 'hubs' || view === 'hub-detail') return 'hubs';
    if (view === 'support') return 'support';
    if (['profile', 'notifications', 'settings', 'personal-info', 'default-hub'].includes(view)) return 'profile';
    return 'home';
  };

  const toggleSetting = (key: keyof typeof securitySettings) => {
    setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaveLoading(true);
    setTimeout(() => {
      setIsSaveLoading(false);
      goBack();
    }, 800);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('message') as HTMLInputElement);
    const msg = input.value.trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: msg,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    input.value = '';
    setIsTyping(true);

    const history = chatMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const responseText = await getChatResponse(msg, history);
    
    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const PageHeader = ({ title, back = false, rightElement }: { title: string, back?: boolean, rightElement?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {back && (
          <button onClick={goBack} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
            <Icons.ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      </div>
      {rightElement}
    </div>
  );

  // Get ready parcel for home view
  const readyParcel = parcels.find(p => p.status === ParcelStatus.READY);
  const readyParcelHub = readyParcel ? hubs.find(h => h.id === readyParcel.hubId) : null;
  const activeParcels = parcels.filter(p => p.status !== ParcelStatus.COLLECTED);
  const otherParcels = activeParcels.filter(p => p.id !== readyParcel?.id);

  const renderHome = () => {
    if (loading) {
      return (
        <div className="space-y-6 animate-fadeIn flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Loading parcels...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fadeIn">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Hello, {userProfile.name.split(' ')[0]}</h1>
              <div className="bg-purple-100/50 backdrop-blur-sm border border-purple-200 px-2 py-0.5 rounded-lg">
                <span className="text-[10px] font-black text-purple-700 tracking-tighter">{userProfile.uniDropId}</span>
              </div>
            </div>
            <p className="text-slate-500">
              {readyParcel ? 'You have 1 parcel ready for collection' : `You have ${activeParcels.length} active parcels`}
            </p>
          </div>
          <button onClick={() => navigateTo('notifications')} className="relative p-2 bg-white rounded-full shadow-sm active:scale-90 transition-transform">
            <Icons.Bell className="w-6 h-6 text-slate-600" />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </header>

        {/* Quick Action Card */}
        {readyParcel && (
          <div className="bg-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-purple-100 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-lg font-semibold opacity-90">Ready to Collect</h2>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold">{readyParcel.collectionPin}</span>
                <span className="text-purple-200 text-sm">Collection PIN</span>
              </div>
              <p className="mt-4 text-purple-100 text-sm">
                {readyParcelHub ? `${readyParcelHub.name} (${readyParcelHub.distance})` : 'Collection Hub'}
              </p>
              <button 
                onClick={() => { 
                  setSelectedParcel(readyParcel); 
                  setIsQRModalOpen(true); 
                }} 
                className="mt-6 bg-white text-purple-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-purple-50 transition-colors active:scale-95"
              >
                <Icons.Scan className="w-5 h-5" /> Show QR Code
              </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full -mr-10 -mt-10 opacity-30"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-700 rounded-full -ml-8 -mb-8 opacity-20"></div>
          </div>
        )}

        {/* Active Parcels Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Active Parcels</h3>
            <button onClick={() => navigateTo('parcels')} className="text-purple-600 font-medium text-sm">See all</button>
          </div>
          <div className="space-y-4">
            {otherParcels.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
                <Icons.Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No other active parcels</p>
              </div>
            ) : (
              otherParcels.slice(0, 2).map(parcel => (
                <div 
                  key={parcel.id} 
                  onClick={() => { setSelectedParcel(parcel); navigateTo('parcel-detail'); }} 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-95 transition-transform cursor-pointer"
                >
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                    <Icons.Box className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{parcel.trackingNumber}</h4>
                    <p className="text-xs text-slate-500">{parcel.courier} • {parcel.estimatedArrival}</p>
                  </div>
                  <Icons.ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderNotifications = () => (
    <div className="animate-fadeIn space-y-6">
      <PageHeader 
        title="Notifications" 
        back 
        rightElement={<button onClick={markAllAsRead} className="text-xs font-bold text-purple-600 active:opacity-50">Mark all read</button>} 
      />
      <div className="space-y-3">
        {notifications.map(notif => (
          <div key={notif.id} className={`p-5 rounded-3xl border ${notif.read ? 'bg-white border-slate-100' : 'bg-purple-50 border-purple-100'} shadow-sm relative overflow-hidden transition-all active:scale-98`}>
            {!notif.read && <div className="absolute top-0 right-0 w-2 h-2 bg-purple-600 rounded-bl-xl"></div>}
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-800">{notif.title}</h4>
              <span className="text-[10px] text-slate-400 font-medium">{notif.time}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{notif.body}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => {
    const items = [
      { key: 'twoFactor', icon: <Icons.Shield className="w-5 h-5" />, title: 'Two-Factor Auth', desc: 'Secure your login with SMS' },
      { key: 'biometric', icon: <Icons.User className="w-5 h-5" />, title: 'Biometric Login', desc: 'Face ID or Fingerprint' },
      { key: 'marketing', icon: <Icons.Bell className="w-5 h-5" />, title: 'Marketing Alerts', desc: 'Email and push notifications' },
    ] as const;

    return (
      <div className="animate-fadeIn space-y-6">
        <PageHeader title="Security & Privacy" back />
        <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 space-y-8">
          {items.map((item, i) => {
            const isActive = securitySettings[item.key];
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-purple-600">{item.icon}</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleSetting(item.key)}
                  className={`w-12 h-6 rounded-full transition-colors duration-300 relative focus:outline-none shrink-0 ${isActive ? 'bg-purple-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>
            );
          })}
          <div className="pt-4 border-t border-slate-50">
            <button className="w-full text-red-500 font-bold text-sm text-center px-2 py-2 rounded-xl active:bg-red-50 transition-colors">Delete My Account</button>
          </div>
        </div>
      </div>
    );
  };

  const renderPersonalInfo = () => (
    <div className="animate-fadeIn space-y-6">
      <PageHeader title="Personal Information" back />
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-slate-50 overflow-hidden shadow-lg">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button className="text-purple-600 font-bold text-xs mt-3 active:opacity-50">Change Avatar</button>
        </div>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <input 
            type="text" 
            value={userProfile.name} 
            onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))} 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 outline-none text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" 
          />
          <input 
            type="email" 
            value={userProfile.email} 
            onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))} 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 outline-none text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" 
          />
          <input 
            type="text" 
            value={userProfile.phone} 
            onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))} 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 outline-none text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" 
          />
          <button 
            type="submit" 
            disabled={isSaveLoading} 
            className={`w-full ${isSaveLoading ? 'bg-purple-400' : 'bg-purple-600'} text-white py-4 rounded-3xl font-bold shadow-lg shadow-purple-100 mt-4 transition-all active:scale-95 flex items-center justify-center gap-2`}
          >
            {isSaveLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderDefaultHub = () => (
    <div className="animate-fadeIn space-y-6">
      <PageHeader title="Default Hub" back />
      <p className="text-sm text-slate-500 px-2 leading-relaxed">Set your primary collection point to skip location selection during checkout.</p>
      <div className="space-y-3">
        {hubs.map(hub => {
          const isSelected = selectedHub?.id === hub.id || (!selectedHub && hub.id === 'h1');
          return (
            <div 
              key={hub.id} 
              onClick={() => setSelectedHub(hub)} 
              className={`bg-white p-5 rounded-3xl border-2 shadow-sm flex items-center justify-between transition-all cursor-pointer active:scale-98 ${isSelected ? 'border-purple-600 bg-purple-50/30' : 'border-slate-100'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                  <Icons.MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{hub.name}</h4>
                  <p className="text-[10px] text-slate-500">{hub.distance} away • {hub.status}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-purple-600 bg-purple-600' : 'border-slate-200'}`}>
                {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderHubDetail = () => {
    if (!selectedHub) return null;
    return (
      <div className="animate-fadeIn space-y-6">
        <PageHeader title="Hub Information" back />
        <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100">
          <div className="h-48 bg-slate-100 flex items-center justify-center text-slate-300 relative">
            <Icons.Map className="w-16 h-16 opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{selectedHub.name}</h2>
              <p className="text-slate-500 text-sm mt-1">{selectedHub.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                <Icons.Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Hours</p>
                  <p className="text-xs font-bold">08:00 - 20:00</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                <Icons.Box className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Locker</p>
                  <p className="text-xs font-bold">{selectedHub.status}</p>
                </div>
              </div>
            </div>
            <button className="w-full bg-purple-600 text-white py-4 rounded-3xl font-bold shadow-lg shadow-purple-100 flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Icons.MapPin className="w-5 h-5" /> Get Directions
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHubs = () => (
    <div className="space-y-4 animate-fadeIn">
      <h1 className="text-2xl font-bold">Collection Points</h1>
      <div className="w-full aspect-[4/3] bg-purple-50 rounded-3xl border border-purple-100 relative overflow-hidden shadow-inner shrink-0">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <Icons.Map className="w-48 h-48 text-purple-600" />
        </div>
        {hubs.map((hub, i) => (
          <div 
            key={hub.id} 
            onClick={() => { setSelectedHub(hub); navigateTo('hub-detail'); }} 
            className="absolute p-2 bg-white rounded-full shadow-lg border-2 border-purple-500 flex items-center justify-center animate-bounce cursor-pointer" 
            style={{ top: `${20 + (i * 25)}%`, left: `${30 + (i * 20)}%`, animationDelay: `${i * 0.2}s` }}
          >
            <Icons.MapPin className="w-5 h-5 text-purple-600" />
          </div>
        ))}
      </div>
      <div className="space-y-3 pb-6">
        {hubs.map(hub => (
          <div 
            key={hub.id} 
            onClick={() => { setSelectedHub(hub); navigateTo('hub-detail'); }} 
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer active:bg-slate-50 transition-colors shrink-0"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Icons.MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">{hub.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{hub.address}</p>
            </div>
            <Icons.ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8 animate-fadeIn">
      <h1 className="text-2xl font-bold">Account</h1>
      
      {/* UniDrop ID Card */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-[32px] p-6 text-white shadow-xl shadow-purple-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Icons.Box className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">UniDrop System</span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest opacity-70">Member Identity</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-mono font-bold tracking-tight">{userProfile.uniDropId}</h2>
              <button className="p-1.5 bg-white/10 rounded-lg active:scale-90 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold">{userProfile.name}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: <Icons.User className="w-5 h-5" />, label: 'Personal Information', to: 'personal-info' },
          { icon: <Icons.Bell className="w-5 h-5" />, label: 'Notifications', to: 'notifications', badge: notifications.filter(n => !n.read).length || undefined },
          { icon: <Icons.MapPin className="w-5 h-5" />, label: 'Default Hub', to: 'default-hub' },
          { icon: <Icons.Lock className="w-5 h-5" />, label: 'Security & Privacy', to: 'settings' },
        ].map((item, idx) => (
          <button 
            key={idx} 
            onClick={() => navigateTo(item.to as View)} 
            className="w-full bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="text-purple-600 opacity-80">{item.icon}</div>
              <span className="font-semibold text-slate-700">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>}
              <Icons.ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </button>
        ))}
      </div>
      <button 
        onClick={logout} 
        className="w-full py-4 text-red-500 font-bold bg-white rounded-3xl border border-red-50 shadow-sm active:bg-red-50 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );

  const renderSupport = () => (
    <div className="flex flex-col h-full animate-fadeIn pb-4">
      <PageHeader title="AI Support" />
      <div className="flex-1 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-3xl text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-4 py-3 rounded-3xl rounded-tl-none flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <input 
            name="message" 
            type="text" 
            autoComplete="off" 
            placeholder="Type your question..." 
            className="flex-1 bg-white border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500" 
          />
          <button type="submit" className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg active:scale-95">
            <Icons.Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );

  const renderParcels = () => (
    <div className="space-y-4 animate-fadeIn pb-6">
      <PageHeader title="My Parcels" />
      <div className="relative mb-6">
        <input 
          type="text" 
          placeholder="Search tracking number..." 
          className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
      </div>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p>Loading parcels...</p>
          </div>
        ) : parcels.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
            <Icons.Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="font-semibold text-slate-700 mb-1">No parcels found</p>
            <p className="text-sm">Your parcels will appear here once they're added to the system.</p>
          </div>
        ) : parcels.filter(p => p.trackingNumber.toUpperCase().includes(searchQuery.toUpperCase())).length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
            <Icons.Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No parcels match your search</p>
          </div>
        ) : (
          parcels.filter(p => p.trackingNumber.toUpperCase().includes(searchQuery.toUpperCase())).map(parcel => (
            <div 
              key={parcel.id} 
              onClick={() => { setSelectedParcel(parcel); navigateTo('parcel-detail'); }} 
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden active:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                    <Icons.Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{parcel.trackingNumber}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{parcel.courier}</p>
                  </div>
                </div>
                <Icons.ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderParcelDetail = () => {
    if (!selectedParcel) return null;
    
    const isArrived = [ParcelStatus.READY, ParcelStatus.COLLECTED].includes(selectedParcel.status);
    const isCollected = selectedParcel.status === ParcelStatus.COLLECTED;

    return (
      <div className="animate-fadeIn space-y-6">
        <PageHeader title="Parcel Details" back />
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking Number</p>
              <h2 className="text-xl font-bold">{selectedParcel.trackingNumber}</h2>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${selectedParcel.status === ParcelStatus.READY ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {selectedParcel.status}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Courier</p>
              <p className="font-bold text-sm">{selectedParcel.courier}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Sender</p>
              <p className="font-bold text-sm">{selectedParcel.sender}</p>
            </div>
          </div>
          
          <div className="space-y-6 relative ml-4 mt-8">
            <div className="absolute top-0 bottom-0 left-[-1rem] w-0.5 bg-slate-100"></div>
            {[
              { 
                title: 'Arrived at Hub', 
                time: isArrived ? 'Today, 09:12 AM' : 'Expected soon', 
                active: isArrived 
              },
              { 
                title: 'Parcel Collected', 
                time: isCollected ? 'Recently' : 'Pending', 
                active: isCollected 
              },
            ].map((step, i) => (
              <div key={i} className="relative flex items-center gap-4">
                <div className={`absolute left-[-1.25rem] w-3 h-3 rounded-full border-2 border-white transition-all ${step.active ? 'bg-purple-600 ring-4 ring-purple-100' : 'bg-slate-300'}`}></div>
                <div>
                  <h4 className={`text-sm font-bold ${step.active ? 'text-slate-900' : 'text-slate-400'}`}>{step.title}</h4>
                  <p className="text-[10px] text-slate-500">{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {selectedParcel.status === ParcelStatus.READY && (
          <button 
            onClick={() => setIsQRModalOpen(true)} 
            className="w-full bg-purple-600 text-white py-4 rounded-3xl font-bold shadow-xl shadow-purple-100 flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <Icons.Scan className="w-5 h-5" /> Generate Pickup QR
          </button>
        )}
      </div>
    );
  };

  if (!user) {
    return null; // Auth handled by AppWrapper
  }

  const currentTab = getTabForView(activeView);

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      <main id="main-content" className="flex-1 p-6 overflow-y-auto no-scrollbar scroll-smooth">
        {activeView === 'home' && renderHome()}
        {activeView === 'parcels' && renderParcels()}
        {activeView === 'parcel-detail' && renderParcelDetail()}
        {activeView === 'hubs' && renderHubs()}
        {activeView === 'hub-detail' && renderHubDetail()}
        {activeView === 'support' && renderSupport()}
        {activeView === 'profile' && renderProfile()}
        {activeView === 'notifications' && renderNotifications()}
        {activeView === 'settings' && renderSettings()}
        {activeView === 'personal-info' && renderPersonalInfo()}
        {activeView === 'default-hub' && renderDefaultHub()}
      </main>

      <nav className="shrink-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex items-center justify-between z-40 rounded-t-[40px] shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.1)]">
        {[
          { id: 'home', icon: Icons.Home, label: 'Home' },
          { id: 'parcels', icon: Icons.Box, label: 'Parcels' },
          { id: 'hubs', icon: Icons.Map, label: 'Hubs' },
          { id: 'support', icon: Icons.Message, label: 'Chat' },
          { id: 'profile', icon: Icons.User, label: 'Account' }
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => navigateTo(item.id as View)} 
            className={`flex flex-col items-center gap-1 transition-all duration-300 active:scale-90 ${currentTab === item.id ? 'text-purple-600' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${currentTab === item.id ? 'bg-purple-50' : ''}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      {isQRModalOpen && selectedParcel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-slideUp p-8 flex flex-col items-center">
            <div className="flex justify-end w-full">
              <button onClick={() => setIsQRModalOpen(false)} className="p-2 bg-slate-50 rounded-full active:scale-90 transition-transform">
                <Icons.X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <h3 className="text-2xl font-black mt-2 text-slate-800">Scan to Collect</h3>
            <p className="text-slate-500 text-sm mb-6 text-center">Hub ID: {selectedParcel.hubId}</p>
            <QRGenerator value={selectedParcel.collectionPin} parcel={selectedParcel} />
            <div className="mt-8 p-6 bg-purple-50 rounded-[30px] w-full text-center">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Backup PIN</p>
              <div className="flex justify-center gap-2">
                {selectedParcel.collectionPin.split('').map((char, i) => (
                  <div key={i} className="w-10 h-12 bg-white rounded-xl flex items-center justify-center text-xl font-bold text-purple-600 shadow-sm border border-purple-100">
                    {char}
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setIsQRModalOpen(false)} 
              className="w-full bg-slate-900 text-white py-4 rounded-3xl font-bold mt-6 shadow-xl active:scale-95 transition-transform"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        * { -webkit-tap-highlight-color: transparent; }
        html, body, #root { height: 100%; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default App;
