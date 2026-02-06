import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getToolService } from '../../lib/services/toolService';
import { createApiHandler } from '../../lib/middleware/apiHandler';
import { validateToolMatchRequest } from '../../lib/middleware/validation';

interface MatchResult {
  input: string;
  matched: boolean;
  tool: {
    id: string;
    name: string;
    displayName: string;
    category: string;
  } | null;
  confidence: number;
  matchedOn: 'name' | 'alias' | 'fuzzy' | null;
}

export default createApiHandler({
  methods: ['POST'],
  async handler(req: VercelRequest, res: VercelResponse) {
    // Validate request body
    const { names } = validateToolMatchRequest(req.body);

    const toolService = getToolService();
    const matches = await toolService.matchToolNames(names);

    // Format results
    const results: MatchResult[] = [];

    for (const name of names) {
      const match = matches.get(name);

      if (match) {
        results.push({
          input: name,
          matched: true,
          tool: {
            id: match.tool.id,
            name: match.tool.name,
            displayName: match.tool.displayName,
            category: match.tool.category,
          },
          confidence: match.confidence,
          matchedOn: match.matchedOn,
        });
      } else {
        results.push({
          input: name,
          matched: false,
          tool: null,
          confidence: 0,
          matchedOn: null,
        });
      }
    }

    const matchedCount = results.filter(r => r.matched).length;

    res.status(200).json({
      data: results,
      summary: {
        total: names.length,
        matched: matchedCount,
        unmatched: names.length - matchedCount,
      },
    });
  },
});
