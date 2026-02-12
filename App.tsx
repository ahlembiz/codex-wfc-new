import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import IntakeForm from './components/IntakeForm';
import DiagnosisReport from './components/DiagnosisReport';
import ScrubsStore from './components/ScrubsStore';
import AdminDashboard from './components/AdminDashboard';
import ClusterFuckDashboard from './components/admin/cluster-fuck/ClusterFuckDashboard';
import { AssessmentData, DiagnosisResult, ViewState } from './types';
import { runDiagnosis } from './services/recommendationService';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    setViewState('INTAKE');
  };

  const handleScrubs = () => {
    setViewState('SCRUBS');
  };

  const handleAdmin = () => {
    setViewState('ADMIN');
  };

  const handleClusterFuck = () => {
    setViewState('ADMIN_CLUSTER_FUCK');
  };

  // Check for #admin hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#admin/cluster-fuck') {
      setViewState('ADMIN_CLUSTER_FUCK');
    } else if (hash === '#admin') {
      setViewState('ADMIN');
    }
  }, []);

  const handleAssessmentSubmit = async (data: AssessmentData) => {
    setViewState('ANALYZING');
    setError(null);
    
    try {
      const result = await runDiagnosis(data);
      setDiagnosisResult(result);
      setViewState('DIAGNOSIS');
    } catch (err) {
      console.error(err);
      setError("We'll need to intervene. This one calls for surgery.");
      setViewState('ERROR');
    }
  };

  const handleReset = () => {
    setViewState('LANDING');
    setDiagnosisResult(null);
    setError(null);
  };

  const renderContent = () => {
    switch (viewState) {
      case 'LANDING':
        return <Landing onStart={handleStart} onScrubs={handleScrubs} onAdmin={handleAdmin} />;
      
      case 'INTAKE':
        return <IntakeForm onSubmit={handleAssessmentSubmit} />;
      
      case 'SCRUBS':
        return <ScrubsStore onBack={handleReset} />;

      case 'ADMIN':
        return <AdminDashboard onBack={handleReset} onClusterFuck={handleClusterFuck} />;

      case 'ADMIN_CLUSTER_FUCK':
        return <ClusterFuckDashboard onBack={() => setViewState('ADMIN')} />;

      case 'ANALYZING':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
            <div className="flex space-x-2 mb-8 animate-pulse">
               <div className="w-4 h-4 bg-[#E53935]"></div>
               <div className="w-4 h-4 bg-[#0B0B0B]"></div>
               <div className="w-4 h-4 bg-[#9ED8F6]"></div>
            </div>
            <h2 className="text-3xl font-bold text-[#0B0B0B] tracking-tighter">Scrubbing in.</h2>
            <p className="mt-4 text-sm font-mono text-gray-500 uppercase tracking-widest">Listening for workflow murmurs...</p>
          </div>
        );

      case 'DIAGNOSIS':
        return diagnosisResult ? (
          <DiagnosisReport 
            result={diagnosisResult} 
            onReset={handleReset} 
            onScrubs={handleScrubs} 
          />
        ) : null;

      case 'ERROR':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
             <div className="max-w-md w-full border border-[#E53935] p-8 bg-[#FFF5F5]">
                <div className="text-[#E53935] text-4xl mb-4 font-bold">×</div>
                <h3 className="text-xl font-bold text-[#0B0B0B] uppercase tracking-widest mb-2">Procedure Failed</h3>
                <p className="text-gray-800 mb-8">{error || "An unknown complication occurred."}</p>
                <button 
                  onClick={() => setViewState('INTAKE')}
                  className="w-full py-4 bg-[#0B0B0B] text-white text-sm font-bold uppercase tracking-widest hover:bg-[#E53935] transition-colors"
                >
                  Return to Intake
                </button>
             </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="font-sans antialiased">
      {renderContent()}
    </div>
  );
};

export default App;