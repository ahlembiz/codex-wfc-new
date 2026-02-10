import React from 'react';

interface CostChartProps {
  current: number[];
  projected: number[];
}

const CostChart: React.FC<CostChartProps> = ({ current, projected }) => {
  if (!current || !projected || current.length === 0) return null;

  const height = 200;
  const width = 500;
  const padding = 20;
  const bottomPadding = 30;

  const allValues = [...current, ...projected];
  const maxValue = Math.max(...allValues) * 1.1;

  const getX = (index: number) => {
    return padding + (index / (current.length - 1)) * (width - 2 * padding);
  };

  const getY = (value: number) => {
    return height - bottomPadding - (value / maxValue) * (height - bottomPadding - padding);
  };

  const pointsCurrent = current.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const pointsProjected = projected.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

  return (
    <div className="w-full mt-6 select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <line x1={padding} y1={height - bottomPadding} x2={width - padding} y2={height - bottomPadding} stroke="#E5E7EB" strokeWidth="1" />

        {current.map((_, i) => (
          <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" fontSize="10" fill="#6B7280" className="font-mono uppercase">
            Yr {i + 1}
          </text>
        ))}

        <polyline points={pointsCurrent} fill="none" stroke="#E53935" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pointsProjected} fill="none" stroke="#2979FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {current.map((v, i) => (
          <circle key={`c-${i}`} cx={getX(i)} cy={getY(v)} r="4" fill="#E53935" stroke="white" strokeWidth="1" />
        ))}
        {projected.map((v, i) => (
          <circle key={`p-${i}`} cx={getX(i)} cy={getY(v)} r="4" fill="#2979FF" stroke="white" strokeWidth="1" />
        ))}
      </svg>

      <div className="flex justify-center space-x-6 mt-4 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-[#E53935] mr-2"></div>
          <span>Current Trend (Bloated)</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-[#2979FF] mr-2"></div>
          <span>Treated (Lean)</span>
        </div>
      </div>
    </div>
  );
};

export default CostChart;
