import type { AssessmentData, DiagnosisResult } from '../types';
import { runDiagnosis as runGeminiDiagnosis } from './geminiService';

// API base URL - uses environment variable or falls back to relative path
const API_BASE_URL = typeof process !== 'undefined' && process.env?.VITE_API_URL
  ? process.env.VITE_API_URL
  : '/api';

// Check if API is available
let apiAvailable: boolean | null = null;

async function checkApiAvailability(): Promise<boolean> {
  if (apiAvailable !== null) {
    return apiAvailable;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    apiAvailable = data.status === 'healthy' || data.status === 'degraded';
    return apiAvailable;
  } catch {
    apiAvailable = false;
    return false;
  }
}

/**
 * Run diagnosis using the backend API with Gemini fallback
 */
export async function runDiagnosis(data: AssessmentData): Promise<DiagnosisResult> {
  // Try backend API first
  const isApiAvailable = await checkApiAvailability();

  if (isApiAvailable) {
    try {
      const result = await runBackendDiagnosis(data);
      return result;
    } catch (error) {
      console.warn('Backend diagnosis failed, falling back to Gemini:', error);
      // Fall through to Gemini
    }
  }

  // Fallback to Gemini
  console.log('Using Gemini fallback for diagnosis');
  return runGeminiDiagnosis(data);
}

/**
 * Call the backend /api/diagnose endpoint
 */
async function runBackendDiagnosis(data: AssessmentData): Promise<DiagnosisResult> {
  const response = await fetch(`${API_BASE_URL}/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const result = await response.json();
  return result as DiagnosisResult;
}

/**
 * Match tool names to canonical IDs
 */
export async function matchToolNames(names: string[]): Promise<Map<string, ToolMatchResult>> {
  const isApiAvailable = await checkApiAvailability();

  if (!isApiAvailable) {
    // Return empty matches if API not available
    const results = new Map<string, ToolMatchResult>();
    for (const name of names) {
      results.set(name, { matched: false, tool: null, confidence: 0 });
    }
    return results;
  }

  const response = await fetch(`${API_BASE_URL}/tools/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ names }),
  });

  if (!response.ok) {
    throw new Error(`Tool matching failed: ${response.status}`);
  }

  const data = await response.json();

  const results = new Map<string, ToolMatchResult>();
  for (const item of data.data) {
    results.set(item.input, {
      matched: item.matched,
      tool: item.tool,
      confidence: item.confidence,
    });
  }

  return results;
}

/**
 * Get all available tools
 */
export async function getTools(filters?: ToolFilters): Promise<Tool[]> {
  const isApiAvailable = await checkApiAvailability();

  if (!isApiAvailable) {
    return [];
  }

  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }

  const url = `${API_BASE_URL}/tools${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch tools: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get all bundles
 */
export async function getBundles(filters?: BundleFilters): Promise<Bundle[]> {
  const isApiAvailable = await checkApiAvailability();

  if (!isApiAvailable) {
    return [];
  }

  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }

  const url = `${API_BASE_URL}/bundles${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch bundles: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Reset API availability check (useful for retry logic)
 */
export function resetApiAvailability(): void {
  apiAvailable = null;
}

// Types for the API responses
export interface ToolMatchResult {
  matched: boolean;
  tool: {
    id: string;
    name: string;
    displayName: string;
    category: string;
  } | null;
  confidence: number;
}

export interface Tool {
  id: string;
  name: string;
  displayName: string;
  category: string;
  primaryUseCases: string[];
  keyFeatures: string[];
  complexity: string;
  typicalPricingTier: string;
  estimatedCostPerUser: number | null;
  hasAiFeatures: boolean;
}

export interface ToolFilters {
  category?: string;
  techSavviness?: string;
  teamSize?: string;
  stage?: string;
  maxCostPerUser?: number;
  hasAiFeatures?: boolean;
  requireSoc2?: boolean;
  requireHipaa?: boolean;
  requireGdpr?: boolean;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  scenarioType: string;
  tools: Array<{
    id: string;
    name: string;
    displayName: string;
    category: string;
    role: string | null;
  }>;
  anchorTool: {
    id: string;
    name: string;
    displayName: string;
  } | null;
  bestForTeamSize: string[];
  bestForStage: string[];
  bestForTechSavviness: string[];
  primaryUseCasesCovered: string[];
  estimatedMonthlyCost: number | null;
}

export interface BundleFilters {
  scenarioType?: string;
  techSavviness?: string;
  teamSize?: string;
  stage?: string;
  anchorToolId?: string;
}
