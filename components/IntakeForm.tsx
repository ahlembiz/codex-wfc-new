import React, { useState } from 'react';
import { AssessmentData, Stage, AutomationPhilosophy, ProductSensitivity, AnchorType, TechSavviness, CostSensitivity } from '../types';

interface IntakeFormProps {
  onSubmit: (data: AssessmentData) => void;
}

const IntakeForm: React.FC<IntakeFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<AssessmentData>({
    company: '',
    stage: Stage.EarlySeed,
    teamSize: '',
    currentTools: '',
    philosophy: AutomationPhilosophy.Hybrid,
    techSavviness: TechSavviness.Decent,
    budgetPerUser: 0,
    costSensitivity: CostSensitivity.PriceFirst,
    sensitivity: ProductSensitivity.LowStakes,
    highStakesRequirements: [],
    agentReadiness: false,
    anchorType: AnchorType.DocCentric,
    painPoints: [],
    isSoloFounder: false,
    otherAnchorText: ''
  });

  const [automationValue, setAutomationValue] = useState<number>(1);
  const [savvinessValue, setSavvinessValue] = useState<number>(1);

  const handleChange = (field: keyof AssessmentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePainPointToggle = (point: string) => {
    setFormData(prev => {
      const exists = prev.painPoints.includes(point);
      if (exists) {
        return { ...prev, painPoints: prev.painPoints.filter(p => p !== point) };
      } else {
        return { ...prev, painPoints: [...prev.painPoints, point] };
      }
    });
  };

  const handleHighStakesToggle = (req: string) => {
    setFormData(prev => {
      const exists = prev.highStakesRequirements.includes(req);
      if (exists) {
        return { ...prev, highStakesRequirements: prev.highStakesRequirements.filter(r => r !== req) };
      } else {
        return { ...prev, highStakesRequirements: [...prev.highStakesRequirements, req] };
      }
    });
  };

  const handleAutomationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setAutomationValue(val);
    let phil = AutomationPhilosophy.Hybrid;
    if (val === 0) phil = AutomationPhilosophy.CoPilot;
    if (val === 2) phil = AutomationPhilosophy.AutoPilot;
    handleChange('philosophy', phil);
  };

  const handleSavvinessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSavvinessValue(val);
    let sav = TechSavviness.Decent;
    if (val === 0) sav = TechSavviness.Newbie;
    if (val === 2) sav = TechSavviness.Ninja;
    handleChange('techSavviness', sav);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const painPointOptions = [
    "We use too many tools",
    "I don't have time to deep dive",
    "Context switching kills our flow",
    "We pay too much and don't optimize enough",
    "I have a small budget"
  ];

  const highStakesOptions = [
    "Self-hosted required",
    "SOC 2 compliance",
    "HIPAA compliance",
    "EU data residency",
    "Air-gapped environment"
  ];

  const getCostSensitivitySubtext = (val: CostSensitivity) => {
    switch (val) {
      case CostSensitivity.PriceFirst: return "Minimize costs, hard-justify premium tools";
      case CostSensitivity.Balanced: return "Mix of affordable + premium with ROI";
      case CostSensitivity.ValueFirst: return "Recommend best tools, explain cost as investment";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-6 flex flex-col items-center relative overflow-hidden">
      
      {/* Background Pill - Very subtle */}
      <div className="absolute top-40 right-[-100px] w-[450px] h-[150px] rotate-45 animate-float-slow pointer-events-none opacity-50 z-0">
        <div className="w-full h-full rounded-full border border-gray-200 overflow-hidden">
           <div className="h-1/2 bg-gray-100 w-full"></div>
           <div className="h-1/2 bg-white w-full"></div>
        </div>
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="mb-12 border-b-4 border-[#0B0B0B] pb-4">
          <div className="flex justify-between items-end">
            <h2 className="text-3xl font-bold tracking-tight text-[#0B0B0B] uppercase">Clinical Intake</h2>
            <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Form 104-B</span>
          </div>
          <p className="mt-4 text-base font-normal text-gray-600 max-w-lg">
            Please answer truthfully. We cannot prescribe effective treatment for symptoms you conceal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-16">
          
          {/* SECTION 1 */}
          <section>
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#E53935]">01. Vitals</h3>
              </div>
              <div className="col-span-12 md:col-span-9 space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Company / Product</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white border border-gray-300 p-4 text-sm focus:border-[#0B0B0B] focus:ring-0 outline-none rounded-none"
                      placeholder="Describe the patient..."
                      value={formData.company}
                      onChange={(e) => handleChange('company', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Growth Stage</label>
                    <div className="relative">
                      <select
                        className="w-full bg-white border border-gray-300 p-4 text-sm focus:border-[#0B0B0B] focus:ring-0 outline-none appearance-none rounded-none"
                        value={formData.stage}
                        onChange={(e) => handleChange('stage', e.target.value as Stage)}
                      >
                        {Object.values(Stage).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Team Size</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white border border-gray-300 p-4 text-sm focus:border-[#0B0B0B] focus:ring-0 outline-none rounded-none"
                      placeholder="e.g. 1 PM, 2 Eng"
                      value={formData.teamSize}
                      onChange={(e) => handleChange('teamSize', e.target.value)}
                    />
                    <label className="flex items-center space-x-3 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={formData.isSoloFounder}
                          onChange={(e) => handleChange('isSoloFounder', e.target.checked)}
                          className="h-4 w-4 text-[#0B0B0B] border-gray-300 focus:ring-0 rounded-none accent-[#0B0B0B]"
                        />
                        <span className="text-xs font-bold text-gray-600">I'm a Solo-founder <span className="font-normal italic opacity-75">(tiny violin plays)</span></span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Current Tools</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white border border-gray-300 p-4 text-sm focus:border-[#0B0B0B] focus:ring-0 outline-none rounded-none"
                      placeholder="Jira, Notion, Slack..."
                      value={formData.currentTools}
                      onChange={(e) => handleChange('currentTools', e.target.value)}
                    />
                  </div>
                </div>

              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* SECTION 2 */}
          <section>
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#E53935]">02. Triage</h3>
              </div>
              <div className="col-span-12 md:col-span-9 space-y-8">
                
                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Select Primary Anchor</label>
                  <div className="grid grid-cols-1 gap-0 border border-gray-200">
                    {Object.values(AnchorType).map((type) => (
                      <div key={type} className="border-b border-gray-200 last:border-b-0">
                        <label className="group relative flex items-center p-4 cursor-pointer hover:bg-gray-50">
                          <input
                            name="anchorType"
                            type="radio"
                            checked={formData.anchorType === type}
                            onChange={() => handleChange('anchorType', type)}
                            className="h-4 w-4 text-[#0B0B0B] border-gray-300 focus:ring-0 rounded-none checked:bg-[#0B0B0B] accent-[#0B0B0B]"
                          />
                          <span className="ml-4 block text-sm font-medium text-[#0B0B0B]">
                            {type}
                          </span>
                        </label>
                        {type === AnchorType.Other && formData.anchorType === AnchorType.Other && (
                          <div className="px-4 pb-4 pl-12">
                            <input 
                              type="text" 
                              className="w-full border-b border-gray-300 focus:border-[#0B0B0B] outline-none text-sm py-1 bg-transparent placeholder-gray-400 font-mono"
                              placeholder="e.g. Jira, Trello, etc."
                              value={formData.otherAnchorText}
                              onChange={(e) => handleChange('otherAnchorText', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Tech Savviness</label>
                  <div className="bg-white border border-gray-300 p-6">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="1"
                      value={savvinessValue}
                      onChange={handleSavvinessChange}
                      className="w-full h-1 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#0B0B0B]"
                    />
                    <div className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      <span>Newbie</span>
                      <span>Decent</span>
                      <span>Ninja</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Automation Tolerance</label>
                  <div className="bg-white border border-gray-300 p-6">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="1"
                      value={automationValue}
                      onChange={handleAutomationChange}
                      className="w-full h-1 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#0B0B0B]"
                    />
                    <div className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      <span>Co-Pilot (Human Led)</span>
                      <span>Hybrid</span>
                      <span>Auto-Pilot (Agent Led)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Reported Symptoms</label>
                   <div className="space-y-2">
                    {painPointOptions.map((point) => (
                      <label key={point} className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${formData.painPoints.includes(point) ? 'bg-[#E53935] border-[#E53935]' : 'bg-white border-gray-300 group-hover:border-[#E53935]'}`}>
                           {formData.painPoints.includes(point) && <div className="w-2 h-2 bg-white rounded-none" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.painPoints.includes(point)}
                          onChange={() => handlePainPointToggle(point)}
                        />
                        <span className={`text-sm ${formData.painPoints.includes(point) ? 'text-[#E53935] font-medium' : 'text-gray-600'}`}>{point}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* SECTION 3: Budget */}
          <section>
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#E53935]">03. Budget</h3>
              </div>
              <div className="col-span-12 md:col-span-9 space-y-10">
                
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Budget Per User ($/Month)</label>
                  <div className="space-y-4">
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="20"
                      value={formData.budgetPerUser}
                      onChange={(e) => handleChange('budgetPerUser', parseInt(e.target.value))}
                      className="w-full h-[2px] bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#0B0B0B]"
                    />
                    <div className="text-sm font-mono text-gray-400">
                      ${formData.budgetPerUser}{formData.budgetPerUser >= 500 ? '+' : ''}/user/month
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Cost Sensitivity</label>
                  <div className="space-y-4">
                    <div className="flex border border-[#0B0B0B]">
                      {Object.values(CostSensitivity).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleChange('costSensitivity', val)}
                          className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-r last:border-r-0 border-[#0B0B0B] ${formData.costSensitivity === val ? 'bg-[#0B0B0B] text-white' : 'bg-white text-[#0B0B0B] hover:bg-gray-50'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm italic text-gray-500 font-normal">
                      {getCostSensitivitySubtext(formData.costSensitivity)}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* SECTION 4 (Renumbered from 3) */}
          <section>
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#E53935]">04. Clearance</h3>
              </div>
              <div className="col-span-12 md:col-span-9 space-y-8">
                 <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Risk Sensitivity</label>
                          <div className="flex border border-gray-300">
                              {Object.values(ProductSensitivity).map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleChange('sensitivity', val)}
                                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-none transition-colors ${formData.sensitivity === val ? 'bg-[#0B0B0B] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                >
                                  {val}
                                </button>
                              ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[#0B0B0B]">Pre-op Check</label>
                            <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={formData.agentReadiness}
                                onChange={(e) => handleChange('agentReadiness', e.target.checked)}
                                className="h-4 w-4 text-[#0B0B0B] border-gray-300 focus:ring-0 rounded-none accent-[#0B0B0B]"
                              />
                              <span className="text-sm text-gray-600">MD Guide Uploaded</span>
                            </label>
                        </div>
                    </div>

                    {/* Conditional High-Stakes Section */}
                    {formData.sensitivity === ProductSensitivity.HighStakes && (
                      <div className="space-y-4 animate-fade-in pt-4 border-t border-dashed border-gray-200">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#E53935]">How high? select all that apply:</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {highStakesOptions.map((opt) => (
                             <label key={opt} className="flex items-center space-x-3 cursor-pointer group">
                                <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${formData.highStakesRequirements.includes(opt) ? 'bg-[#0B0B0B] border-[#0B0B0B]' : 'bg-white border-gray-300 group-hover:border-[#0B0B0B]'}`}>
                                   {formData.highStakesRequirements.includes(opt) && <div className="w-2 h-2 bg-white rounded-none" />}
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={formData.highStakesRequirements.includes(opt)}
                                  onChange={() => handleHighStakesToggle(opt)}
                                />
                                <span className={`text-xs font-bold uppercase tracking-tight ${formData.highStakesRequirements.includes(opt) ? 'text-[#0B0B0B]' : 'text-gray-400'}`}>{opt}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </section>

          <div className="pt-12">
            <button
              type="submit"
              className="w-full py-5 bg-[#0B0B0B] text-white text-sm font-bold uppercase tracking-widest hover:bg-[#E53935] transition-colors rounded-none"
            >
              Run Clinical Diagnosis
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default IntakeForm;