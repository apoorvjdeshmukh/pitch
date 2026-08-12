import type { ArtifactDoc } from './types'

export const COMP: Record<string, string> = {
  navigating_ambiguity:  'Navigating ambiguity',
  data_driven_decisions: 'Data-driven decisions',
  stakeholder_influence: 'Influencing without authority',
  strategic_thinking:    'Strategic thinking',
  cross_functional:      'Cross-functional leadership',
  user_empathy:          'User empathy',
  product_sense:         'Product sense',
  analytical_thinking:   'Analytical thinking',
  execution_ownership:   'Execution & ownership',
  handling_failure:      'Handling failure & learning',
  team_development:      'Team development',
  communication:         'Communication & storytelling',
}

export const ROUND_COMP: Record<string, string[]> = {
  'Recruiter Screen':    ['communication', 'execution_ownership', 'stakeholder_influence'],
  'Hiring Manager':      ['strategic_thinking', 'cross_functional', 'execution_ownership', 'stakeholder_influence', 'data_driven_decisions'],
  'Product Sense':       ['product_sense', 'user_empathy', 'data_driven_decisions', 'communication'],
  'Analytical Thinking': ['analytical_thinking', 'data_driven_decisions', 'execution_ownership'],
  'Technical':           ['execution_ownership', 'communication', 'analytical_thinking', 'navigating_ambiguity'],
  'Panel':               ['cross_functional', 'stakeholder_influence', 'communication', 'strategic_thinking'],
  'Bar Raiser':          ['execution_ownership', 'handling_failure', 'navigating_ambiguity', 'strategic_thinking', 'data_driven_decisions'],
}

export const ROUND_TYPES = Object.keys(ROUND_COMP)

export const EXPECTED_ROUNDS_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: '2–3', value: 2 },
  { label: '4–5', value: 4 },
  { label: '6+', value: 7 },
  { label: 'Not sure', value: null },
]

// Optional: static reference docs that auto-attach to a campaign when its company
// name matches `campaignCompany`. Empty by default — add your own here, with the
// matching HTML file dropped in `public/`, if you want this feature.
export const ARTIFACTS: ArtifactDoc[] = []
