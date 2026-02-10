import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AssessmentData, DiagnosisResult, AnchorType } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// Define the response schema
const workflowSubStepSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    bucket: { type: Type.STRING, description: "Sub-phase bucket name" },
    tool: { type: Type.STRING, description: "Tool used in this sub-step" },
    featureName: { type: Type.STRING, description: "Specific feature name" },
    aiAction: { type: Type.STRING, description: "What AI does" },
    humanAction: { type: Type.STRING, description: "What human does" },
    artifact: { type: Type.STRING, description: "What gets produced" },
    automationLevel: { type: Type.STRING, description: "FULL | SUPERVISED | ASSISTED | MANUAL" },
  },
  required: ["bucket", "tool", "featureName", "aiAction", "humanAction", "artifact", "automationLevel"]
};

const workflowAutomationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Automation name" },
    triggerTool: { type: Type.STRING, description: "Tool that triggers the automation" },
    triggerEvent: { type: Type.STRING, description: "Event that triggers it" },
    actionTool: { type: Type.STRING, description: "Tool that receives the action" },
    actionResult: { type: Type.STRING, description: "What the action produces" },
    connectorType: { type: Type.STRING, description: "NATIVE | ZAPIER | API | WEBHOOK" },
    setupDifficulty: { type: Type.STRING, description: "PLUG_AND_PLAY | GUIDED | TECHNICAL | CUSTOM_DEV" },
    timeSaved: { type: Type.NUMBER, description: "Hours saved per week" },
  },
  required: ["name", "triggerTool", "triggerEvent", "actionTool", "actionResult", "connectorType", "setupDifficulty", "timeSaved"]
};

const workflowStepSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    phase: { type: Type.STRING, description: "The product cycle phase" },
    tool: { type: Type.STRING, description: "The primary tool used" },
    aiAgentRole: { type: Type.STRING, description: "What the AI does autonomously" },
    humanRole: { type: Type.STRING, description: "The HITL (Human in the loop) action" },
    outcome: { type: Type.STRING, description: "The measurable result" },
    subSteps: { type: Type.ARRAY, items: workflowSubStepSchema, description: "Optional sub-steps within this phase" },
    automations: { type: Type.ARRAY, items: workflowAutomationSchema, description: "Optional automation recipes" },
    secondaryTools: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional secondary tools used" },
  },
  required: ["phase", "tool", "aiAgentRole", "humanRole", "outcome"]
};

const scenarioSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Name of the scenario (e.g. The Mono-Stack)" },
    description: { type: Type.STRING, description: "Clinical explanation of this cure" },
    complexityReductionScore: { type: Type.NUMBER, description: "Percentage of complexity reduced (0-100)" },
    displacementList: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of tools to remove/amputate"
    },
    workflow: { 
      type: Type.ARRAY, 
      items: workflowStepSchema,
      description: "The clinical workflow table"
    },
    costProjectionLatex: { type: Type.STRING, description: "Cost formula in LaTeX format" },
    currentCostYearly: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: "Array of 5 numbers representing the projected cumulative cost over 5 years if NO changes are made (linear or exponential growth). e.g. [1000, 2000, 3000, 4000, 5000]"
    },
    projectedCostYearly: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: "Array of 5 numbers representing the projected cumulative cost over 5 years WITH the prescribed scenario (should be significantly lower). e.g. [800, 900, 1000, 1100, 1200]"
    }
  },
  required: ["title", "description", "complexityReductionScore", "displacementList", "workflow", "costProjectionLatex", "currentCostYearly", "projectedCostYearly"]
};

const diagnosisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    scenarios: {
      type: Type.ARRAY,
      items: scenarioSchema,
      description: "Exactly 3 clinical cures: Mono-Stack, Native Integrator, Agentic Lean"
    }
  },
  required: ["scenarios"]
};

export const runDiagnosis = async (data: AssessmentData): Promise<DiagnosisResult> => {
  if (!GEMINI_API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Resolve specific anchor choice text
  let specificAnchor = data.anchorType as string;
  if (data.anchorType === AnchorType.Other) {
    specificAnchor = `Other: ${data.otherAnchorText}`;
  }

  const prompt = `
    Role: You are the "Lead Diagnostician" at the AI Workflow Clinic. You specialize in curing operational bloat and architecting lean, AI-native product management systems.
    
    Patient Intake Data:
    - Company: ${data.company}
    - Stage: ${data.stage}
    - Team Size: ${data.teamSize}
    - Is Solo Founder: ${data.isSoloFounder ? "YES" : "NO"}
    - Current Tools: ${data.currentTools}
    - Automation Philosophy: ${data.philosophy}
    - Tech Savviness: ${data.techSavviness}
    - Budget (Monthly/User): $${data.budgetPerUser}
    - Cost Sensitivity: ${data.costSensitivity}
    - Product Sensitivity: ${data.sensitivity}
    - High-Stakes Specifics: ${data.highStakesRequirements.join(", ") || "N/A"}
    - Agent Readiness: ${data.agentReadiness ? "Uploaded .md guides" : "None"}
    - Anchor Preference: ${specificAnchor}
    - Reported Pain Points: ${data.painPoints.join(", ")}

    CLINICAL KNOWLEDGE BASE (Tool Interoperability & Simplification Logic):
    ...
    TASK: Generate 3 clinical Scenarios. 
    Ensure recommendations respect the budget of $${data.budgetPerUser}/user and sensitivity strategy: ${data.costSensitivity}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: diagnosisSchema,
        temperature: 0.4,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Diagnosis failed: No content returned.");
    return JSON.parse(text) as DiagnosisResult;
  } catch (error) {
    console.error("Gemini Diagnosis Error:", error);
    throw error;
  }
};