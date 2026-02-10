import React from 'react';
import type { WorkflowAutomation } from '../../types';

interface AutomationRecipeCardProps {
  automations: WorkflowAutomation[];
}

const CONNECTOR_COLORS: Record<string, string> = {
  NATIVE: 'bg-green-100 text-green-800',
  ZAPIER: 'bg-orange-100 text-orange-800',
  API: 'bg-purple-100 text-purple-800',
  WEBHOOK: 'bg-blue-100 text-blue-800',
  BROWSER_EXT: 'bg-yellow-100 text-yellow-800',
  MANUAL: 'bg-gray-100 text-gray-600',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  PLUG_AND_PLAY: 'Plug & Play',
  GUIDED: 'Guided Setup',
  TECHNICAL: 'Technical',
  CUSTOM_DEV: 'Custom Dev',
};

const AutomationRecipeCard: React.FC<AutomationRecipeCardProps> = ({ automations }) => {
  return (
    <div className="bg-[#0B0B0B]/5 border border-dashed border-gray-300 rounded px-4 py-3 space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
        Automation Recipes
      </div>
      <div className="space-y-2">
        {automations.map((auto, idx) => (
          <div key={idx} className="flex items-center gap-3 flex-wrap">
            {/* Trigger → Action flow */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-mono font-bold text-[#0B0B0B]">{auto.triggerTool}</span>
              <span className="text-gray-400 text-[10px]">{auto.triggerEvent}</span>
              <span className="text-[#E53935] font-bold">→</span>
              <span className="font-mono font-bold text-[#0B0B0B]">{auto.actionTool}</span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${CONNECTOR_COLORS[auto.connectorType] || 'bg-gray-100'}`}>
                {auto.connectorType}
              </span>
              <span className="text-[9px] text-gray-500">
                {DIFFICULTY_LABELS[auto.setupDifficulty] || auto.setupDifficulty}
              </span>
              {auto.timeSaved > 0 && (
                <span className="text-[9px] font-mono text-[#2979FF]">
                  -{auto.timeSaved}h/wk
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutomationRecipeCard;
