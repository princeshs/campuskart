import React from 'react';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();

  // Show footer on all pages

  return (
    <footer className="w-full bg-[#030a0d]/60 backdrop-blur-xl border-t border-teal-900/30 py-10 flex flex-col items-center justify-center text-teal-100/40 text-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center">
        <p className="font-black text-teal-100 uppercase tracking-[0.2em] text-[10px] opacity-80">
          Developed by
          <span className="text-teal-400 ml-2">Prince & teams</span>
        </p>
        <span className="w-1 h-1 rounded-full bg-teal-900 hidden md:block"></span>
        <p className="tracking-widest font-bold uppercase text-[10px]">IIT Patna</p>
      </div>
      
      <p className="opacity-40 text-[9px] font-black uppercase tracking-widest text-center">
        &copy; {new Date().getFullYear()} Campus Kart &bull; Exclusive Marketplace
      </p>
    </footer>
  );
};

export default Footer;
