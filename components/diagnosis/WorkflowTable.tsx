import React, { useState } from 'react';
import type { WorkflowStep } from '../../types';
import WorkflowSubSteps from './WorkflowSubSteps';
import AutomationRecipeCard from './AutomationRecipeCard';

interface WorkflowTableProps {
  workflow: WorkflowStep[];
}

const WorkflowTable: React.FC<WorkflowTableProps> = ({ workflow }) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  const togglePhase = (idx: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const hasDetails = (step: WorkflowStep): boolean => {
    return !!(step.subSteps?.length || step.automations?.length);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-[#0B0B0B]">
            <th className="py-4 text-xs font-bold uppercase tracking-wider w-[5%]"></th>
            <th className="py-4 text-xs font-bold uppercase tracking-wider w-[13%]">Phase</th>
            <th className="py-4 text-xs font-bold uppercase tracking-wider w-[14%]">Tool</th>
            <th className="py-4 text-xs font-bold uppercase tracking-wider w-[24%]">AI Agent Role</th>
            <th className="py-4 text-xs font-bold uppercase tracking-wider w-[24%]">Human Role</th>
            <th className="py-4 text-xs font-bold uppercase tracking-wider w-[20%] text-[#9ED8F6]">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {workflow.map((step, idx) => {
            const isExpandable = hasDetails(step);
            const isExpanded = expandedPhases.has(idx);

            return (
              <React.Fragment key={idx}>
                <tr
                  className={`group ${isExpandable ? 'cursor-pointer' : ''} hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : ''}`}
                  onClick={() => isExpandable && togglePhase(idx)}
                >
                  <td className="py-4 pr-1 text-center">
                    {isExpandable && (
                      <span className={`inline-block text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-sm font-bold">{step.phase}</div>
                    {step.secondaryTools && step.secondaryTools.length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        +{step.secondaryTools.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-sm font-mono text-gray-600">{step.tool}</td>
                  <td className="py-4 pr-4 text-sm text-gray-600 leading-snug">{step.aiAgentRole}</td>
                  <td className="py-4 pr-4 text-sm text-gray-600 leading-snug">{step.humanRole}</td>
                  <td className="py-4 text-sm font-medium text-[#0B0B0B] bg-[#9ED8F6]/10 group-hover:bg-[#9ED8F6]/20 pl-2 border-l border-transparent group-hover:border-[#9ED8F6]">
                    {step.outcome}
                  </td>
                </tr>

                {/* Expanded detail row */}
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="px-6 py-4 space-y-4 bg-gray-50 border-t border-gray-100">
                        {step.subSteps && step.subSteps.length > 0 && (
                          <WorkflowSubSteps subSteps={step.subSteps} />
                        )}
                        {step.automations && step.automations.length > 0 && (
                          <AutomationRecipeCard automations={step.automations} />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WorkflowTable;
