'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Bike, Car, User, Clock, ChevronDown, Check, RotateCcw } from 'lucide-react';
import { getSocket } from '../lib/socket';
import { fetchUsers, resetDemoRides } from '../lib/api';
import { User as UserType } from '../types';

export default function Navbar() {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Load demo users
    fetchUsers()
      .then((data) => {
        setUsers(data);
        // Default to rider if none stored in localStorage
        const storedUserId = localStorage.getItem('rapido_current_user_id');
        const defaultUser = data.find((u) => u.id === storedUserId) || data.find((u) => u.role === 'RIDER') || data[0];
        if (defaultUser) {
          setCurrentUser(defaultUser);
          localStorage.setItem('rapido_current_user_id', defaultUser.id);
        }
      })
      .catch((err) => console.error('Error fetching users:', err));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const handleSelectUser = (user: UserType) => {
    setCurrentUser(user);
    localStorage.setItem('rapido_current_user_id', user.id);
    setDropdownOpen(false);
    // Reload or notify state
    window.dispatchEvent(new Event('rapido_user_changed'));
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FDFDFD]/90 backdrop-blur-md border-b border-[#EFEFEF] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="bg-[#957DAD] text-white font-black text-xl px-2.5 py-1 rounded-xl tracking-wider flex items-center space-x-1.5 shadow-sm group-hover:bg-[#856C9E] transition-colors">
              <Bike className="w-5 h-5 text-white" />
              <span>rapido</span>
            </div>
            <span className="text-xs bg-[#F1F5D8] text-[#415720] font-bold px-2.5 py-0.5 rounded-full border border-[#DCE4B2] hidden sm:inline-block">
              Bike • Auto • Cabs
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center space-x-1.5">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                pathname === '/'
                  ? 'bg-[#EFEFEF] text-[#957DAD] shadow-xs'
                  : 'text-[#6E6680] hover:text-[#2D283E] hover:bg-[#EFEFEF]/60'
              }`}
            >
              Book Ride
            </Link>

            <Link
              href="/captain"
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                pathname === '/captain'
                  ? 'bg-[#957DAD] text-white shadow-xs'
                  : 'text-[#6E6680] hover:text-[#2D283E] hover:bg-[#EFEFEF]/60'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Captain Dashboard</span>
              <span className="text-[10px] bg-[#FFD6A5] text-[#784315] font-black px-1.5 py-0.5 rounded-full border border-[#F5C287]">
                LIVE
              </span>
            </Link>

            <Link
              href="/history"
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                pathname === '/history'
                  ? 'bg-[#EFEFEF] text-[#957DAD] shadow-xs'
                  : 'text-[#6E6680] hover:text-[#2D283E] hover:bg-[#EFEFEF]/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>My Rides</span>
            </Link>
          </nav>
        </div>

        {/* Right side: Status indicator & User Role Switcher */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Socket Connection Status */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#6E6680] bg-[#EFEFEF]/70 border border-[#E0E0E0] px-2.5 py-1 rounded-full">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#7BA644]' : 'bg-[#E57373]'
              }`}
            />
            <span className="font-medium">{isConnected ? 'Real-Time Sync' : 'Connecting...'}</span>
          </div>

          {/* Quick Demo Reset / New Ride */}
          <button
            onClick={async () => {
              if (confirm('Start a fresh new ride demo? This will clear active trips.')) {
                await resetDemoRides();
                window.location.href = '/';
              }
            }}
            className="text-xs bg-[#EFEFEF] hover:bg-[#E5E5E5] text-[#2D283E] font-bold px-3 py-1.5 rounded-full border border-[#E0E0E0] transition-colors flex items-center space-x-1.5 shadow-xs"
            title="Clear active trips and start fresh ride booking"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#957DAD]" />
            <span className="hidden sm:inline">New Ride</span>
          </button>

          {/* User Profile / Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 bg-[#FDFDFD] hover:bg-[#EFEFEF] border border-[#E0E0E0] px-3 py-1.5 rounded-full transition-all text-sm shadow-xs"
            >
              <div className="w-6 h-6 rounded-full bg-[#F1F5D8] text-[#415720] font-black flex items-center justify-center text-xs border border-[#DCE4B2]">
                {currentUser?.name ? currentUser.name[0] : 'U'}
              </div>
              <span className="font-semibold text-xs sm:text-sm text-[#2D283E] max-w-[110px] truncate">
                {currentUser?.name || 'Switch Role'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-[#FFD6A5]/70 text-[#784315] border border-[#FFD6A5]">
                {currentUser?.role || 'RIDER'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6E6680]" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#FDFDFD] border border-[#E0E0E0] rounded-2xl shadow-xl py-2 z-50 text-sm">
                <div className="px-3.5 py-2 border-b border-[#EFEFEF] text-xs text-[#888199] font-semibold">
                  Switch Active Demo Profile
                </div>
                {users.map((user) => {
                  const isSelected = currentUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[#EFEFEF] transition-colors ${
                        isSelected ? 'bg-[#F1F5D8]/60 font-semibold text-[#2D283E]' : 'text-[#6E6680]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#2D283E]">{user.name}</span>
                        <span className="text-xs text-[#888199]">
                          {user.role === 'CAPTAIN'
                            ? `Captain (${user.captain?.vehicleType || 'Vehicle'})`
                            : 'Commuter / Rider'}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#957DAD]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
