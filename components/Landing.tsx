import React from 'react';

interface LandingProps {
  onStart: () => void;
  onScrubs: () => void;
  onAdmin: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart, onScrubs, onAdmin }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white flex flex-col items-center justify-center">
      
      {/* Left Column Falling Pills */}
      <div className="absolute top-0 left-0 w-1/3 h-full overflow-hidden pointer-events-none z-0">
         <div 
           className="pill-3d pill-red w-96 h-[10.5rem] animate-fall"
           style={{ 
             left: '-20%', 
             animationDuration: '20s', 
             animationDelay: '0s',
             '--r-start': '-25deg',
             '--r-end': '15deg'
           } as React.CSSProperties}
         ></div>
         
         <div 
           className="pill-3d pill-blue w-60 h-24 animate-fall"
           style={{ 
             left: '30%', 
             animationDuration: '25s', 
             animationDelay: '7s',
             '--r-start': '10deg',
             '--r-end': '-30deg'
           } as React.CSSProperties}
         ></div>

         <div 
           className="pill-3d pill-red w-72 h-[7.5rem] animate-fall"
           style={{ 
             left: '10%', 
             animationDuration: '22s', 
             animationDelay: '14s',
             '--r-start': '5deg',
             '--r-end': '45deg'
           } as React.CSSProperties}
         ></div>
      </div>

      {/* Right Column Falling Pills */}
      <div className="absolute top-0 right-0 w-1/3 h-full overflow-hidden pointer-events-none z-0">
         <div 
           className="pill-3d pill-blue w-96 h-[10.5rem] animate-fall"
           style={{ 
             right: '-10%', 
             animationDuration: '23s', 
             animationDelay: '2s',
             '--r-start': '15deg',
             '--r-end': '-5deg'
           } as React.CSSProperties}
         ></div>

         <div 
           className="pill-3d pill-red w-60 h-24 animate-fall"
           style={{ 
             right: '35%', 
             animationDuration: '28s', 
             animationDelay: '10s',
             '--r-start': '-10deg',
             '--r-end': '20deg'
           } as React.CSSProperties}
         ></div>

          <div 
           className="pill-3d pill-blue w-72 h-[7.5rem] animate-fall"
           style={{ 
             right: '15%', 
             animationDuration: '24s', 
             animationDelay: '17s',
             '--r-start': '170deg',
             '--r-end': '190deg'
           } as React.CSSProperties}
         ></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 flex flex-col items-center text-center-force">
        <div className="mb-12 flex flex-col items-center">
            <div className="w-24 h-24 relative mb-6">
              <div className="absolute left-1/2 -translate-x-1/2 w-6 h-24 bg-[#E53935]"></div>
              <div className="absolute top-1/2 -translate-y-1/2 h-6 w-24 bg-[#E53935]"></div>
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
              AI Workflow Clinic
            </span>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none text-[#0B0B0B] mb-8">
          AI<br/>Workflow<br/>Clinic.
        </h1>
        
        <div className="w-16 h-1 bg-[#0B0B0B] mb-8 mx-auto"></div>

        <div className="space-y-3 text-xl md:text-2xl font-normal leading-tight text-gray-800 mb-12">
          <p>Welcome.</p>
          <p>Please remove your shoes and legacy processes.</p>
          <p className="text-gray-400">We are ready to see you now.</p>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <button
            onClick={onStart}
            className="group relative inline-flex items-center justify-center bg-[#0B0B0B] text-white px-10 py-5 text-sm font-bold uppercase tracking-[0.15em] hover:bg-[#E53935] transition-colors duration-300 rounded-none overflow-hidden"
          >
            <span className="relative z-10">[ Start Diagnosis ]</span>
          </button>
          
          <button
            onClick={onScrubs}
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#0B0B0B] border-b-2 border-[#0B0B0B] pb-1 hover:text-[#E53935] hover:border-[#E53935] transition-all"
          >
            I just want some Scrubs
          </button>
        </div>

        <p className="mt-8 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
           Est. 2025 &bull; Zurich / SF
        </p>
        <button
          onClick={onAdmin}
          style={{
            marginTop: 12,
            fontSize: 8,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(0,0,0,0.3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s',
            padding: '4px 8px',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#E53935'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'rgba(0,0,0,0.3)'; }}
        >
          Staff Portal
        </button>

      </div>
    </div>
  );
};

export default Landing;