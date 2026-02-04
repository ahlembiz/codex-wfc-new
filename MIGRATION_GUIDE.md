# Migration Guide: Gemini to Claude API

This is a step-by-step technical guide to migrate from Gemini API to Claude API.

## Prerequisites

- Node.js installed
- Claude API key from [Anthropic Console](https://console.anthropic.com/)

---

## Step 1: Update Dependencies

```bash
# Remove Gemini SDK
npm uninstall @google/genai

# Install Claude SDK
npm install @anthropic-ai/sdk
```

---

## Step 2: Create Claude Service File

Create `services/claudeService.ts` with the following content:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { AssessmentData, DiagnosisResult, AnchorType } from "../types";

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.API_KEY || '';

// JSON Schema for workflow step
const workflowStepSchema = {
  type: "object",
  properties: {
    phase: { type: "string", description: "The product cycle phase" },
    tool: { type: "string", description: "The primary tool used" },
    aiAgentRole: { type: "string", description: "What the AI does autonomously" },
    humanRole: { type: "string", description: "The HITL (Human in the loop) action" },
    outcome: { type: "string", description: "The measurable result" }
  },
  required: ["phase", "tool", "aiAgentRole", "humanRole", "outcome"]
};

// JSON Schema for scenario
const scenarioSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Name of the scenario (e.g. The Mono-Stack)" },
    description: { type: "string", description: "Clinical explanation of this cure" },
    complexityReductionScore: { type: "number", description: "Percentage of complexity reduced (0-100)" },
    displacementList: {
      type: "array",
      items: { type: "string" },
      description: "List of tools to remove/amputate"
    },
    workflow: {
      type: "array",
      items: workflowStepSchema,
      description: "The clinical workflow table"
    },
    costProjectionLatex: { type: "string", description: "Cost formula in LaTeX format" },
    currentCostYearly: {
      type: "array",
      items: { type: "number" },
      description: "Array of 5 numbers representing the projected cumulative cost over 5 years if NO changes are made (linear or exponential growth). e.g. [1000, 2000, 3000, 4000, 5000]"
    },
    projectedCostYearly: {
      type: "array",
      items: { type: "number" },
      description: "Array of 5 numbers representing the projected cumulative cost over 5 years WITH the prescribed scenario (should be significantly lower). e.g. [800, 900, 1000, 1100, 1200]"
    }
  },
  required: ["title", "description", "complexityReductionScore", "displacementList", "workflow", "costProjectionLatex", "currentCostYearly", "projectedCostYearly"]
};

// JSON Schema for diagnosis result
const diagnosisSchema = {
  type: "object",
  properties: {
    scenarios: {
      type: "array",
      items: scenarioSchema,
      description: "Exactly 3 clinical cures: Mono-Stack, Native Integrator, Agentic Lean"
    }
  },
  required: ["scenarios"]
};

export const runDiagnosis = async (data: AssessmentData): Promise<DiagnosisResult> => {
  if (!CLAUDE_API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

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
    - Tool Consolidation: Identify redundant tools and recommend consolidation strategies. Tools that serve similar purposes should be consolidated into a single platform when possible.
    - AI-Native Workflows: Design workflows that leverage AI agents for automation. Consider tools with strong AI integration capabilities.
    - Cost Optimization: Balance tool costs with team efficiency and productivity. Respect budget constraints while maximizing value.
    - Integration Patterns: Use native APIs and integrations to reduce manual work. Prefer tools with robust integration ecosystems.
    - Compliance Considerations: Address SOC 2, HIPAA, EU data residency, and air-gapped requirements when specified in high-stakes scenarios.
    - Anchor Tool Strategy: Build workflows around the primary anchor tool (Notion for doc-centric, GitHub/Cursor for dev-centric, Slack for comm-centric, or custom).
    - Automation Philosophy Mapping:
      * Co-Pilot: Human-led workflows with AI assistance. AI suggests, assists, flags. Human reviews, approves, decides.
      * Hybrid: Balanced collaboration. AI drafts, organizes, synthesizes. Human refines, validates, oversees.
      * Auto-Pilot: AI-led workflows with human oversight. AI executes, orchestrates, manages. Human monitors, intervenes if needed.
    - Tech Savviness Considerations:
      * Newbie: Recommend user-friendly tools with clear documentation and low technical barriers.
      * Decent: Can handle moderate complexity, API integrations, and custom workflows.
      * Ninja: Can handle advanced configurations, self-hosted solutions, and custom development.
    - Pain Point Addressing:
      * "We use too many tools" → Focus on tool consolidation scenarios
      * "I don't have time to deep dive" → Emphasize automation scenarios
      * "Context switching kills our flow" → Prioritize integration scenarios
      * "We pay too much" → Highlight cost optimization scenarios
      * "I have a small budget" → Recommend budget-conscious tool selections
    
    TASK: Generate exactly 3 clinical Scenarios. Each scenario should represent a different optimization strategy:
    1. The Mono-Stack: Consolidate to a single primary tool/platform. High complexity reduction (60-80%), multiple tool displacement.
    2. Native Integrator: Use native integrations between existing tools. Medium complexity reduction (40-60%), fewer tools displaced.
    3. Agentic Lean: AI agents handle workflow automation. Very high complexity reduction (70-90%), many tools replaced by AI agents.
    
    Ensure recommendations respect the budget of $${data.budgetPerUser}/user and sensitivity strategy: ${data.costSensitivity}.
    - Price-First: Minimize costs, hard-justify premium tools
    - Balanced: Mix of affordable and premium with clear ROI
    - Value-First: Recommend best tools regardless of cost, explain as investment
    
    For each scenario, provide:
    - A compelling title and 2-3 sentence description
    - Complexity reduction score (0-100%)
    - List of tools to remove (displacement list)
    - Detailed workflow steps covering product cycle phases (Discovery, Design, Development, Testing, Review, Deploy, Monitor)
    - Cost projection formula in LaTeX format (e.g., "C(t) = C_0 \\times (1 + r)^t" for exponential or "C(t) = C_0 + (r \\times t)" for linear)
    - 5-year cost projections: currentCostYearly (if no changes) and projectedCostYearly (with recommended changes)
  `;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      temperature: 0.4,
      system: "You are a clinical diagnostician specializing in workflow optimization. Always respond with valid JSON matching the provided schema. Ensure all numeric arrays have exactly 5 elements.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "diagnosis_result",
          strict: true,
          schema: diagnosisSchema
        }
      }
    });

    // Extract text content from response
    const text = response.content[0].type === "text" ? response.content[0].text : null;
    if (!text) throw new Error("Diagnosis failed: No content returned.");
    
    // Parse JSON response
    const parsed = JSON.parse(text) as DiagnosisResult;
    
    // Validate that we have exactly 3 scenarios
    if (!parsed.scenarios || parsed.scenarios.length !== 3) {
      throw new Error("Diagnosis failed: Expected exactly 3 scenarios.");
    }
    
    return parsed;
  } catch (error) {
    console.error("Claude Diagnosis Error:", error);
    throw error;
  }
};
```

---

## Step 3: Update Environment Variables

Create or update `.env.local`:

```env
# Claude API Key (required)
CLAUDE_API_KEY=sk-ant-api03-...

# Fallback (for compatibility)
API_KEY=sk-ant-api03-...
```

---

## Step 4: Update Vite Configuration

Update `vite.config.ts`:

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.CLAUDE_API_KEY': JSON.stringify(env.CLAUDE_API_KEY),
        'process.env.API_KEY': JSON.stringify(env.CLAUDE_API_KEY) // Fallback
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

---

## Step 5: Update App.tsx

Update the import in `App.tsx`:

```typescript
// Change this line:
// import { runDiagnosis } from './services/geminiService';

// To this:
import { runDiagnosis } from './services/claudeService';
```

---

## Step 6: Update package.json

Update `package.json` dependencies:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.34.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  }
}
```

---

## Step 7: Remove Old Service File (Optional)

Once everything is working, you can remove the old Gemini service:

```bash
rm services/geminiService.ts
```

---

## Step 8: Test the Migration

1. **Start the development server**:
   ```bash
   npm install
   npm run dev
   ```

2. **Test diagnosis generation**:
   - Fill out the intake form
   - Submit and verify diagnosis appears
   - Check browser console for errors

---

## Troubleshooting

### Issue: "API Key is missing"
**Solution**: Ensure `CLAUDE_API_KEY` is set in `.env.local` and restart the dev server.

### Issue: "Diagnosis failed: Expected exactly 3 scenarios"
**Solution**: Check the prompt and ensure Claude is generating the correct structure. You may need to adjust the temperature or add more specific instructions.

---

## Model Selection

### Recommended Models

**For Diagnosis Generation**:
- `claude-3-5-sonnet-20241022` - Best balance (recommended)
- `claude-3-opus-20240229` - Highest quality, slower
- `claude-3-haiku-20240307` - Fastest, lower quality

---

## Cost Comparison

**Claude Pricing** (as of 2024):
- Input: ~$3 per 1M tokens
- Output: ~$15 per 1M tokens
- Typical diagnosis: ~2000 input + ~1500 output tokens = ~$0.03 per diagnosis

---

## Next Steps

1. **Implement Backend** (Recommended):
   - Move API calls to server-side
   - Secure API keys
   - Add rate limiting
   - Implement caching

2. **Add Error Handling**:
   - User-friendly error messages
   - Retry logic
   - Fallback options

3. **Optimize Costs**:
   - Cache common diagnoses
   - Rate limiting
   - Usage analytics

---

## Support

For issues or questions:
- Claude API Docs: https://docs.anthropic.com/
- OpenAI API Docs: https://platform.openai.com/docs/
- Project Issues: Check repository issues
