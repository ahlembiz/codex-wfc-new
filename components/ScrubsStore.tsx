import React, { useState } from 'react';

interface Product {
  id: string;
  category: string;
  name: string;
  description: string;
  price: string;
  dosageOptions: string[];
  color: 'red' | 'blue' | 'black';
}

const PRODUCTS: Product[] = [
  // DNR Collection
  { 
    id: 'dnr-1', 
    category: 'DNR Collection', 
    name: 'DNR: Do Not Reply', 
    description: 'Heavyweight jersey tee for the asynchronous absolute.', 
    price: '$48', 
    dosageOptions: ['S', 'M', 'L', 'XL'], 
    color: 'blue'
  },
  { 
    id: 'dnr-2', 
    category: 'DNR Collection', 
    name: 'DNR: Do Not Refactor', 
    description: 'Die-cut vinyl laptop stickers. Set of 10.', 
    price: '$12', 
    dosageOptions: ['Standard'], 
    color: 'red'
  },
  { 
    id: 'dnr-3', 
    category: 'DNR Collection', 
    name: 'DNR: Do Not Reschedule', 
    description: '12oz ceramic mug with clinical grading.', 
    price: '$24', 
    dosageOptions: ['One Size'], 
    color: 'black'
  },
  
  // Prescription Pad
  { 
    id: 'rx-1', 
    category: 'Prescription Pad', 
    name: 'Rx: Touch Grass', 
    description: 'Boxy hoodie for mandatory offline sessions.', 
    price: '$95', 
    dosageOptions: ['M', 'L', 'XL'], 
    color: 'blue'
  },
  { 
    id: 'rx-2', 
    category: 'Prescription Pad', 
    name: 'Rx: Delete Jira', 
    description: 'Contrast stitch tee. Highly volatile.', 
    price: '$48', 
    dosageOptions: ['S', 'M', 'L'], 
    color: 'red'
  },
  { 
    id: 'rx-3', 
    category: 'Prescription Pad', 
    name: 'Rx: Chill Pills', 
    description: 'High-dosage asynchronous recovery aid. 100% legacy-free.', 
    price: '$18', 
    dosageOptions: ['30ct', '60ct'], 
    color: 'red'
  },
  
  // Clinical Gear
  { 
    id: 'gear-1', 
    category: 'Clinical Gear', 
    name: 'Workflow MD Lab Coat', 
    description: 'Functional utility coat with embroidery.', 
    price: '$185', 
    dosageOptions: ['M', 'L'], 
    color: 'black'
  },
  { 
    id: 'gear-2', 
    category: 'Clinical Gear', 
    name: 'On Call Cap', 
    description: '6-panel structured cap for critical uptime.', 
    price: '$35', 
    dosageOptions: ['Adjustable'], 
    color: 'blue'
  }
];

const CATEGORIES = Array.from(new Set(PRODUCTS.map(p => p.category)));

const ScrubsStore: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [cartCount, setCartCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredProducts = activeCategory 
    ? PRODUCTS.filter(p => p.category === activeCategory)
    : PRODUCTS;

  const handleAddToCart = () => {
    setCartCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white text-[#0B0B0B] selection:bg-[#E53935] selection:text-white pb-24">
      
      {/* Clinic Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <button onClick={onBack} className="flex items-center group">
            <div className="w-10 h-10 border border-[#0B0B0B] flex items-center justify-center group-hover:bg-[#0B0B0B] transition-colors">
              <span className="text-lg group-hover:text-white">←</span>
            </div>
          </button>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tighter">Clinic Scrubs.</h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Official Apparel & Gear</p>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <nav className="hidden md:flex space-x-6">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`text-[10px] font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeCategory === cat ? 'border-[#E53935] text-[#E53935]' : 'border-transparent text-gray-400 hover:text-[#0B0B0B]'}`}
              >
                {cat}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prescriptions:</span>
            <div className="w-8 h-8 bg-[#0B0B0B] text-white flex items-center justify-center text-xs font-bold font-mono">
              {cartCount.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-12">
        
        {/* Intro Section */}
        <div className="grid grid-cols-12 gap-8 mb-24">
          <div className="col-span-12 md:col-span-6">
             <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none mb-6">Medical Grade Gear.</h2>
             <p className="text-xl text-gray-600 max-w-md">Professional apparel for the high-frequency diagnostician. For clinical precision only.</p>
          </div>
          <div className="col-span-12 md:col-span-6 flex flex-col justify-end">
             <div className="border-l-4 border-[#0B0B0B] pl-8 py-4">
                <span className="block text-xs font-bold uppercase tracking-widest text-[#E53935] mb-2">Synthesis Protocol</span>
                <p className="font-mono text-sm leading-relaxed">Our clinical line is formulated to treat acute operational hypertension. Administer topically; side effects include spontaneous clarity, extreme swag, and total legacy process rejection. Dosage: One garment per sprint. Use responsibly.</p>
             </div>
          </div>
        </div>

        {/* 01. Standard Inventory */}
        <div className="mb-32">
          <div className="flex items-center space-x-4 mb-12">
             <span className="text-xs font-bold uppercase tracking-widest text-gray-400">01. Standard Inventory</span>
             <div className="flex-1 h-[1px] bg-gray-200"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-[#0B0B0B]">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="border-r border-b border-[#0B0B0B] p-8 group hover:bg-gray-50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-12">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                      {product.category}
                    </span>
                    <span className={`w-3 h-3 rounded-full ${
                      product.color === 'red' ? 'bg-[#E53935]' : 
                      product.color === 'blue' ? 'bg-[#2979FF]' : 'bg-[#0B0B0B]'
                    }`}></span>
                  </div>
                  
                  <div className="aspect-[4/5] bg-[#F1F5F9] mb-8 flex items-center justify-center overflow-hidden relative">
                     <div className="flex flex-col items-center justify-center opacity-30 select-none group-hover:opacity-50 transition-opacity">
                        <span className="text-4xl font-black uppercase tracking-tighter rotate-[-15deg]">Coming</span>
                        <span className="text-4xl font-black uppercase tracking-tighter rotate-[-15deg] mt-[-10px]">Soon</span>
                     </div>
                     <span className="absolute top-4 right-4 text-[8px] font-mono font-bold uppercase tracking-widest text-gray-400 rotate-90 whitespace-nowrap">
                       {product.id} // STOCK_UNIT
                     </span>
                  </div>

                  <h3 className="text-2xl font-bold uppercase tracking-tight mb-2 group-hover:text-[#E53935] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-8 leading-snug">{product.description}</p>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                     <div className="space-y-2">
                       <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Dosage</span>
                       <div className="flex space-x-2">
                         {product.dosageOptions.map(opt => (
                           <button key={opt} className="w-8 h-8 border border-gray-200 flex items-center justify-center text-[10px] font-bold hover:border-[#0B0B0B]">
                             {opt}
                           </button>
                         ))}
                       </div>
                     </div>
                     <span className="text-xl font-bold font-mono">{product.price}</span>
                  </div>

                  <button 
                    onClick={handleAddToCart}
                    className="w-full py-4 bg-[#0B0B0B] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#E53935] transition-colors"
                  >
                    [ Fill Prescription ]
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-32 pt-12 border-t border-gray-200 flex flex-col md:flex-row justify-between items-start gap-8">
           <div className="max-w-sm">
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4">The Ethical Statement</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Our gear is produced with the same rigor we apply to product workflows. We do not engage in corporate swag excess. Each item is a tool for professional signaling and operational excellence.
              </p>
           </div>
           <div className="flex space-x-12">
              <div className="space-y-2 text-xs font-mono uppercase tracking-widest">
                <p className="font-bold text-[#0B0B0B]">Contact</p>
                <p className="text-gray-400">Duty Doctor</p>
                <p className="text-gray-400">Emergency Line</p>
              </div>
              <div className="space-y-2 text-xs font-mono uppercase tracking-widest">
                <p className="font-bold text-[#0B0B0B]">Returns</p>
                <p className="text-gray-400">30-Day Recovery</p>
                <p className="text-gray-400">Partial Refund</p>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default ScrubsStore;