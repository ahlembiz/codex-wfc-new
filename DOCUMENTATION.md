# AI Workflow Clinic - Complete Documentation

## Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [High-Fidelity UX/UI Documentation](#high-fidelity-uxui-documentation)
4. [User Journey & Experience](#user-journey--experience)
5. [Recommendation Logic & Algorithm](#recommendation-logic--algorithm)
6. [API Endpoints & Services](#api-endpoints--services)
7. [Migration Guide: Gemini to Claude](#migration-guide-gemini-to-claude)
8. [Backend Recommendations](#backend-recommendations)
9. [Implementation Guide](#implementation-guide)

---

## Application Overview

**AI Workflow Clinic** is a clinical-themed web application that diagnoses operational bloat in product management workflows and prescribes AI-native solutions. The application uses a medical metaphor throughout, treating companies as "patients" and providing "clinical diagnoses" with three treatment scenarios.

### Core Functionality
- **Intake Assessment**: Collects comprehensive data about a company's workflow, tools, budget, and pain points
- **AI-Powered Diagnosis**: Generates three personalized workflow optimization scenarios using AI
- **Clinical Report**: Displays detailed diagnosis with workflow tables, cost projections, and complexity reduction metrics
- **Merchandise Store**: Features a "Scrubs Store" with clinical-themed merchandise

### Design Philosophy
- **Swiss Clinical Minimalism**: Clean, precise typography with Helvetica-inspired fonts
- **Medical Parody Aesthetic**: Professional medical terminology applied to workflow optimization
- **High-Contrast Color Palette**: Surgical red (#E53935), electric blue (#2979FF), and clinical black (#0B0B0B)
- **3D Visual Elements**: Animated falling pills on the landing page for visual interest

---

## Architecture & Tech Stack

### Frontend Stack
- **Framework**: React 19.2.3 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS (via CDN)
- **Typography**: Inter (body) + JetBrains Mono (monospace)
- **Math Rendering**: KaTeX (for LaTeX cost formulas)

### Current AI Integration
- **Provider**: Google Gemini API
- **Models Used**:
  - `gemini-3-pro-preview` - For diagnosis generation
- **SDK**: `@google/genai` v1.34.0

### Project Structure
```
ai-workflow-clinic-&-merch-store/
├── App.tsx                    # Main application router
├── index.tsx                  # React entry point
├── index.html                 # HTML template with styles
├── types.ts                   # TypeScript type definitions
├── vite.config.ts            # Vite configuration
├── package.json              # Dependencies
├── components/
│   ├── Landing.tsx           # Landing page
│   ├── IntakeForm.tsx        # Assessment form
│   ├── DiagnosisReport.tsx   # Results display
│   └── ScrubsStore.tsx       # Merchandise store
└── services/
    └── geminiService.ts      # Gemini API integration
```

---

## High-Fidelity UX/UI Documentation

### Color Palette

#### Primary Colors
- **Surgical Red**: `#E53935` / `#FF3B30`
  - Used for: CTAs, error states, accent elements, "Amputation List" backgrounds
  - Semantic meaning: Urgency, removal, critical actions

- **Electric Blue**: `#2979FF` / `#9ED8F6`
  - Used for: Secondary CTAs, chart lines, "Outcome" column highlights
  - Semantic meaning: Technology, future, positive outcomes

- **Clinical Black**: `#0B0B0B`
  - Used for: Primary text, buttons, borders, headers
  - Semantic meaning: Authority, precision, professionalism

- **Clinical White**: `#FFFFFF`
  - Used for: Backgrounds, negative space
  - Semantic meaning: Sterility, clarity, minimalism

#### Neutral Colors
- **Gray Scale**: Various shades from `#F8FAFC` (lightest) to `#0B0B0B` (darkest)
- **Gray-400**: `#9CA3AF` - Secondary text, labels
- **Gray-500**: `#6B7280` - Tertiary text, metadata
- **Gray-600**: `#4B5563` - Body text alternatives

### Typography System

#### Font Families
1. **Inter** (Primary)
   - Usage: Headings, body text, UI elements
   - Weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
   - Character: Modern, clean, professional

2. **JetBrains Mono** (Monospace)
   - Usage: Code, IDs, technical labels, cost formulas
   - Character: Technical, precise, clinical

#### Typography Scale
- **Display**: `text-6xl` to `text-8xl` (96px - 128px)
  - Usage: Hero headlines, major section titles
  - Weight: Bold (700)
  - Tracking: Tighter (`tracking-tighter`)

- **Heading 1**: `text-3xl` to `text-5xl` (30px - 48px)
  - Usage: Page titles, section headers
  - Weight: Bold (700)
  - Tracking: Normal to tight

- **Heading 2**: `text-xl` to `text-2xl` (20px - 24px)
  - Usage: Subsection headers, card titles
  - Weight: Bold (700)
  - Tracking: Wide (`tracking-widest` for uppercase)

- **Body**: `text-sm` to `text-base` (14px - 16px)
  - Usage: Paragraphs, descriptions
  - Weight: Normal (400)
  - Line height: Relaxed (`leading-relaxed`)

- **Small Text**: `text-xs` to `text-[10px]` (10px - 12px)
  - Usage: Labels, metadata, captions
  - Weight: Bold (700) for labels, Normal (400) for metadata
  - Tracking: Wide (`tracking-widest`, `tracking-[0.2em]`)

#### Typography Patterns
- **Uppercase Labels**: All form labels, section numbers, metadata
  - Pattern: `text-xs font-bold uppercase tracking-widest`
- **Monospace IDs**: Product IDs, prototype numbers
  - Pattern: `text-xs font-mono font-bold`
- **Clinical Headers**: Section headers with red accent
  - Pattern: `text-sm font-bold uppercase tracking-widest text-[#E53935]`

### Layout System

#### Grid System
- **12-Column Grid**: Used throughout for responsive layouts
- **Breakpoints**:
  - Mobile: Default (single column)
  - Tablet: `md:` (768px+) - 2 columns
  - Desktop: `lg:` (1024px+) - 3+ columns

#### Spacing Scale
- **Base Unit**: 4px (Tailwind default)
- **Common Spacings**:
  - `space-y-3` (12px) - Tight vertical spacing
  - `space-y-6` (24px) - Standard vertical spacing
  - `space-y-8` (32px) - Section spacing
  - `space-y-12` (48px) - Major section spacing
  - `p-4` (16px) - Standard padding
  - `p-6` (24px) - Card padding
  - `p-8` (32px) - Large card padding

#### Container Widths
- **Max Width**: `max-w-3xl` (768px) for landing, `max-w-7xl` (1280px) for reports
- **Padding**: `px-6` (24px) horizontal padding on mobile, responsive on desktop

### Component Library

#### Buttons

**Primary Button**
```tsx
className="bg-[#0B0B0B] text-white px-10 py-5 text-sm font-bold uppercase tracking-[0.15em] hover:bg-[#E53935] transition-colors duration-300 rounded-none"
```
- Background: Black
- Hover: Red
- No border radius (strict rectangles)
- Uppercase with wide letter spacing
- Padding: 40px horizontal, 20px vertical

**Secondary Button**
```tsx
className="border border-[#0B0B0B] text-[#0B0B0B] px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#0B0B0B] hover:text-white transition-all"
```
- Outlined style
- Inverts on hover (black fill, white text)

**Tertiary Button (Text Link)**
```tsx
className="text-xs font-bold uppercase tracking-[0.2em] text-[#0B0B0B] border-b-2 border-[#0B0B0B] pb-1 hover:text-[#E53935] hover:border-[#E53935] transition-all"
```
- Underlined text style
- Red on hover

#### Form Elements

**Text Input**
```tsx
className="w-full bg-white border border-gray-300 p-4 text-sm focus:border-[#0B0B0B] focus:ring-0 outline-none rounded-none"
```
- White background
- Gray border, black on focus
- No border radius
- Padding: 16px

**Select Dropdown**
```tsx
className="w-full bg-white border border-gray-300 p-4 text-sm focus:border-[#0B0B0B] focus:ring-0 outline-none appearance-none rounded-none"
```
- Custom styled with arrow icon overlay
- Same styling as text input

**Range Slider**
```tsx
className="w-full h-1 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#0B0B0B]"
```
- Thin track (4px height)
- Black accent color
- No border radius

**Checkbox**
```tsx
className="h-4 w-4 text-[#0B0B0B] border-gray-300 focus:ring-0 rounded-none accent-[#0B0B0B]"
```
- Custom styled with visual checkmark
- Black accent
- No border radius

**Radio Button**
```tsx
className="h-4 w-4 text-[#0B0B0B] border-gray-300 focus:ring-0 rounded-none checked:bg-[#0B0B0B] accent-[#0B0B0B]"
```
- Similar to checkbox
- Black fill when checked

#### Cards & Containers

**Standard Card**
```tsx
className="bg-white border border-gray-200 p-6"
```
- White background
- Subtle gray border
- Standard padding

**Highlighted Card (Red)**
```tsx
className="bg-[#E53935] p-6 text-white"
```
- Red background
- White text
- Used for "Amputation List"

**Highlighted Card (Gray)**
```tsx
className="bg-[#F3F4F6] p-6 border border-gray-200"
```
- Light gray background
- Used for cost projections

#### Tables

**Clinical Workflow Table**
- Header: Black background, white text, uppercase labels
- Rows: Alternating hover states (gray-50)
- Outcome Column: Light blue background (`bg-[#9ED8F6]/10`)
- Borders: 2px black border on header, 1px gray dividers
- Typography: Small text (text-sm), monospace for tools

### Animation System

#### Key Animations

**Falling Pills** (Landing Page)
```css
@keyframes fall {
  0% { transform: translateY(-200%) rotate(var(--r-start)); }
  100% { transform: translateY(120vh) rotate(var(--r-end)); }
}
```
- Duration: 20-28 seconds (varies per pill)
- Delay: 0-17 seconds (staggered)
- Rotation: Custom start/end angles per pill
- Infinite loop

**Pulse Animation** (Loading State)
```tsx
className="animate-pulse"
```
- Built-in Tailwind animation
- Used for loading dots

**Fade In** (Content Reveal)
```tsx
className="animate-fade-in"
```
- Custom animation for content appearing
- Smooth opacity transition

**Float Slow** (Background Elements)
```tsx
className="animate-float-slow"
```
- Subtle floating motion
- Used for background decorative elements

#### 3D Pill Effect
- **Box Shadow**: Multiple layers for depth
  - Inset shadow for border definition
  - Bottom shadow for volume
  - Drop shadow for elevation
- **Specular Highlight**: White gradient overlay (35% height, 6% inset)
- **Color Split**: 50/50 gradient (color/white) for visual interest

### Responsive Design

#### Mobile-First Approach
- Default styles target mobile (320px+)
- Progressive enhancement for larger screens
- Single column layouts on mobile
- Multi-column grids on tablet/desktop

#### Breakpoint Strategy
- **Mobile**: < 768px
  - Single column forms
  - Stacked navigation
  - Full-width buttons
  - Simplified tables (horizontal scroll)

- **Tablet**: 768px - 1023px
  - 2-column grids
  - Side-by-side form fields
  - Horizontal navigation

- **Desktop**: 1024px+
  - 3+ column layouts
  - Full table displays
  - Optimal spacing and typography

---

## User Journey & Experience

### Journey Map

#### 1. Landing Page (`LANDING` state)

**Entry Point**
- User arrives at the application
- First impression: Clinical, professional, minimalist aesthetic
- Animated 3D pills falling on left and right sides create visual interest without distraction

**Visual Elements**
- **Hero Logo**: Red cross symbol (24px × 96px) - medical icon
- **Brand Name**: "AI Workflow Clinic" in small uppercase text
- **Main Headline**: Large, bold "AI Workflow Clinic." (96px - 128px)
- **Subheadline**: Three-line welcome message
  - "Welcome."
  - "Please remove your shoes and legacy processes."
  - "We are ready to see you now." (gray, softer tone)
- **Divider**: 16px × 1px black line
- **CTA Buttons**:
  - Primary: "[ Start Diagnosis ]" - Black button, red on hover
  - Secondary: "I just want some Scrubs" - Text link with underline
- **Footer**: "Est. 2025 • Zurich / SF" in tiny monospace text

**User Actions**
1. Click "[ Start Diagnosis ]" → Transitions to `INTAKE` state
2. Click "I just want some Scrubs" → Transitions to `SCRUBS` state

**Emotional Tone**
- Professional yet approachable
- Medical authority with subtle humor
- Clean, trustworthy aesthetic

---

#### 2. Intake Form (`INTAKE` state)

**Purpose**: Collect comprehensive assessment data for diagnosis

**Layout Structure**
- **Header Section**:
  - Title: "Clinical Intake" (large, bold, uppercase)
  - Form number: "Form 104-B" (monospace, gray)
  - Description: "Please answer truthfully. We cannot prescribe effective treatment for symptoms you conceal."

**Form Sections** (4 main sections)

##### Section 01: Vitals
**Fields**:
1. **Company / Product** (Text Input)
   - Placeholder: "Describe the patient..."
   - Required field
   - Full width on mobile, half width on desktop

2. **Growth Stage** (Dropdown)
   - Options: Bootstrapping, Pre-Seed, Early-Seed, Growth, Established
   - Default: Early-Seed
   - Custom styled dropdown with arrow icon

3. **Team Size** (Text Input)
   - Placeholder: "e.g. 1 PM, 2 Eng"
   - Required field
   - Checkbox below: "I'm a Solo-founder (tiny violin plays)" - Humorous touch

4. **Current Tools** (Text Input)
   - Placeholder: "Jira, Notion, Slack..."
   - Required field
   - Free-form text input

**Visual Design**:
- Section label: "01. Vitals" in red, uppercase, small
- 12-column grid layout (3 columns for label, 9 for content on desktop)
- Spacing: 32px between fields

---

##### Section 02: Triage
**Fields**:

1. **Primary Anchor** (Radio Buttons)
   - Options:
     - The Doc-Centric Team (Notion)
     - The Dev-Centric Team (GitHub/Cursor)
     - The Communication-Centric Team (Slack)
     - Other (with text input)
     - We're just starting! (no Anchor tool yet)
   - Visual: Vertical list with borders, hover states
   - Default: Doc-Centric

2. **Tech Savviness** (Range Slider)
   - Range: 0-2 (3 positions)
   - Labels: "Newbie" | "Decent" | "Ninja"
   - Default: 1 (Decent)
   - Visual: Horizontal slider with labels below

3. **Automation Tolerance** (Range Slider)
   - Range: 0-2 (3 positions)
   - Labels: "Co-Pilot (Human Led)" | "Hybrid" | "Auto-Pilot (Agent Led)"
   - Default: 1 (Hybrid)
   - Visual: Horizontal slider with labels below

4. **Reported Symptoms** (Multi-Select Checkboxes)
   - Options:
     - "We use too many tools"
     - "I don't have time to deep dive"
     - "Context switching kills our flow"
     - "We pay too much and don't optimize enough"
     - "I have a small budget"
   - Visual: Custom checkboxes with red checkmark
   - Selected items turn red

**Visual Design**:
- Section label: "02. Triage" in red
- Conditional rendering for "Other" anchor text input
- Spacing: 32px between field groups

---

##### Section 03: Budget
**Fields**:

1. **Budget Per User** (Range Slider)
   - Range: $0 - $500+ per month
   - Step: $20 increments
   - Display: Shows current value as "$X/user/month" or "$500+/user/month"
   - Visual: Thin slider track, black accent

2. **Cost Sensitivity** (Button Group)
   - Options: "Price-First" | "Balanced" | "Value-First"
   - Visual: Three buttons in a row, black border
   - Active: Black background, white text
   - Inactive: White background, black text, hover gray
   - Subtext below explains each option:
     - Price-First: "Minimize costs, hard-justify premium tools"
     - Balanced: "Mix of affordable + premium with ROI"
     - Value-First: "Recommend best tools, explain cost as investment"
   - Default: Price-First

**Visual Design**:
- Section label: "03. Budget" in red
- Labels in very small uppercase gray text
- Spacing: 40px between field groups

---

##### Section 04: Clearance
**Fields**:

1. **Risk Sensitivity** (Button Group)
   - Options: "Low-Stakes" | "High-Stakes"
   - Visual: Two buttons side-by-side
   - Active: Black background, white text
   - Default: Low-Stakes

2. **Pre-op Check** (Checkbox)
   - Label: "MD Guide Uploaded"
   - Description: Indicates if user has uploaded markdown guides for AI agents
   - Visual: Standard checkbox in bordered container

3. **High-Stakes Requirements** (Conditional Multi-Select)
   - **Only shows if Risk Sensitivity = High-Stakes**
   - Options:
     - "Self-hosted required"
     - "SOC 2 compliance"
     - "HIPAA compliance"
     - "EU data residency"
     - "Air-gapped environment"
   - Visual: 2-column grid of checkboxes
   - Selected: Black background, white checkmark
   - Unselected: White background, gray text, hover black border

**Visual Design**:
- Section label: "04. Clearance" in red
- Conditional section with fade-in animation
- Dashed border separator above high-stakes section

---

**Form Submission**:
- Button: "Run Clinical Diagnosis"
- Full width, black background, white text
- Red on hover
- Positioned at bottom with 48px top padding
- On submit: Transitions to `ANALYZING` state

**Form Validation**:
- Required fields: Company, Team Size, Current Tools
- HTML5 validation (browser native)
- No custom error messages (relies on browser defaults)

---

#### 3. Analyzing State (`ANALYZING` state)

**Purpose**: Loading state while AI generates diagnosis

**Visual Design**:
- Full-screen centered layout
- White background
- **Loading Animation**:
  - Three colored dots (red, black, blue) in a row
  - Pulse animation
  - Spacing: 8px between dots
- **Text**:
  - Heading: "Scrubbing in." (48px, bold, black)
  - Subtext: "Listening for workflow murmurs..." (small, monospace, gray, uppercase, wide tracking)
- **Positioning**: Vertically and horizontally centered

**Duration**: Typically 5-15 seconds (depends on API response time)

**Transition**: Automatically moves to `DIAGNOSIS` state on success, or `ERROR` state on failure

---

#### 4. Diagnosis Report (`DIAGNOSIS` state)

**Purpose**: Display AI-generated workflow optimization scenarios

**Layout Structure**:

##### Header Bar
- **Left Side**:
  - Red square indicator (16px × 16px)
  - Title: "Diagnosis Results" (uppercase, bold, wide tracking)
- **Right Side** (Desktop):
  - "Discharge Patient" link (monospace, underline, hover red)
  - "Get some Scrubs" button (outlined, black border)
  - "Call a Nurse" button (blue background, white text)
- **Right Side** (Mobile):
  - Simplified to essential buttons only

**Main Content Area**:

##### Scenario Tabs
- **Layout**: 3-column grid (1 column per scenario on mobile)
- **Visual**: Black border, no internal borders except between tabs
- **Active Tab**: Black background, white text
- **Inactive Tabs**: White background, gray text, hover black
- **Labels**: "1. [Scenario Title]" (e.g., "1. The Mono-Stack")
- **Interaction**: Click to switch between scenarios

##### Content Grid (12-column layout)

**Left Column** (4 columns on desktop, 12 on mobile):

1. **Scenario Title & Description**
   - Title: Large (30px), bold, black
   - Description: Large body text (18px), gray, relaxed line height
   - Spacing: 16px between title and description

2. **Complexity Reduction Score**
   - Label: "Complexity Reduction" (red, uppercase, small)
   - Value: Large number (72px), bold, black
   - Format: "X%" (percentage)
   - Visual: Top border (2px black) above

3. **Amputation List** (Red Card)
   - Background: Red (#E53935)
   - Text: White
   - Header: "Amputation List (Remove)" with white dot indicator
   - Content: List of tools to remove
   - Format: "× [Tool Name]" (monospace, small)
   - Empty state: "No amputations required." (opacity 75%)

4. **Cost Projection** (Gray Card)
   - Background: Light gray (#F3F4F6)
   - Border: Gray
   - Header: "Cost Projection (5 Year)" (gray, uppercase, small)
   - **LaTeX Formula**: Rendered using KaTeX
     - Format: Mathematical formula (e.g., "C(t) = ...")
     - Styling: Monospace, black, base size
   - **5-Year Chart**: SVG line chart
     - X-axis: Years 1-5
     - Two lines:
       - Red line: Current trend (bloated)
       - Blue line: Treated (lean)
     - Points: Circles on each data point
     - Legend: Below chart with colored dots
     - Dimensions: 500px × 200px viewBox

**Right Column** (8 columns on desktop, 12 on mobile):

**Prescribed Protocol Table**
- **Header**:
  - Label: "Prescribed Protocol" (cyan background, black text, small, uppercase)
  - Table with 5 columns:
    1. Phase (1/6 width)
    2. Tool (1/6 width)
    3. AI Agent Role (1/4 width)
    4. Human Role (1/4 width)
    5. Outcome (1/6 width, cyan highlight)
- **Rows**:
  - Hover: Light gray background
  - Outcome column: Light cyan background (10% opacity), darker on hover (20%)
  - Typography:
    - Phase: Bold, small
    - Tool: Monospace, gray
    - AI/Human Roles: Normal, gray, tight line height
    - Outcome: Medium weight, black
  - Borders: 2px black on header, 1px gray between rows

**Data Structure** (per scenario):
- Title: String
- Description: String (2-3 sentences)
- Complexity Reduction Score: Number (0-100)
- Displacement List: Array of strings (tools to remove)
- Workflow: Array of workflow steps
- Cost Projection LaTeX: String (mathematical formula)
- Current Cost Yearly: Array of 5 numbers
- Projected Cost Yearly: Array of 5 numbers

**User Actions**:
1. Switch between scenarios using tabs
2. Click "Discharge Patient" → Returns to `LANDING`
3. Click "Get some Scrubs" → Transitions to `SCRUBS`
4. Click "Call a Nurse" → Shows alert (placeholder for future feature)

---

#### 5. Scrubs Store (`SCRUBS` state)

**Purpose**: Display clinical-themed merchandise

**Layout Structure**:

##### Sticky Header
- **Left Side**:
  - Back button: Square with arrow (40px × 40px), black border, hover black fill
  - Title: "Clinic Scrubs." (large, bold, uppercase)
  - Subtitle: "Official Apparel & Gear" (tiny, monospace, gray, uppercase)
- **Right Side**:
  - **Navigation** (Desktop only):
    - Category filters: "DNR Collection" | "Prescription Pad" | "Clinical Gear"
    - Active: Red underline, red text
    - Inactive: Transparent underline, gray text, hover black
  - **Cart Counter**:
    - Label: "Prescriptions:" (tiny, uppercase, gray)
    - Counter: Black square (32px × 32px), white number, monospace, bold
    - Format: "00" (zero-padded, 2 digits)

##### Main Content

**Intro Section** (12-column grid):
- **Left** (6 columns):
  - Headline: "Medical Grade Gear." (96px - 128px, bold, tight tracking)
  - Description: Large body text (20px), gray, max-width 448px
- **Right** (6 columns):
  - Border accent: 4px black left border
  - Label: "Synthesis Protocol" (red, uppercase, small)
  - Description: Monospace, small, relaxed line height
  - Content: Clinical description of merchandise philosophy

**Standard Inventory Section**:

- **Section Header**:
  - Label: "01. Standard Inventory" (gray, uppercase, small)
  - Divider: Horizontal line (1px, gray)

- **Product Grid**:
  - Layout: 3-column grid (1 column mobile, 2 tablet, 3 desktop)
  - Border: Black border on top and left, products fill grid
  - Each product card:
    - **Header**:
      - Category label: Tiny, monospace, uppercase, gray (top left)
      - Color indicator: 12px × 12px circle (red/blue/black) (top right)
    - **Image Placeholder**:
      - Aspect ratio: 4:5
      - Background: Light gray (#F1F5F9)
      - Content: "Coming Soon" text (large, bold, uppercase, rotated -15deg, opacity 30%, hover 50%)
      - ID label: Tiny, monospace, rotated 90deg, top right
    - **Product Info**:
      - Name: Large (24px), bold, uppercase, tight tracking, hover red
      - Description: Small (14px), gray, tight line height
    - **Footer**:
      - Dosage options: Small square buttons (32px × 32px), gray border, hover black
      - Price: Large (20px), bold, monospace
      - CTA: "[ Fill Prescription ]" button (full width, black, hover red)

**Product Categories**:
1. **DNR Collection**:
   - DNR: Do Not Reply (Tee, $48, Blue)
   - DNR: Do Not Refactor (Stickers, $12, Red)
   - DNR: Do Not Reschedule (Mug, $24, Black)

2. **Prescription Pad**:
   - Rx: Touch Grass (Hoodie, $95, Blue)
   - Rx: Delete Jira (Tee, $48, Red)
   - Rx: Chill Pills (Pills, $18, Red)

3. **Clinical Gear**:
   - Workflow MD Lab Coat ($185, Black)
   - On Call Cap ($35, Blue)

**Footer Section**:
- **Left**: "The Ethical Statement" (heading + description)
- **Right**: Two columns
  - Contact info (Duty Doctor, Emergency Line)
  - Returns info (30-Day Recovery, Partial Refund)
- Typography: Small, monospace, uppercase, gray

**User Actions**:
1. Filter by category (click category in header)
2. Add to cart (increments counter)
3. Navigate back (returns to `LANDING`)

---

#### 6. Error State (`ERROR` state)

**Purpose**: Display error message when diagnosis fails

**Visual Design**:
- Full-screen centered layout
- White background
- **Error Card**:
  - Max width: 448px
  - Border: Red (#E53935)
  - Background: Light red (#FFF5F5)
  - Padding: 32px
- **Content**:
  - Icon: Large "×" symbol (48px, red, bold)
  - Title: "Procedure Failed" (20px, bold, uppercase, wide tracking, black)
  - Message: Error text (gray-800)
  - Default message: "We'll need to intervene. This one calls for surgery."
- **Action Button**:
  - Full width, black background, white text
  - Text: "Return to Intake"
  - Hover: Red background
  - On click: Returns to `INTAKE` state

**Error Handling**:
- Catches API errors
- Logs to console
- Displays user-friendly message
- Provides recovery path (return to form)

---

### State Management

**View States** (TypeScript enum):
```typescript
type ViewState = 
  | 'LANDING'      // Initial landing page
  | 'INTAKE'       // Assessment form
  | 'ANALYZING'    // Loading state
  | 'DIAGNOSIS'    // Results display
  | 'SCRUBS'       // Merchandise store
  | 'ERROR';       // Error state
```

**State Variables**:
- `viewState`: Current view state
- `diagnosisResult`: DiagnosisResult | null (stores AI response)
- `error`: string | null (error message)

**State Transitions**:
```
LANDING → INTAKE (Start Diagnosis)
LANDING → SCRUBS (View Store)
INTAKE → ANALYZING (Submit Form)
ANALYZING → DIAGNOSIS (Success)
ANALYZING → ERROR (Failure)
DIAGNOSIS → LANDING (Discharge Patient)
DIAGNOSIS → SCRUBS (Get Scrubs)
SCRUBS → LANDING (Back Button)
ERROR → INTAKE (Return to Intake)
```

---

## Recommendation Logic & Algorithm

### Input Data Structure

The application collects the following data points:

```typescript
interface AssessmentData {
  company: string;                    // Company/product name
  stage: Stage;                       // Growth stage enum
  teamSize: string;                   // Team composition
  currentTools: string;               // Comma-separated tool list
  philosophy: AutomationPhilosophy;   // Co-Pilot | Hybrid | Auto-Pilot
  techSavviness: TechSavviness;       // Newbie | Decent | Ninja
  budgetPerUser: number;              // $0-$500+ per month
  costSensitivity: CostSensitivity;   // Price-First | Balanced | Value-First
  sensitivity: ProductSensitivity;     // Low-Stakes | High-Stakes
  highStakesRequirements: string[];   // Compliance/security requirements
  agentReadiness: boolean;            // Has uploaded MD guides
  anchorType: AnchorType;             // Primary tool anchor
  painPoints: string[];               // Selected pain points
  isSoloFounder: boolean;             // Solo founder flag
  otherAnchorText: string;            // Custom anchor tool
}
```

### AI Prompt Structure

The prompt sent to the AI includes:

1. **Role Definition**: "Lead Diagnostician" at AI Workflow Clinic
2. **Patient Intake Data**: All form fields formatted as key-value pairs
3. **Clinical Knowledge Base**: Tool interoperability and simplification logic (truncated in code, but should include):
   - Tool consolidation strategies
   - AI-native workflow patterns
   - Cost optimization principles
   - Compliance considerations
4. **Task**: Generate exactly 3 clinical scenarios

### Output Schema

The AI must return a structured JSON response:

```typescript
interface DiagnosisResult {
  scenarios: Scenario[];  // Exactly 3 scenarios
}

interface Scenario {
  title: string;                          // e.g., "The Mono-Stack"
  description: string;                    // 2-3 sentence explanation
  complexityReductionScore: number;        // 0-100 percentage
  displacementList: string[];             // Tools to remove
  workflow: WorkflowStep[];                // Prescribed protocol
  costProjectionLatex: string;            // LaTeX formula
  currentCostYearly: number[];            // 5-year projection (no changes)
  projectedCostYearly: number[];          // 5-year projection (with changes)
}

interface WorkflowStep {
  phase: string;          // Product cycle phase
  tool: string;           // Primary tool
  aiAgentRole: string;    // AI's autonomous actions
  humanRole: string;      // Human-in-the-loop actions
  outcome: string;        // Measurable result
}
```

### Recommendation Logic Principles

#### 1. Scenario Types

The three scenarios should represent different optimization strategies:

**Scenario 1: The Mono-Stack**
- **Philosophy**: Consolidate to a single primary tool/platform
- **Use Case**: Teams with tool sprawl, budget constraints
- **Approach**: Identify anchor tool, build everything around it
- **Complexity Reduction**: High (60-80%)
- **Displacement**: Multiple tools replaced by one

**Scenario 2: Native Integrator**
- **Philosophy**: Use native integrations between tools
- **Use Case**: Teams with established tools, moderate budget
- **Approach**: Connect tools via APIs, reduce manual work
- **Complexity Reduction**: Medium (40-60%)
- **Displacement**: Fewer tools, better integration

**Scenario 3: Agentic Lean**
- **Philosophy**: AI agents handle workflow automation
- **Use Case**: Tech-savvy teams, higher budget, agent readiness
- **Approach**: AI agents orchestrate workflows autonomously
- **Complexity Reduction**: Very High (70-90%)
- **Displacement**: Many tools replaced by AI agents

#### 2. Budget Constraints

The AI must respect budget constraints:

- **Price-First**: Recommend free/low-cost tools, justify any premium
- **Balanced**: Mix of affordable and premium with clear ROI
- **Value-First**: Recommend best tools regardless of cost, explain as investment

Budget calculation:
- `budgetPerUser` × `teamSize` = Total monthly budget
- Recommendations should fit within or slightly exceed (with justification)

#### 3. Automation Philosophy Mapping

- **Co-Pilot**: Human-led, AI assists
  - Workflow steps emphasize human decision-making
  - AI role: "Suggests", "Assists", "Flags"
  - Human role: "Reviews", "Approves", "Decides"

- **Hybrid**: Balanced human-AI collaboration
  - Workflow steps show shared responsibility
  - AI role: "Drafts", "Organizes", "Synthesizes"
  - Human role: "Refines", "Validates", "Oversees"

- **Auto-Pilot**: AI-led, human oversees
  - Workflow steps emphasize AI autonomy
  - AI role: "Executes", "Orchestrates", "Manages"
  - Human role: "Monitors", "Intervenes if needed", "Reviews outcomes"

#### 4. Tech Savviness Considerations

- **Newbie**: Recommend user-friendly tools, clear documentation, low technical barrier
- **Decent**: Can handle moderate complexity, API integrations, custom workflows
- **Ninja**: Can handle advanced configurations, self-hosted solutions, custom development

#### 5. High-Stakes Requirements

When `sensitivity === HighStakes`:
- Prioritize compliance (SOC 2, HIPAA, etc.)
- Recommend self-hosted or enterprise-grade tools
- Emphasize security and data residency
- May increase costs (justified in Value-First mode)

#### 6. Anchor Tool Strategy

The anchor tool becomes the central hub:

- **Doc-Centric (Notion)**: Build workflows around documentation
- **Dev-Centric (GitHub/Cursor)**: Build workflows around code
- **Comm-Centric (Slack)**: Build workflows around communication
- **Other**: Custom anchor, build around specified tool

#### 7. Pain Point Addressing

Each pain point should be addressed in at least one scenario:

- "We use too many tools" → Tool consolidation scenarios
- "I don't have time to deep dive" → Automation scenarios
- "Context switching kills our flow" → Integration scenarios
- "We pay too much" → Cost optimization scenarios
- "I have a small budget" → Budget-conscious scenarios

#### 8. Cost Projection Logic

**Current Cost Calculation** (if no changes):
- Base on current tools and team size
- Project 5 years with linear or exponential growth
- Consider per-user pricing, seat-based pricing, usage-based pricing

**Projected Cost Calculation** (with recommendations):
- Calculate new tool stack costs
- Factor in reduced tool count
- Account for efficiency gains (may reduce team size needs)
- Show savings over 5 years

**LaTeX Formula Format**:
- Mathematical representation of cost function
- Example: `C(t) = C_0 \times (1 + r)^t` (exponential growth)
- Example: `C(t) = C_0 + (r \times t)` (linear growth)

#### 9. Complexity Reduction Score

Calculated based on:
- Number of tools removed (displacement list length)
- Workflow step reduction
- Automation level increase
- Integration simplification

Formula (conceptual):
```
Complexity Reduction = 
  (Tools Removed / Total Tools) × 40% +
  (Automation Increase / Max Automation) × 30% +
  (Integration Simplification / Max Simplification) × 30%
```

#### 10. Workflow Step Generation

Each workflow step should:
- Cover a product cycle phase (e.g., "Planning", "Development", "Review", "Deploy")
- Specify a primary tool
- Define clear AI and human roles
- State a measurable outcome

Example workflow phases:
- Discovery & Planning
- Design & Prototyping
- Development & Coding
- Testing & QA
- Review & Approval
- Deployment & Release
- Monitoring & Iteration

---

## API Endpoints & Services

### Current Architecture

The application is **frontend-only** with direct API calls to Gemini from the browser. There are no backend endpoints currently.

### Service Layer

#### `services/geminiService.ts`

**Exports**:
1. `runDiagnosis(data: AssessmentData): Promise<DiagnosisResult>`
2. `generateMerchPrototype(blueprint: string): Promise<string>`

---

### API Call: Diagnosis Generation

**Function**: `runDiagnosis`

**Endpoint**: Google Gemini API (via SDK)
- **Model**: `gemini-3-pro-preview`
- **Method**: `ai.models.generateContent()`
- **Authentication**: API Key from environment variable

**Request Structure**:
```typescript
{
  model: 'gemini-3-pro-preview',
  contents: string,  // Formatted prompt
  config: {
    responseMimeType: "application/json",
    responseSchema: diagnosisSchema,  // Zod-like schema
    temperature: 0.4
  }
}
```

**Response Structure**:
```json
{
  "scenarios": [
    {
      "title": "The Mono-Stack",
      "description": "...",
      "complexityReductionScore": 75,
      "displacementList": ["Jira", "Trello", "Asana"],
      "workflow": [
        {
          "phase": "Planning",
          "tool": "Notion",
          "aiAgentRole": "Generates project briefs from requirements",
          "humanRole": "Reviews and approves scope",
          "outcome": "Clear project plan in 15 minutes"
        }
      ],
      "costProjectionLatex": "C(t) = 1000 \\times (1 + 0.1)^t",
      "currentCostYearly": [1000, 2000, 3000, 4000, 5000],
      "projectedCostYearly": [800, 900, 1000, 1100, 1200]
    }
  ]
}
```

**Error Handling**:
- API Key missing → Throws error with message
- API call fails → Logs error, throws to caller
- Invalid response → Throws "Diagnosis failed: No content returned"
- JSON parse error → Throws (handled by try-catch)

**Environment Variables**:
- `GEMINI_API_KEY` or `API_KEY` (checked in order)

---

### Environment Configuration

**File**: `.env.local` (not in repo, user creates)

**Variables**:
```
GEMINI_API_KEY=your_api_key_here
```

**Vite Configuration**:
- Loads environment variables via `loadEnv`
- Injects into `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
- Available at build time and runtime

---

## Migration Guide: Gemini to Claude

### Overview

This guide provides step-by-step instructions to replace all Gemini API calls with Claude API calls while maintaining identical functionality.

---

### Step 1: Update Dependencies

**Remove**:
```bash
npm uninstall @google/genai
```

**Install**:
```bash
npm install @anthropic-ai/sdk
```

**Update `package.json`**:
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

### Step 2: Create Claude Service

**Create**: `services/claudeService.ts`

**Replace**: `services/geminiService.ts` with Claude implementation

**Key Differences**:

1. **SDK Import**:
   ```typescript
   // Gemini
   import { GoogleGenAI, Type, Schema } from "@google/genai";
   
   // Claude
   import Anthropic from "@anthropic-ai/sdk";
   ```

2. **Client Initialization**:
   ```typescript
   // Gemini
   const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
   
   // Claude
   const client = new Anthropic({ apiKey: CLAUDE_API_KEY });
   ```

3. **Schema Definition**:
   - Gemini uses `Type` and `Schema` objects
   - Claude uses JSON Schema (standard format)
   - Convert existing schemas to JSON Schema

4. **API Call Structure**:
   - Gemini: `ai.models.generateContent()`
   - Claude: `client.messages.create()`

---

### Step 3: Convert Schemas

#### Diagnosis Schema Conversion

**Gemini Schema** (current):
```typescript
const workflowStepSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    phase: { type: Type.STRING, description: "..." },
    tool: { type: Type.STRING, description: "..." },
    // ...
  },
  required: ["phase", "tool", ...]
};
```

**Claude JSON Schema** (converted):
```typescript
const workflowStepSchema = {
  type: "object",
  properties: {
    phase: { type: "string", description: "..." },
    tool: { type: "string", description: "..." },
    // ...
  },
  required: ["phase", "tool", ...]
};
```

**Complete Schema Structure**:
```typescript
const diagnosisSchema = {
  type: "object",
  properties: {
    scenarios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Name of the scenario" },
          description: { type: "string", description: "Clinical explanation" },
          complexityReductionScore: { type: "number", description: "Percentage 0-100" },
          displacementList: {
            type: "array",
            items: { type: "string" },
            description: "List of tools to remove"
          },
          workflow: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string", description: "Product cycle phase" },
                tool: { type: "string", description: "Primary tool" },
                aiAgentRole: { type: "string", description: "AI autonomous actions" },
                humanRole: { type: "string", description: "Human-in-the-loop actions" },
                outcome: { type: "string", description: "Measurable result" }
              },
              required: ["phase", "tool", "aiAgentRole", "humanRole", "outcome"]
            },
            description: "Clinical workflow table"
          },
          costProjectionLatex: { type: "string", description: "Cost formula in LaTeX" },
          currentCostYearly: {
            type: "array",
            items: { type: "number" },
            description: "5-year cost projection (no changes)"
          },
          projectedCostYearly: {
            type: "array",
            items: { type: "number" },
            description: "5-year cost projection (with changes)"
          }
        },
        required: ["title", "description", "complexityReductionScore", "displacementList", "workflow", "costProjectionLatex", "currentCostYearly", "projectedCostYearly"]
      },
      description: "Exactly 3 clinical cures: Mono-Stack, Native Integrator, Agentic Lean"
    }
  },
  required: ["scenarios"]
};
```

---

### Step 4: Implement Claude Service

**File**: `services/claudeService.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { AssessmentData, DiagnosisResult, AnchorType } from "../types";

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.API_KEY || '';

// JSON Schema definitions (converted from Gemini schemas)
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
    - Tool Consolidation: Identify redundant tools and recommend consolidation strategies
    - AI-Native Workflows: Design workflows that leverage AI agents for automation
    - Cost Optimization: Balance tool costs with team efficiency and productivity
    - Integration Patterns: Use native APIs and integrations to reduce manual work
    - Compliance Considerations: Address SOC 2, HIPAA, EU data residency when required
    - Anchor Tool Strategy: Build workflows around the primary anchor tool (Notion, GitHub, Slack, etc.)
    
    TASK: Generate exactly 3 clinical Scenarios. Each scenario should represent a different optimization strategy:
    1. The Mono-Stack: Consolidate to a single primary tool/platform
    2. Native Integrator: Use native integrations between existing tools
    3. Agentic Lean: AI agents handle workflow automation
    
    Ensure recommendations respect the budget of $${data.budgetPerUser}/user and sensitivity strategy: ${data.costSensitivity}.
    
    For each scenario, provide:
    - A compelling title and description
    - Complexity reduction score (0-100%)
    - List of tools to remove (displacement list)
    - Detailed workflow steps with phases, tools, AI roles, human roles, and outcomes
    - Cost projection formula in LaTeX format
    - 5-year cost projections (current vs. projected)
  `;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022", // or "claude-3-opus-20240229" for higher quality
      max_tokens: 4096,
      temperature: 0.4,
      system: "You are a clinical diagnostician specializing in workflow optimization. Always respond with valid JSON matching the provided schema.",
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
    return JSON.parse(text) as DiagnosisResult;
  } catch (error) {
    console.error("Claude Diagnosis Error:", error);
    throw error;
  }
};

/**
 * Generates an image of custom clinical merch using Claude's image generation.
 * Note: Claude does not have native image generation. We'll use a workaround or alternative.
 */
export const generateMerchPrototype = async (blueprint: string): Promise<string> => {
  if (!CLAUDE_API_KEY) throw new Error("API Key missing");

  // IMPORTANT: Claude API does not support image generation.
  // Options:
  // 1. Use a different service (DALL-E, Midjourney, Stable Diffusion)
  // 2. Use Claude Vision to describe the image, then generate elsewhere
  // 3. Remove this feature or use placeholder images
  
  // For now, we'll throw an error indicating this needs to be handled differently
  throw new Error("Claude API does not support image generation. Please use an alternative service like DALL-E, Midjourney, or Stable Diffusion API.");
  
  // Alternative implementation using DALL-E (example):
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const response = await openai.images.generate({
  //   model: "dall-e-3",
  //   prompt: `Product photography for "AI Workflow Clinic" (AWC) merchandise. ${blueprint}...`,
  //   size: "1024x1024",
  //   quality: "standard",
  //   n: 1,
  // });
  // return response.data[0].url;
};
```

---

### Step 5: Update Environment Variables

**File**: `.env.local`

**Change**:
```
# Old
GEMINI_API_KEY=your_gemini_key

# New
CLAUDE_API_KEY=your_claude_key
```

**Update `vite.config.ts`**:
```typescript
define: {
  'process.env.CLAUDE_API_KEY': JSON.stringify(env.CLAUDE_API_KEY),
  'process.env.API_KEY': JSON.stringify(env.CLAUDE_API_KEY) // Fallback
}
```

---

### Step 6: Update Imports

**File**: `App.tsx`

**Change**:
```typescript
// Old
import { runDiagnosis } from './services/geminiService';

// New
import { runDiagnosis } from './services/claudeService';
```

---

### Step 7: Model Selection

**Claude Models Available**:

1. **claude-3-5-sonnet-20241022** (Recommended)
   - Best balance of speed and quality
   - Supports structured outputs (JSON schema)
   - Good for diagnosis generation

2. **claude-3-opus-20240229**
   - Highest quality, slower
   - Use for complex scenarios
   - More expensive

3. **claude-3-haiku-20240307**
   - Fastest, lower quality
   - Use for simple tasks
   - Most cost-effective

**Recommendation**: Use `claude-3-5-sonnet-20241022` for diagnosis generation.

---

### Step 8: Testing Checklist

- [ ] Diagnosis generation returns valid JSON
- [ ] All 3 scenarios are present
- [ ] Schema validation passes
- [ ] Cost projections are numbers
- [ ] Workflow steps have all required fields
- [ ] Error handling works correctly
- [ ] Environment variables load correctly
- [ ] UI displays results correctly
- [ ] No console errors

---

### Step 9: API Cost Considerations

**Claude Pricing** (as of 2024):
- Input: ~$3 per 1M tokens
- Output: ~$15 per 1M tokens
- Typical diagnosis call: ~2000 input tokens, ~1500 output tokens
- Cost per diagnosis: ~$0.03

**Comparison**:
- Gemini: Similar pricing, may vary by model
- Recommendation: Monitor usage, implement rate limiting if needed

---

## Backend Recommendations

### Current State

The application is **fully client-side** with no backend infrastructure. All API calls are made directly from the browser.

### Recommended Backend Architecture

#### Option 1: Serverless Functions (Recommended for MVP)

**Platform**: Vercel, Netlify, or AWS Lambda

**Benefits**:
- No server management
- Automatic scaling
- Low cost for low traffic
- Easy deployment

**Structure**:
```
/api
  /diagnosis
    POST - Generate diagnosis
```

**Implementation** (Vercel example):

**`api/diagnosis.ts`**:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  const assessmentData = req.body;

  try {
    const diagnosis = await runDiagnosis(assessmentData);
    return res.status(200).json(diagnosis);
  } catch (error) {
    return res.status(500).json({ error: 'Diagnosis failed' });
  }
}
```

**Benefits**:
- API keys stored server-side (secure)
- Rate limiting possible
- Caching possible
- Analytics tracking

---

#### Option 2: Express.js Backend

**Structure**:
```
backend/
  src/
    routes/
      diagnosis.ts
      prototype.ts
    services/
      claudeService.ts
      imageService.ts
    middleware/
      auth.ts
      rateLimit.ts
    app.ts
    server.ts
```

**Key Features**:
- RESTful API endpoints
- Authentication (optional)
- Rate limiting
- Request validation
- Error handling
- Logging

**Example Endpoint**:
```typescript
// routes/diagnosis.ts
import express from 'express';
import { runDiagnosis } from '../services/claudeService';
import { validateAssessmentData } from '../middleware/validation';

const router = express.Router();

router.post('/diagnosis', validateAssessmentData, async (req, res) => {
  try {
    const result = await runDiagnosis(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Diagnosis generation failed' });
  }
});

export default router;
```

---

#### Option 3: Full-Stack Framework (Next.js)

**Benefits**:
- Unified codebase
- Server-side rendering (optional)
- API routes built-in
- Easy deployment

**Structure**:
```
app/
  api/
    diagnosis/
      route.ts
    prototype/
      route.ts
  (routes)/
    page.tsx
  components/
    ...
```

---

### Recommended Backend Features

#### 1. API Key Management

**Current Issue**: API keys exposed in frontend (security risk)

**Solution**: Store API keys in backend environment variables

**Implementation**:
- Never expose API keys to frontend
- Backend makes all AI API calls
- Frontend calls backend endpoints

---

#### 2. Rate Limiting

**Purpose**: Prevent abuse, control costs

**Implementation**:
```typescript
import rateLimit from 'express-rate-limit';

const diagnosisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many diagnosis requests, please try again later.'
});
```

**Recommendations**:
- 10 requests per 15 minutes per IP
- 100 requests per day per IP
- Consider user authentication for higher limits

---

#### 3. Request Validation

**Purpose**: Ensure data integrity, prevent errors

**Implementation**:
```typescript
import { z } from 'zod';

const assessmentSchema = z.object({
  company: z.string().min(1).max(100),
  stage: z.enum(['Bootstrapping', 'Pre-Seed', ...]),
  teamSize: z.string().min(1),
  // ... all fields
});

export const validateAssessmentData = (req, res, next) => {
  try {
    req.body = assessmentSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid assessment data' });
  }
};
```

---

#### 4. Caching

**Purpose**: Reduce API costs, improve performance

**Implementation**:
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

export const getCachedDiagnosis = async (assessmentData: AssessmentData) => {
  const cacheKey = JSON.stringify(assessmentData);
  const cached = cache.get(cacheKey);
  
  if (cached) return cached;
  
  const result = await runDiagnosis(assessmentData);
  cache.set(cacheKey, result);
  return result;
};
```

**Considerations**:
- Cache key based on assessment data hash
- TTL: 1 hour (diagnosis results may change)
- Clear cache on demand if needed

---

#### 5. Error Handling & Logging

**Implementation**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

export const handleDiagnosisError = (error: Error, req: Request) => {
  logger.error('Diagnosis failed', {
    error: error.message,
    stack: error.stack,
    assessmentData: req.body,
    timestamp: new Date().toISOString()
  });
};
```

---

#### 6. Analytics & Monitoring

**Metrics to Track**:
- Number of diagnoses generated
- Average response time
- Error rates
- API costs per request
- Most common pain points
- Most selected scenarios

**Tools**:
- Vercel Analytics (if using Vercel)
- Google Analytics
- Custom logging to database
- Sentry for error tracking

---

#### 7. Database (Optional)

**Purpose**: Store diagnosis history, user preferences, analytics

**Schema** (example):
```sql
CREATE TABLE diagnoses (
  id UUID PRIMARY KEY,
  assessment_data JSONB,
  diagnosis_result JSONB,
  created_at TIMESTAMP,
  ip_address VARCHAR(45)
);

CREATE TABLE analytics (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50),
  event_data JSONB,
  created_at TIMESTAMP
);
```

**Use Cases**:
- Historical analysis
- A/B testing
- User journey tracking
- Cost optimization insights

---

#### 8. Authentication (Optional)

**Purpose**: Personalize experience, save history, premium features

**Implementation**:
- OAuth (Google, GitHub)
- JWT tokens
- Session management
- User profiles

**Features**:
- Save diagnosis history
- Favorite scenarios
- Export reports
- Premium features (unlimited diagnoses)

---

### API Endpoint Specifications

#### POST /api/diagnosis

**Request**:
```json
{
  "company": "Acme Corp",
  "stage": "Early-Seed",
  "teamSize": "5 people",
  "currentTools": "Jira, Notion, Slack",
  "philosophy": "Hybrid",
  "techSavviness": "Decent",
  "budgetPerUser": 50,
  "costSensitivity": "Balanced",
  "sensitivity": "Low-Stakes",
  "highStakesRequirements": [],
  "agentReadiness": false,
  "anchorType": "DocCentric",
  "painPoints": ["We use too many tools"],
  "isSoloFounder": false,
  "otherAnchorText": ""
}
```

**Response** (200 OK):
```json
{
  "scenarios": [
    {
      "title": "The Mono-Stack",
      "description": "...",
      "complexityReductionScore": 75,
      "displacementList": ["Jira", "Trello"],
      "workflow": [...],
      "costProjectionLatex": "C(t) = ...",
      "currentCostYearly": [1000, 2000, 3000, 4000, 5000],
      "projectedCostYearly": [800, 900, 1000, 1100, 1200]
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: AI API failure

---

### Deployment Recommendations

#### Frontend Deployment
- **Vercel**: Automatic deployments, CDN, easy setup
- **Netlify**: Similar to Vercel, good for static sites
- **AWS S3 + CloudFront**: More control, lower cost at scale

#### Backend Deployment
- **Vercel Functions**: If using Vercel frontend
- **AWS Lambda**: Serverless, scalable
- **Railway**: Simple deployment, good for Express.js
- **Render**: Easy deployment, free tier available

#### Environment Variables
- Store in platform's environment variable system
- Never commit to repository
- Use different keys for dev/staging/production

---

## Implementation Guide

### Quick Start: Migrating to Claude

1. **Install dependencies**:
   ```bash
   npm uninstall @google/genai
   npm install @anthropic-ai/sdk
   ```

2. **Create Claude service**:
   - Copy `services/geminiService.ts` to `services/claudeService.ts`
   - Replace Gemini SDK with Claude SDK
   - Convert schemas to JSON Schema format
   - Update API calls

3. **Update environment variables**:
   - Add `CLAUDE_API_KEY` to `.env.local`
   - Update `vite.config.ts` to load new variable

4. **Update imports**:
   - Replace `geminiService` imports with `claudeService`

5. **Test thoroughly**:
   - Verify diagnosis generation works
   - Check all UI components display correctly
   - Test error handling

---

### Future Enhancements

1. **Backend Implementation**: Move API calls to server-side
2. **User Accounts**: Save diagnosis history
3. **Export Features**: PDF reports, CSV exports
4. **Comparison Tool**: Compare multiple scenarios side-by-side
5. **Tool Database**: Maintain database of tools with pricing, features
6. **Recommendation Engine**: ML-based tool recommendations
7. **Integration Testing**: Test actual tool integrations
8. **Community Features**: Share scenarios, vote on recommendations

---

## Conclusion

This documentation provides a complete guide to understanding, migrating, and enhancing the AI Workflow Clinic application. The migration from Gemini to Claude is straightforward and only requires updating the diagnosis generation service.

The application's design is clean, professional, and user-friendly, with a unique medical theme that makes workflow optimization engaging and memorable.

For questions or clarifications, refer to the codebase or this documentation.
