import React from 'react';
import type { WorkflowSubStep } from '../../types';

interface WorkflowSubStepsProps {
  subSteps: WorkflowSubStep[];
}

const AUTOMATION_LEVEL_COLORS: Record<string, string> = {
  FULL: 'bg-[#2979FF] text-white',
  SUPERVISED: 'bg-[#9ED8F6] text-[#0B0B0B]',
  ASSISTED: 'bg-gray-200 text-[#0B0B0B]',
  MANUAL: 'bg-gray-100 text-gray-500',
};

const WorkflowSubSteps: React.FC<WorkflowSubStepsProps> = ({ subSteps }) => {
  return (
    <div className="bg-gray-50 border-l-2 border-[#9ED8F6] pl-4 py-3 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
        Sub-Steps
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-1/6">Bucket</th>
            <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-1/6">Feature</th>
            <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-1/4">AI Action</th>
            <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-1/4">Human Action</th>
            <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-1/6">Artifact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {subSteps.map((step, idx) => (
            <tr key={idx}>
              <td className="py-2 pr-3 text-xs font-medium text-gray-700">{step.bucket}</td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#0B0B0B]">{step.featureName}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${AUTOMATION_LEVEL_COLORS[step.automationLevel] || 'bg-gray-100'}`}>
                    {step.automationLevel}
                  </span>
                </div>
              </td>
              <td className="py-2 pr-3 text-xs text-gray-600">{step.aiAction}</td>
              <td className="py-2 pr-3 text-xs text-gray-600">{step.humanAction}</td>
              <td className="py-2 text-xs font-medium text-[#0B0B0B]">{step.artifact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorkflowSubSteps;
