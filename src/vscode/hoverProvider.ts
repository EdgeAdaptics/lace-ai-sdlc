import * as vscode from 'vscode';
import { getViolationCount } from '../sdlc/persistentState';
import type { LaceExtensionResources } from '../types/resources';
import { getAdvisoryMode } from '../config/settings';

export function registerHoverProvider(resources: LaceExtensionResources): vscode.Disposable {
  return vscode.languages.registerHoverProvider({ scheme: 'file' }, {
    provideHover: async (document, position) => {
      const diagnostics = resources.diagnostics.get(document.uri) ?? [];
      const hovered = diagnostics.find(diagnostic => diagnostic.range.contains(position));
      if (!hovered) {
        return undefined;
      }

      const policyId = typeof hovered.code === 'string' ? hovered.code : undefined;
      if (!policyId) {
        return undefined;
      }

      const evaluation = resources.evaluationCache.get(document.uri.toString());
      if (!evaluation) {
        return undefined;
      }

      const match = evaluation.matches.find(item => item.policy.id === policyId);
      if (!match) {
        return undefined;
      }

      const violationCount = await getViolationCount(evaluation.laceRoot, policyId);
      const driftScore = Math.min(violationCount / 5, 1).toFixed(2);
      const markdown = buildHoverMarkdown(
        {
          policyId,
          decisionId: match.policy.origin,
          violationCount,
          driftScore,
          entropyHint: computeEntropyHint(evaluation)
        },
        getAdvisoryMode()
      );
      return new vscode.Hover(new vscode.MarkdownString(markdown));
    }
  });
}

export interface HoverData {
  policyId: string;
  decisionId?: string;
  violationCount: number;
  driftScore: string;
  entropyHint: string;
}

export function buildHoverMarkdown(data: HoverData, mode: 'silent' | 'normal' | 'verbose'): string {
  const lines = [
    `* Policy: ${data.policyId}`,
    `* Decision: ${data.decisionId ?? 'None'}`,
    `* Violations: ${data.violationCount}`,
    `* Drift Score: ${data.driftScore}`
  ];

  if (mode === 'verbose') {
    lines.push(`* Entropy Hint: ${data.entropyHint}`);
  }

  return lines.join('\n');
}

function computeEntropyHint(evaluation: { entropy?: { score: number } } & { context: { text: string } }): string {
  const raw = evaluation.entropy?.score ?? Math.min(evaluation.context.text.length / 400, 1);
  return raw.toFixed(4);
}
