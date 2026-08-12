import type { Campaign, Story, Track } from './types'
import { COMP } from './constants'

export function analyzeProfilePrompt(linkedin: string, resume: string): string {
  const compKeys = Object.keys(COMP).join(', ')
  return `You are an expert interview coach building a candidate profile from their own source material — not guessing.

LinkedIn profile (exported text):
${linkedin.trim() || 'Not provided.'}

Resume:
${resume.trim() || 'Not provided.'}

Task:
1. Write a "summary" — a tight, factual paragraph of this candidate's background, written in their own voice, usable as context for future job-fit analysis. Stick to what's actually in the source text — do not invent roles, companies, or metrics that aren't there.
2. For each competency below that the source material actually provides evidence for, add an entry with the exact competency key and 1 sentence of evidence quoting or closely paraphrasing the source. Skip competencies with no real evidence — do not force-fill all of them.

Valid competency keys: ${compKeys}

Respond ONLY with valid JSON (no markdown):
{
  "summary": "...",
  "competencies": [{"key": "one of the valid keys above", "evidence": "1 sentence citing what in the source supports this"}]
}`
}

// Split into two independent prompts (fit analysis vs. cards) so
// CreateCampaignModal can fire them as parallel requests instead of one long
// sequential generation — a rich JD + a detailed background pushes a single
// combined generation past the API route's 60s function timeout, and the
// model doesn't reliably hold to "exactly N items" instructions on its own,
// so cutting wall-clock time structurally is the only fix that's actually
// reliable.
export function campaignFitPrompt(role: string, company: string, jd: string, background?: string, storyContext?: string): string {
  const hasBackground = !!background?.trim()
  const compKeys = Object.keys(COMP).join(', ')
  const backgroundBlock = hasBackground
    ? `Candidate's background/resume:\n${background!.trim()}\n\nUse this background to make the fit analysis genuinely personal to this candidate: cite specific experience from it in "strengths", and name real gaps between what they've actually done and what this JD needs — not generic gaps for this role. Personal and specific does not mean longer — stay within the word counts given below even when there's more you could cite.`
    : `No candidate background was provided. Do not invent a specific candidate history — instead generate a general read of what this role fundamentally requires and what a strong candidate would need to demonstrate.`

  const storyBlock = storyContext?.trim()
    ? `\nCandidate's Story Bank (proven evidence of what they've actually demonstrated — draw on this for strengths where relevant, and don't call something a gap if a story already backs it):\n${storyContext.trim()}\n`
    : ''

  const fitScoreBlock = hasBackground
    ? `Score fitScore as how well this specific candidate's background matches this role's requirements (10 = ideal match, 0 = fundamental mismatch).`
    : `Score fitScore as how attainable a strong general match to this role would be based on the JD alone (10 = commonly attainable, 0 = an extremely narrow/senior bar).`

  return `You are an expert interview coach. Analyze this job description and assess candidate fit.

Role: ${role} at ${company}
Job Description: ${jd}

${backgroundBlock}
${storyBlock}
${fitScoreBlock} fitScore must be a bare JSON integer from 0 to 10, no quotes around it — e.g. "fitScore": 7.

For each gap, also try to map it to the closest matching competency from this list: ${compKeys}. Only include competencyKey when one genuinely fits — omit the field entirely rather than forcing a weak match.

Keep every field to the length and count stated — short, tight answers keep generation fast. Output EXACTLY 3 strengths and EXACTLY 3 gaps — not more, even if more could genuinely apply. Each strength and each gap's "text"+"remedy" combined must be under 30 words.

Respond ONLY with valid JSON (no markdown):
{
  "summary": "2-3 sentences on what this role fundamentally requires and what an ideal candidate looks like",
  "strengths": ["exactly 3 items, each ONE concise sentence under 30 words"],
  "gaps": [{"text": "gap area to address, under 15 words", "remedy": "1-sentence specific action to close this gap before the interview, under 15 words", "competencyKey": "closest matching key from the valid list above, omit if none fits"}],
  "basedOnBackground": ${hasBackground},
  "fitScore": 7
}`
}

// Company/vocab cards don't depend on the candidate's background at all —
// they're facts about the role and company — so this runs as a separate,
// smaller, background-free request in parallel with campaignFitPrompt.
export function campaignCardsPrompt(role: string, company: string, jd: string): string {
  return `You are an expert interview coach. Generate company and role vocabulary flashcards from this job description.

Role: ${role} at ${company}
Job Description: ${jd}

Keep every field to the length and count stated — short, tight answers keep generation fast. Output EXACTLY 4 companyCards and EXACTLY 4 roleVocabCards — not more, even if more could genuinely apply.

Respond ONLY with valid JSON (no markdown):
{
  "companyCards": [
    {"front": "What does ${company} do and who are their core users?", "back": "Core product, primary user segment, and value delivered — 1-2 sentences"},
    {"front": "What is ${company}'s business model?", "back": "How they make money and key revenue drivers — 1-2 sentences"},
    {"front": "Who are ${company}'s main competitors?", "back": "2-3 key competitors and what differentiates ${company} — 1-2 sentences"},
    {"front": "What is ${company}'s current stage and scale?", "back": "Stage, headcount, funding/public status, key markets — 1-2 sentences"}
  ],
  "roleVocabCards": [
    {"front": "Key term from JD", "back": "What it means and why it matters for this role — 1-2 sentences"},
    {"front": "Second key term", "back": "Definition and relevance — 1-2 sentences"},
    {"front": "Third key term", "back": "Definition and relevance — 1-2 sentences"},
    {"front": "Fourth key term", "back": "Definition and relevance — 1-2 sentences"}
  ]
}`
}

// Scoped regeneration of fitAnalysis only — used after a candidate fills a
// flagged gap with a new story, so we don't re-spend tokens on the company
// cards / vocab, which don't change based on the story bank.
export function fitAnalysisPrompt(role: string, company: string, jd: string, background: string | undefined, storyContext: string): string {
  const hasBackground = !!background?.trim()
  const compKeys = Object.keys(COMP).join(', ')
  const backgroundBlock = hasBackground
    ? `Candidate's background/resume:\n${background!.trim()}\n\nUse this background to make the fit analysis genuinely personal to this candidate: cite specific experience from it in "strengths", and name real gaps between what they've actually done and what this JD needs — not generic gaps for this role. Personal and specific does not mean longer — stay within the word counts given below even when there's more you could cite.`
    : `No candidate background was provided. Do not invent a specific candidate history — instead generate a general read of what this role fundamentally requires and what a strong candidate would need to demonstrate.`

  const fitScoreBlock = hasBackground
    ? `Score fitScore as how well this specific candidate's background matches this role's requirements (10 = ideal match, 0 = fundamental mismatch).`
    : `Score fitScore as how attainable a strong general match to this role would be based on the JD alone (10 = commonly attainable, 0 = an extremely narrow/senior bar).`

  return `You are an expert interview coach. Re-analyze this candidate's fit for a role given their current story bank.

Role: ${role} at ${company}
Job Description: ${jd}

${backgroundBlock}

Candidate's story bank (evidence of what they've actually demonstrated — treat a competency as covered if a story backs it, and don't list it as a gap):
${storyContext || 'No stories yet.'}

${fitScoreBlock} fitScore must be a bare JSON integer from 0 to 10, no quotes around it — e.g. "fitScore": 7.

For each gap, also try to map it to the closest matching competency from this list: ${compKeys}. Only include competencyKey when one genuinely fits — omit the field entirely rather than forcing a weak match. Do not list a gap for any competency the story bank already covers.

Keep every field to the length and count stated — short, tight answers keep generation fast. Output EXACTLY 3 strengths and EXACTLY 3 gaps — not more, even if more could genuinely apply. Each strength and each gap's "text"+"remedy" combined must be under 30 words.

Respond ONLY with valid JSON (no markdown):
{
  "summary": "2-3 sentences on what this role fundamentally requires and what an ideal candidate looks like",
  "strengths": ["exactly 3 items, each ONE concise sentence under 30 words, informed by the story bank where relevant"],
  "gaps": [{"text": "gap area to address, under 15 words", "remedy": "1-sentence specific action to close this gap before the interview, under 15 words", "competencyKey": "closest matching key from the valid list above, omit if none fits"}],
  "basedOnBackground": ${hasBackground},
  "fitScore": 7
}`
}

export interface RoundPromptContext {
  interviewerNote?: string
  storyContext?: string
}

export function roundPrompt(type: string, c: Campaign, context?: RoundPromptContext): string {
  const extraLines = [
    context?.interviewerNote ? `Interviewer for this round: ${context.interviewerNote}` : '',
    context?.storyContext ? `Candidate's relevant story bank entries — draw on these specifics where useful instead of generic advice:\n${context.storyContext}` : '',
  ].filter(Boolean).join('\n\n')

  const base = `You are an expert interview coach. Generate prep materials for a ${type} interview.
Role: ${c.role} at ${c.company}
Job Description: ${c.jd.slice(0, 1500)}
${extraLines ? '\n' + extraLines + '\n' : ''}
Respond ONLY with valid JSON — no markdown, no explanation:
`

  // Every round type opens with the same self-introduction block — a ready
  // -to-read block the candidate can actually use to introduce themselves
  // on the call, not just talking points. Shared across schemas so it's
  // identical in structure round to round.
  const pitchForCallSection = `{"title":"Pitch for the call","type":"bullets","items":[{"title":"Hook (10s)","detail":"One sentence: your seniority + the 2-3 capability pillars from your background that map directly to the top requirements in this JD at ${c.company}. Name the domains, not generic skills for this role."},{"title":"Career narrative (40s)","detail":"The 1-2 moves that led here — for each: the domain, the thing you built or owned, one specific metric. Frame each transition as deliberate and forward, never as leaving."},{"title":"Why ${c.company} (20s)","detail":"One specific reason tied to a product area, team focus, or problem in the JD — something you can connect to your own work. Not the homepage. Something that shows you read the role."},{"title":"What you bring (20s)","detail":"The single differentiated edge you have for this exact role — what you offer that a generic candidate for this role would not. Then stop. Let them pull threads."}]}`

  const pmSchemas: Record<string, string> = {
    'Recruiter Screen': base + `Read the JD carefully and generate a recruiter screen prep guide. Replace every placeholder with content specific to the role and company. Return ONLY valid JSON:
{"sections":[${pitchForCallSection},{"title":"Questions to expect","type":"cards","items":[{"front":"What is your experience with [primary domain from the JD]?","back":"Lead with the most relevant project: the context, what you owned end-to-end, one metric. Connect it explicitly to what ${c.company} is building. Then stop."},{"front":"What is your experience with [second key domain or capability in the JD]?","back":"Same structure: project, scope, what you drove, one metric, relevance to ${c.company}. If the experience is partial, name your closest analog and be explicit."},{"front":"Do you have experience with [specific tool, platform, or domain named in the JD]?","back":"If yes: name the context and one number. If limited: 'Not in that specific context — my closest analog is [X] and here is how I would ramp.' Never fake depth."},{"front":"Why are you leaving your current role?","back":"One clean sentence framed as moving toward: 'I am looking for a role with [specific scope or domain from the JD] — this role at ${c.company} is exactly that.' Do not go longer."},{"front":"What are your compensation expectations?","back":"If a range is posted: 'That range works for me.' If not posted: 'I am flexible — what is the band for this role?' Never anchor below what the role is worth."},{"front":"Why ${c.company} specifically?","back":"Product area or problem you can connect to your own work. Show you read the JD and can articulate what ${c.company} is actually solving — not just what the company does."},{"front":"Location / availability / work authorization","back":"Have crisp one-liners ready: location and commute, work authorization status, earliest start date. These should take under 30 seconds total."}]},{"title":"Your questions for the recruiter","type":"list","items":["What is the biggest unsolved problem on this team's roadmap right now?","Is this a backfill or net new headcount — and how long has the role been open?","What does the path from this screen to offer typically look like — how many rounds and who would I be meeting?","What does success look like in the first 90 days?"]},{"title":"Calibration — what will hurt you","type":"bullets","items":[{"title":"Going long is the #1 risk","detail":"Headline + one metric, then stop. Recruiter screens are 20-30 minutes. If you monologue you signal poor communication calibration."},{"title":"Over-explaining gaps","detail":"If you have a gap in the JD requirements, name it briefly and bridge to your analog in one sentence. Then move on. Dwelling signals insecurity."},{"title":"Asking nothing","detail":"Ask 2-3 substantive questions. A candidate who asks nothing signals low conviction. Save process questions for last."}]},{"title":"Domain vocabulary to use naturally","type":"list","items":["List 4-5 specific terms from this JD that signal fluency in ${c.company}'s domain — use each once in context, never forced","Name any specific tools or platforms in the JD that you have experience with","End your intro with their language: the capabilities named in the JD should echo in how you describe your background"]}]}`,

    'Hiring Manager': base + `{"sections":[${pitchForCallSection},{"title":"Themes they'll probe","type":"bullets","items":[{"title":"Strategic thinking","detail":"How you set direction when the problem is ambiguous — walk through a real roadmap decision with full context"},{"title":"Cross-functional influence","detail":"How you align engineering, design, and data without direct authority — have a real story of a hard stakeholder situation"},{"title":"Data-driven judgment","detail":"How you balance quantitative signals with qualitative intuition — they'll want specifics, not principles"},{"title":"Ownership","detail":"Evidence that you drove things independently — every answer should have a clear 'I' not 'we'"}]},{"title":"STAR story prompts","type":"bullets","items":[{"title":"Tell me about a product you shipped that you're most proud of","detail":"Prepare: the insight that led to the decision, how you brought others along, the measurable result, what you'd do differently"},{"title":"Tell me about a time you had to kill a feature or change direction","detail":"Prepare: how you knew it was the right call, how you communicated it to stakeholders, what you learned"},{"title":"Tell me about a major disagreement with an engineer, designer, or exec","detail":"Prepare: how you listened, how you built alignment, the outcome, and the relationship after"}]},{"title":"Smart questions to ask","type":"list","items":["What's the biggest unsolved problem on your roadmap right now?","How do engineering and product make tradeoff decisions together?","What does success look like at 6 months vs 18 months?","What's the hardest part of working here that you wish someone had told you?","How does this team's work connect to ${c.company}'s top priorities this year?"]}]}`,

    'Product Sense': base + `{"sections":[${pitchForCallSection},{"title":"Framework flashcards","type":"cards","items":[{"front":"Step 1 — Clarify","back":"Confirm goal (growth / retention / monetization?), constraints, user scope. Ask one sharp clarifying question before touching ideas."},{"front":"Step 2 — User insight","back":"Name 2-3 user segments. Pick one. State their job-to-be-done, core frustration, and current workaround. Be specific."},{"front":"Step 3 — Problem framing","back":"Write a 'How might we...' statement before solutions. HMW [do X] for [user] so that [outcome]. Resist the urge to skip this."},{"front":"Step 4 — Ideation","back":"Generate 3-4 ideas: incremental, medium-bet, bold. Name and briefly describe each before evaluating any."},{"front":"Step 5 — Prioritization","back":"Evaluate on impact (reach × magnitude), confidence (evidence), effort. Pick 1-2 to go deep. Explain tradeoffs explicitly."},{"front":"Step 6 — Success metrics","back":"Name: one primary metric (north star), one secondary (quality check), one guardrail (what you won't sacrifice). All specific."}]},{"title":"Practice prompts","type":"list","items":["Design a feature that helps ${c.company} improve retention among its most valuable segment","How would you improve onboarding for a new ${c.company} user?","What would be your top roadmap priority for ${c.company} next quarter and why?","A core engagement metric dropped 15% last week — walk me through your diagnostic process"]},{"title":"Common failure modes","type":"bullets","items":[{"title":"Jumping to solutions","detail":"Spend 30%+ of time on user insight and problem framing first. Interviewers primarily test whether you understand the problem."},{"title":"Vague metrics","detail":"Don't say 'improve engagement.' Say '7-day retention from 40% to 55% in two quarters.' Specificity signals rigor."},{"title":"Feature laundry list","detail":"One well-reasoned idea beats five shallow ones. Once you've prioritized, go deep: user flow, edge cases, tradeoffs."},{"title":"Forgetting guardrail metrics","detail":"Always name what you won't sacrifice. Shows systems thinking and maturity."}]}]}`,

    'Analytical Thinking': base + `{"sections":[${pitchForCallSection},{"title":"Estimation framework","type":"cards","items":[{"front":"Step 1 — Clarify","back":"Confirm units, time period, geography. Restate: 'So you're asking for daily active users in the US?'"},{"front":"Step 2 — State your structure","back":"Write your formula before plugging in numbers. 'I'll estimate = [A] × [B] × [C].' Show logic before math."},{"front":"Step 3 — Anchor assumptions","back":"Start with known anchors: US population ~330M, smartphone penetration ~85%. Be explicit about each assumption."},{"front":"Step 4 — Calculate and sense-check","back":"Walk through math slowly. Then: 'Does this feel right?' Compare to a known reference point."},{"front":"Step 5 — State limitations","back":"Name what would shift the estimate: seasonality, segment differences, geographic variation. Shows analytical maturity."}]},{"title":"Metric trees","type":"bullets","items":[{"title":"Revenue","detail":"Revenue = DAU × monetization rate × ARPU. For ${c.company}, identify which lever is most actionable."},{"title":"Retention","detail":"Retention = users returning day N / users first activated. Break down by acquisition channel, segment, product surface."},{"title":"Engagement","detail":"Engagement = sessions/user × actions/session × depth/action. Find which sub-metric correlates with long-term retention."}]},{"title":"Questions to expect","type":"list","items":["Estimate how many people use ${c.company}'s product daily","A core metric dropped 20% — walk me through your full diagnostic","How would you measure the success of a feature we just launched?","How would you design an A/B test for a pricing change?","What's the single most important metric for ${c.company} right now?"]}]}`,

    'Technical': base + `{"sections":[${pitchForCallSection},{"title":"Technical vocabulary","type":"cards","items":[{"front":"API-first product thinking","back":"Designing where the API is the product — versioning, developer experience, rate limits, and documentation as product features."},{"front":"Data pipeline fundamentals","back":"ETL vs ELT, batch vs streaming, data warehouse vs data lake. Know the product-level tradeoffs: freshness, cost, query flexibility."},{"front":"System design vocabulary","back":"Load balancing, caching, database sharding, microservices vs monolith. Know when each matters and the product implications."},{"front":"A/B testing rigor","back":"Statistical significance, p-values, novelty effects, network effects on experiments. Know what can go wrong."}]},{"title":"Discussion prompts","type":"list","items":["Walk through the high-level architecture of a feature you recently shipped — what were the key technical decisions?","How would you think about designing ${c.company}'s notification or recommendation system at a product level?","If ${c.company} needed to scale to 10x load, what product decisions would change?","How do you work with engineers to scope a project — how do you push back on estimates?"]},{"title":"Technical PM principles","type":"bullets","items":[{"title":"Know your depth limit","detail":"'I understand the tradeoffs at a product level but would lean on my tech lead for implementation specifics' is stronger than faking depth."},{"title":"Connect tech to user value","detail":"Every technical discussion lands on user impact. Latency → drop-off. Data modeling → personalization quality."},{"title":"Ask smart questions","detail":"'Is this a monolith or microservices?' signals you think like a technical partner, not just a requirements-writer."}]}]}`,

    'Panel': base + `{"sections":[${pitchForCallSection},{"title":"Panel dynamics","type":"bullets","items":[{"title":"Address the room","detail":"Start answering toward the questioner, then include others. Panels score how you command attention across multiple people."},{"title":"Track what each person cares about","detail":"Notice which interviewer engages when you mention users vs data vs strategy. Tailor depth to each person's domain."},{"title":"Don't over-anchor on one person","detail":"If one panelist is nodding, move on. Over-indexing on one person signals low social awareness to everyone else."}]},{"title":"Cross-functional story prompts","type":"bullets","items":[{"title":"Influence without authority","detail":"Get a resistant team aligned on a direction — focus on how you changed the conversation, not just the outcome"},{"title":"Hard cross-functional tradeoff","detail":"Chose between engineering velocity and user experience, or business metrics and user trust — show your reasoning"},{"title":"Bringing external perspective in","detail":"Introduced data or a user insight that shifted the team's thinking — shows you drive clarity, not just execution"}]},{"title":"Strategic questions to ask","type":"list","items":["How does this team's work connect to ${c.company}'s company strategy?","What are the biggest cross-functional dependencies and how are they managed?","What's the hardest cross-functional relationship to manage on this team?","Where do you see this product in 3 years?"]}]}`,

    'Bar Raiser': base + `{"sections":[${pitchForCallSection},{"title":"What bar raisers look for","type":"bullets","items":[{"title":"Literal bar-raising","detail":"They ask: does this person make us collectively smarter? Answers should be more precise, more principled, or more insightful than average."},{"title":"Depth over breadth","detail":"Expect 3-4 follow-up questions on a single example. Prepare to go deep on 2-3 stories rather than shallow on 5-6."},{"title":"Ownership and agency","detail":"They want to see you drove things. Every answer needs a clear 'I' — what did YOU specifically decide, build, or change?"}]},{"title":"High-bar story prompts","type":"bullets","items":[{"title":"The hardest decision you've made","detail":"Have your data, your reasoning, the alternatives you seriously considered, and the result ready. They will push back."},{"title":"A real failure","detail":"Own your specific role in it, what you learned, and how you applied that learning afterward. Don't softball this."},{"title":"Something you built from scratch","detail":"Ownership and entrepreneurial thinking. What did YOU define and build? How do you know it actually mattered?"},{"title":"Disagreeing with leadership","detail":"Principled pushback with evidence, making your case clearly, then fully committing to the outcome either way."}]},{"title":"Traps to avoid","type":"list","items":["'We did X' instead of 'I specifically did Y because Z'","Blaming context or team instead of owning your role","Stopping too early — go 2 layers deeper than a normal interviewer pushes","Overselling results — know your exact numbers","Reciting principles without a concrete story"]}]}`,
  }

  const sweSchemas: Record<string, string> = {
    'Recruiter Screen': base + `Read the JD carefully and generate a recruiter screen prep guide. Replace every placeholder with content specific to the role and company. Return ONLY valid JSON:
{"sections":[${pitchForCallSection},{"title":"Questions to expect","type":"cards","items":[{"front":"What is your experience with [primary language/stack from the JD]?","back":"Lead with the most relevant project: the context, what you owned end-to-end, one metric or scale detail. Connect it explicitly to what ${c.company} is building. Then stop."},{"front":"What is your experience with [second key technology or system named in the JD]?","back":"Same structure: project, scope, what you built or drove, relevance to ${c.company}. If the experience is partial, name your closest analog and be explicit."},{"front":"Do you have experience with [specific tool, framework, or infra named in the JD]?","back":"If yes: name the context and scale. If limited: 'Not in that specific context — my closest analog is [X] and here is how I would ramp.' Never fake depth."},{"front":"Why are you leaving your current role?","back":"One clean sentence framed as moving toward: 'I am looking for a role with [specific scope or technical domain from the JD] — this role at ${c.company} is exactly that.' Do not go longer."},{"front":"What are your compensation expectations?","back":"If a range is posted: 'That range works for me.' If not posted: 'I am flexible — what is the band for this role?' Never anchor below what the role is worth."},{"front":"Why ${c.company} specifically?","back":"A specific technical problem or system you can connect to your own work. Show you read the JD and can articulate what ${c.company} is actually building — not just what the company does."},{"front":"Location / availability / work authorization","back":"Have crisp one-liners ready: location and commute, work authorization status, earliest start date. These should take under 30 seconds total."}]},{"title":"Your questions for the recruiter","type":"list","items":["What does this team's tech stack look like today, and is any of it actively being migrated?","Is this a backfill or net new headcount — and how long has the role been open?","What does the path from this screen to offer typically look like — how many rounds and who would I be meeting?","What does success look like in the first 90 days?"]},{"title":"Calibration — what will hurt you","type":"bullets","items":[{"title":"Going long is the #1 risk","detail":"Headline + one metric, then stop. Recruiter screens are 20-30 minutes. If you monologue you signal poor communication calibration."},{"title":"Over-explaining gaps","detail":"If you have a gap in the JD requirements, name it briefly and bridge to your analog in one sentence. Then move on. Dwelling signals insecurity."},{"title":"Asking nothing","detail":"Ask 2-3 substantive questions. A candidate who asks nothing signals low conviction. Save process questions for last."}]},{"title":"Technical vocabulary to use naturally","type":"list","items":["List 4-5 specific technical terms from this JD that signal fluency in ${c.company}'s stack — use each once in context, never forced","Name any specific languages, frameworks, or tools in the JD that you have hands-on experience with","End your intro with their language: the technologies named in the JD should echo in how you describe your background"]}]}`,

    'Hiring Manager': base + `{"sections":[${pitchForCallSection},{"title":"Themes they'll probe","type":"bullets","items":[{"title":"Technical ownership","detail":"Evidence you drove a system or project independently — every answer should have a clear 'I' not 'we'"},{"title":"Judgment under ambiguity","detail":"How you make a technical call when requirements are unclear or the spec is incomplete — they want your reasoning, not just the outcome"},{"title":"Cross-functional collaboration","detail":"How you work with PM/design/other engineers when priorities conflict — have a real story of a hard tradeoff conversation"},{"title":"Handling failure","detail":"A real production issue, bad estimate, or wrong technical call — how you caught it, fixed it, and what changed afterward"}]},{"title":"STAR story prompts","type":"bullets","items":[{"title":"Tell me about a system or feature you built that you're most proud of","detail":"Prepare: the technical context, the key design decisions, the measurable result, what you'd do differently"},{"title":"Tell me about a time you had to push back on a technical approach or deadline","detail":"Prepare: how you made your case, the evidence you brought, the outcome, and how you handled it if you lost the argument"},{"title":"Tell me about a major production incident or bug you owned","detail":"Prepare: how you diagnosed it, what you did under time pressure, the fix, and the follow-up to prevent recurrence"}]},{"title":"Smart questions to ask","type":"list","items":["What does the on-call/incident process look like on this team?","How does the team balance shipping speed against tech debt?","What does success look like at 6 months vs 18 months for this role?","What's the hardest part of working here that you wish someone had told you?","How does this team's work connect to ${c.company}'s top technical priorities this year?"]}]}`,

    'Coding': base + `{"sections":[${pitchForCallSection},{"title":"Interview framework flashcards","type":"cards","items":[{"front":"Step 1 — Clarify","back":"Restate the problem in your own words. Confirm input/output types, constraints, and edge cases (empty input, duplicates, negative numbers) before writing anything."},{"front":"Step 2 — Talk through approach first","back":"State your intended approach and its time/space complexity out loud before coding. Mention a brute-force option if relevant, then why you're not using it."},{"front":"Step 3 — Narrate while coding","back":"Say what you're writing and why as you go. Silence for 5+ minutes reads as unclear thinking, even if the code is correct."},{"front":"Step 4 — Test your own code","back":"Walk through your solution with a concrete example, including at least one edge case, before declaring it done."},{"front":"Step 5 — Discuss complexity and tradeoffs","back":"State final time/space complexity. Be ready to discuss an alternative approach and why you chose this one."}]},{"title":"Practice prompts","type":"list","items":["A common data-structure/algorithm problem in this domain — practice explaining your approach out loud, not just solving it silently","Given a rough problem statement with the details this JD implies, how would you clarify scope before writing code?","Debug a snippet that has a subtle off-by-one or race condition — narrate your diagnostic process","How would you optimize a solution that works but is too slow for ${c.company}'s scale?"]},{"title":"Common failure modes","type":"bullets","items":[{"title":"Coding before clarifying","detail":"Jumping straight to a solution without confirming constraints signals poor requirements-gathering, a core engineering skill."},{"title":"Silent debugging","detail":"If stuck, narrate your hypothesis and what you're checking next. Interviewers evaluate process, not just the final answer."},{"title":"Ignoring edge cases","detail":"Empty inputs, single elements, duplicates, and boundary values are the first thing a strong candidate checks."},{"title":"Not managing time","detail":"If you're stuck past a reasonable point, say so and ask for a hint rather than spiraling silently — that's a stronger signal than looking stuck."}]}]}`,

    'System Design': base + `{"sections":[${pitchForCallSection},{"title":"Design framework flashcards","type":"cards","items":[{"front":"Step 1 — Clarify requirements","back":"Confirm functional requirements (what must it do) and non-functional ones (scale, latency, consistency needs) before sketching anything."},{"front":"Step 2 — Estimate scale","back":"Rough numbers: users, requests/sec, data volume. State assumptions explicitly — this anchors every design decision that follows."},{"front":"Step 3 — High-level design","back":"Sketch the major components (API layer, services, storage, cache) and how data flows between them before going deep on any one piece."},{"front":"Step 4 — Deep dive on 1-2 components","back":"Pick the most interesting or constrained part (e.g. the data model, the caching strategy) and go deep on tradeoffs there."},{"front":"Step 5 — Address bottlenecks & tradeoffs","back":"Name the weakest point in your design and how you'd address it. Discuss consistency vs availability, cost vs latency tradeoffs explicitly."}]},{"title":"Design vocabulary","type":"bullets","items":[{"title":"Scalability","detail":"Load balancing, horizontal vs vertical scaling, sharding, read replicas — know when each applies and its cost."},{"title":"Consistency & availability","detail":"CAP theorem tradeoffs, eventual vs strong consistency, and which one ${c.company}'s domain would actually need."},{"title":"Caching & storage","detail":"Cache invalidation strategies, SQL vs NoSQL tradeoffs, when to denormalize for read performance."}]},{"title":"Practice prompts","type":"list","items":["Design a system relevant to ${c.company}'s product at their current scale","How would you design this system to handle 10x the current load?","Walk through the data model for a core feature at ${c.company} and its tradeoffs","How would you evolve a monolith toward services for a growing team, and when would you not bother?"]}]}`,

    'Panel': base + `{"sections":[${pitchForCallSection},{"title":"Panel dynamics","type":"bullets","items":[{"title":"Address the room","detail":"Start answering toward the questioner, then include others. Panels score how you command attention across multiple people."},{"title":"Track what each person cares about","detail":"Notice which interviewer engages when you mention system design vs code quality vs collaboration. Tailor depth to each person's domain."},{"title":"Don't over-anchor on one person","detail":"If one panelist is nodding, move on. Over-indexing on one person signals low social awareness to everyone else."}]},{"title":"Cross-functional story prompts","type":"bullets","items":[{"title":"Influence without authority","detail":"Get a resistant team aligned on a technical direction — focus on how you changed the conversation, not just the outcome"},{"title":"Hard technical tradeoff","detail":"Chose between shipping speed and code quality, or between two architectures — show your reasoning and how you brought others along"},{"title":"Bringing an outside perspective in","detail":"Introduced a technical insight or better approach that shifted the team's thinking — shows you drive clarity, not just execution"}]},{"title":"Strategic questions to ask","type":"list","items":["How does this team's work connect to ${c.company}'s broader technical strategy?","What are the biggest cross-team technical dependencies and how are they managed?","What's the hardest cross-functional relationship to manage on this team?","Where do you see this system in 2-3 years as the team and traffic grow?"]}]}`,

    'Bar Raiser': base + `{"sections":[${pitchForCallSection},{"title":"What bar raisers look for","type":"bullets","items":[{"title":"Literal bar-raising","detail":"They ask: does this person make us collectively smarter? Answers should be more precise, more principled, or more insightful than average."},{"title":"Depth over breadth","detail":"Expect 3-4 follow-up questions on a single example. Prepare to go deep on 2-3 stories rather than shallow on 5-6."},{"title":"Ownership and agency","detail":"They want to see you drove things. Every answer needs a clear 'I' — what did YOU specifically design, build, or fix?"}]},{"title":"High-bar story prompts","type":"bullets","items":[{"title":"The hardest technical decision you've made","detail":"Have your reasoning, the alternatives you seriously considered, and the result ready. They will push back."},{"title":"A real production failure or wrong technical call","detail":"Own your specific role in it, what you learned, and how you applied that learning afterward. Don't softball this."},{"title":"Something you built from scratch","detail":"Ownership and technical initiative. What did YOU design and build? How do you know it actually mattered?"},{"title":"Disagreeing with a senior engineer or leadership","detail":"Principled pushback with evidence, making your case clearly, then fully committing to the outcome either way."}]},{"title":"Traps to avoid","type":"list","items":["'We did X' instead of 'I specifically did Y because Z'","Blaming context or team instead of owning your role","Stopping too early — go 2 layers deeper than a normal interviewer pushes","Overselling results — know your exact numbers and scale","Reciting principles without a concrete story"]}]}`,
  }

  const schemasByTrack: Record<Track, Record<string, string>> = { pm: pmSchemas, swe: sweSchemas }
  const schemas = schemasByTrack[c.track ?? 'pm']

  return schemas[type] ?? schemas['Hiring Manager']
}

export function analyzeIvPrompt(role: string, company: string, roundType: string, profile: string): string {
  return `Analyze this LinkedIn profile for interview preparation.
Candidate interviewing for: ${role} at ${company} (${roundType})

Profile:
${profile}

Respond ONLY with valid JSON:
{"name":"full name","title":"current title and company","background":"2-sentence background summary","priorities":["priority 1","priority 2","priority 3"],"storyAngle":"how to angle stories for this specific interviewer","questionsToAsk":["Q1","Q2","Q3"],"keyInsight":"one non-obvious insight about their perspective"}`
}

export function qaSystemPrompt(competencyLabel: string, roundType: string, company: string): string {
  return `You are an expert interview coach helping a candidate build their STAR story bank.

Competency to build a story for: ${competencyLabel}
Interview context: ${roundType} at ${company}

Your job: have a natural, focused conversation to extract a strong work story.

Rules:
- Ask ONE short question at a time. No lists. No multiple questions.
- Each question should probe a specific detail: what happened, what YOU did, the result.
- If an answer is vague, probe for specifics (numbers, names of decisions, what you personally did).
- After at least 3 user responses, the user can ask you to generate the story.
- Do NOT say "Great answer!" or give any evaluation. Just ask the next question.
- Keep questions under 2 sentences.`
}

export function synthesizeStoryPrompt(competencyLabel: string, competencyKey: string, transcript: string): string {
  return `Based on this coaching conversation, write a polished STAR story for the competency: "${competencyLabel}".

Conversation:
${transcript}

Respond ONLY with valid JSON (no markdown):
{
  "title": "Short story title, 8 words max",
  "situation": "2-3 sentences setting the context",
  "task": "1-2 sentences on what needed to be done",
  "action": "3-5 sentences on what the candidate specifically did — this is the heart of the story",
  "result": "Measurable outcome, quantified if possible",
  "competencies": ["${competencyKey}"]
}`
}

export function reframeStoryPrompt(story: Story, role: string, company: string, vocabContext: string): string {
  return `Reframe this candidate's STAR story so it reads naturally for a ${role} interview at ${company}, using ${company}'s own vocabulary where it genuinely fits.

Hard rule: do NOT invent facts, change numbers, or alter what actually happened. Only adapt phrasing, framing, and terminology — this must stay truthful to the original story.

Original story:
Situation: ${story.situation}
Task: ${story.task}
Action: ${story.action}
Result: ${story.result}

${company}'s vocabulary to draw on where natural (do not force every term in):
${vocabContext || 'None provided.'}

Respond ONLY with valid JSON (no markdown):
{"situation": "reframed situation", "task": "reframed task", "action": "reframed action", "result": "reframed result"}`
}

export function briefPrompt(
  role: string,
  company: string,
  roundType: string,
  ivNote: string,
  storySummaries: string,
  companyContext: string,
): string {
  return `Generate a Day Before Brief for an interview.

Role: ${role} at ${company}
Round: ${roundType}
${ivNote}

Available stories from candidate's story bank:
${storySummaries || 'None yet.'}

Company context: ${companyContext}

Respond ONLY with valid JSON:
{
  "storiesToLead": [
    {"title": "story title", "angle": "1-sentence reason to lead with this story for THIS specific round"},
    {"title": "story title 2", "angle": "reason"},
    {"title": "story title 3", "angle": "reason"}
  ],
  "companyFacts": [
    "Specific fact about ${company} worth dropping naturally in conversation",
    "Second specific fact"
  ],
  "interviewerNote": "What to keep in mind about this specific interviewer, or a key preparation tip for this round type if no profile exists",
  "questionsToAsk": [
    "Smart, specific question 1 tailored to this round and company",
    "Smart question 2",
    "Smart question 3"
  ]
}`
}
