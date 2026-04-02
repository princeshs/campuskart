import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShoppingCart, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-full flex justify-center sticky top-4 z-50 px-4 pointer-events-none">
      <nav className="w-full max-w-6xl pointer-events-auto bg-[#030a0d]/85 backdrop-blur-xl border border-teal-500/20 rounded-2xl flex justify-between items-center px-4 md:px-6 py-3 shadow-[0_8px_32px_rgba(3,10,13,0.8)] transition-all">
        {/* Left side: Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 transition-all hover:text-teal-400">
            <ShoppingCart size={24} className="text-teal-400" />
            <span className="hidden sm:inline">Campus Kart</span>
          </Link>
        </div>
      
      {/* Right side: Authenticated Links or Auth Buttons */}
      <div className="flex items-center gap-5">
        {!user && null}

        {user && (
          <>
            {user.role === 'admin' && (
              <Link to="/admin" className={`transition-all px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold tracking-wide border ${isActive('/admin') ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'text-amber-400 border-transparent hover:bg-amber-500/10 hover:border-amber-500/20'}`}>
                Admin Panel
              </Link>
            )}
            <Link to="/sell" className={`transition-all px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold tracking-wide ${isActive('/sell') ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'}`}>
              Sell
            </Link>
            <Link to="/products" className={`transition-all px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold tracking-wide ${isActive('/products') ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'}`}>
              Marketplace
            </Link>
            <Link to="/auctions" className={`transition-all px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold tracking-wide ${location.pathname.startsWith('/auction') ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'}`}>
              Auctions
            </Link>
            <Link to="/chat" className={`transition-all px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold tracking-wide ${isActive('/chat') ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'}`}>
              Chat
            </Link>
            <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
            <Link to="/profile" className={`flex items-center gap-2 transition-all px-2 md:px-3 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-white/5 ${isActive('/profile') ? 'text-teal-300 bg-white/5 border border-teal-500/30' : 'text-slate-300 hover:text-white border border-transparent'}`}>
              <User size={18} />
              <span className="hidden lg:inline">Profile</span>
            </Link>
            <button onClick={handleLogout} className="ml-1 flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl px-3 py-2 text-xs md:text-sm font-bold transition-all shadow-md">
              <LogOut size={16} />
              <span className="hidden lg:inline">Log out</span>
            </button>
          </>
        )}
      </div>
      </nav>
    </div>
  );
};

export default Navbar;
