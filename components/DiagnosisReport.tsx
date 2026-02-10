import React, { useEffect, useRef, useState } from 'react';
import { DiagnosisResult, Scenario } from '../types';
import CostChart from './diagnosis/CostChart';
import WorkflowTable from './diagnosis/WorkflowTable';

interface DiagnosisReportProps {
  result: DiagnosisResult;
  onReset: () => void;
  onScrubs: () => void;
}

const LatexRenderer: React.FC<{ tex: string }> = ({ tex }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current && (window as any).katex) {
      try {
        (window as any).katex.render(tex, containerRef.current, {
          throwOnError: false,
          displayMode: false
        });
      } catch (e) {
        console.error("Katex error", e);
        containerRef.current.innerText = tex;
      }
    }
  }, [tex]);

  return <span ref={containerRef} className="font-mono text-base text-[#0B0B0B]" />;
};

const DiagnosisReport: React.FC<DiagnosisReportProps> = ({ result, onReset, onScrubs }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const activeScenario = result.scenarios[activeTab];

  return (
    <div className="min-h-screen bg-white text-[#0B0B0B]">

      {/* Header Bar */}
      <div className="border-b border-gray-200 py-6 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
           <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-[#E53935]"></div>
              <h1 className="text-lg font-bold uppercase tracking-widest">Diagnosis Results</h1>
           </div>

           <div className="flex items-center space-x-4 md:space-x-8">
             <button
              onClick={onReset}
              className="hidden md:block text-xs font-mono uppercase underline hover:text-[#E53935]"
            >
              Discharge Patient
            </button>
            <button
              onClick={onScrubs}
              className="border border-[#0B0B0B] text-[#0B0B0B] px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#0B0B0B] hover:text-white transition-all"
            >
              Get some Scrubs
            </button>
            <button
              onClick={() => alert("Assistance requested.")}
              className="bg-[#2979FF] text-white px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#0055FF] transition-colors"
            >
              Call a Nurse
            </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">

        {/* Scenario Tabs - Swiss Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#0B0B0B] mb-12">
          {result.scenarios.map((scenario, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`py-4 px-6 text-left text-sm font-bold uppercase tracking-widest border-r border-[#0B0B0B] last:border-r-0 transition-colors
                ${activeTab === idx
                  ? 'bg-[#0B0B0B] text-white'
                  : 'bg-white text-gray-500 hover:text-[#0B0B0B] hover:bg-gray-50'}`}
            >
              {idx + 1}. {scenario.title}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-12 gap-12 animate-fade-in">

          {/* Left Col: Description & Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-12">
            <div>
              <h2 className="text-3xl font-bold leading-tight mb-4">{activeScenario.title}</h2>
              <p className="text-lg text-gray-600 leading-relaxed">{activeScenario.description}</p>
            </div>

            <div className="border-t-2 border-[#0B0B0B] pt-4">
               <span className="block text-xs font-bold uppercase tracking-widest text-[#E53935] mb-2">Complexity Reduction</span>
               <span className="text-6xl font-bold tracking-tighter">{activeScenario.complexityReductionScore}%</span>
            </div>

            <div className="bg-[#E53935] p-6 text-white">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center">
                 <span className="w-2 h-2 bg-white mr-2"></span>
                 Amputation List (Remove)
              </h3>
              <ul className="space-y-2 font-mono text-sm">
                 {activeScenario.displacementList.length > 0 ? (
                    activeScenario.displacementList.map((tool, i) => (
                      <li key={i} className="flex items-center">
                        <span className="mr-2 opacity-50">×</span> {tool}
                      </li>
                    ))
                 ) : (
                   <li className="opacity-75">No amputations required.</li>
                 )}
              </ul>
            </div>

            <div className="bg-[#F3F4F6] p-6 border border-gray-200">
               <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Cost Projection (5 Year)</h3>
               <LatexRenderer tex={activeScenario.costProjectionLatex} />
               <CostChart
                  current={activeScenario.currentCostYearly}
                  projected={activeScenario.projectedCostYearly}
               />
            </div>
          </div>

          {/* Right Col: Workflow Table */}
          <div className="col-span-12 lg:col-span-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9ED8F6] bg-[#0B0B0B] inline-block px-2 py-1 mb-6">
              Prescribed Protocol
            </h3>
            <WorkflowTable workflow={activeScenario.workflow} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default DiagnosisReport;
