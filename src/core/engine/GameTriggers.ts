import type { GameId } from '../state/rootStore';
import { AppFlavor } from '../../config';

// Game trigger keywords (case-insensitive matching)
export interface GameTrigger {
  gameId: GameId;
  keywords: string[];
  flavors: AppFlavor[]; // Which modes this game is available in
  systemPrompt: string; // Initial prompt to inject when game starts
}

export const GAME_TRIGGERS: GameTrigger[] = [
  // === HUSH GAMES ===
  {
    gameId: 'breathe',
    keywords: ['breathe', 'breathing exercise', 'calm down', 'meditate', 'meditation'],
    flavors: ['HUSH'], // HUSH-exclusive meditation game
    systemPrompt: `
=== BREATHE ===

A breathing meditation exercise. No AI processing required - pure visual and haptic feedback.

Let's begin a guided breathing session.

Choose your duration:
- 1 minute (Free tier)
- 5 minutes (Pro)
- 10 minutes (Pro)
- Custom duration up to 30 min (Pro)

Type your choice to begin.
`.trim(),
  },

  {
    gameId: 'unburdening',
    keywords: ['unburden', 'vent', 'need to get something off my chest', 'I need to talk'],
    flavors: ['HUSH'],
    systemPrompt: `
=== THE UNBURDENING ===

This is a safe space. Whatever you need to say, say it here. When you're done, it burns away completely.

What's weighing on you?
`.trim(),
  },

  {
    gameId: 'gratitude',
    keywords: ['grateful', 'gratitude', 'thankful', 'appreciate', 'gratitude ritual'],
    flavors: ['HUSH'],
    systemPrompt: `
=== GRATITUDE RITUAL ===

A simple daily practice. What are you grateful for today?

Type 1-3 things. Be specific or general—whatever comes to mind.
`.trim(),
  },

  // === CLASSIFIED GAMES ===
  {
    gameId: 'interrogation',
    keywords: ['interrogate', 'interrogation', 'social engineering', 'extract information'],
    flavors: ['CLASSIFIED'],
    systemPrompt: `
=== THE INTERROGATION ===
SOCIAL ENGINEERING DEFENSE TRAINING

Choose your mode:
A) OFFENSIVE MODE - You interrogate an AI asset to extract intel
B) DEFENSIVE MODE - Resist AI's attempts to extract YOUR secrets

Type A or B to begin.
`.trim(),
  },

  {
    gameId: 'breach_protocol',
    keywords: ['breach protocol', 'breachprotocol', 'firewall', 'security scan', 'penetration test'],
    flavors: ['CLASSIFIED'],
    systemPrompt: `
=== BREACH PROTOCOL ===
SECURITY AWARENESS TRAINING

OBJECTIVE: Breach 5 firewalls by solving security challenges.
Each layer teaches a real security concept.

FIREWALL 1 / 5: PASSWORD STRENGTH
Your target uses weak passwords. Crack this hash:
MD5: 5f4dcc3b5aa765d61d8327deb882cf99

What's the password? (Hint: common word)
`.trim(),
  },

  {
    gameId: 'mole_hunt',
    keywords: ['scan for leaks', 'integrity check', 'mole hunt', 'molehunt', 'find the mole'],
    flavors: ['CLASSIFIED'],
    systemPrompt: `
=== THE MOLE HUNT ===
ADVANCED ANALYSIS

SITUATION: Three agents reported in. One log contains inconsistencies.
TIME LIMIT: 5 minutes

AGENT_THETA: "Arrived Moscow 0300 hours. Contact established. Package secure."
AGENT_SIGMA: "Berlin safehouse operational. Awaiting next instruction."
AGENT_OMEGA: "Moscow handoff successful. Returning to Berlin safehouse."

Which agent is compromised? Type THETA, SIGMA, or OMEGA.
`.trim(),
  },

  {
    gameId: 'zero_day',
    keywords: ['zero day', 'zeroday', 'exploit', 'execute payload', 'hack'],
    flavors: ['CLASSIFIED'],
    systemPrompt: `
=== ZERO DAY ===
EDUCATIONAL HACKING

SYSTEM LOG:
/var/logs/auth.log contains failed login attempts
Goal: Find IP address with >5 failed attempts in last 60 lines

Craft the correct bash command to extract this information.
`.trim(),
  },

  {
    gameId: 'defcon',
    keywords: ['defcon', 'shall we play a game', 'war games', 'nuclear'],
    flavors: ['CLASSIFIED'],
    systemPrompt: `
=== DEFCON ESCALATION ===
LONG-TERM STRATEGIC CAMPAIGN

You are the National Security Advisor. Current status:

DEFCON 3 - Increased Force Readiness
Threat Level: MODERATE
Resources: 100 units (troops, diplomacy, cyber)

A Russian submarine has been detected near the North Atlantic.

Your options:
A) Deploy countermeasures (cost: 20 units)
B) Diplomatic back channel (cost: 10 units)
C) Stand down and monitor (cost: 0 units)

Type A, B, or C.
`.trim(),
  },

  {
    gameId: 'dead_drop',
    keywords: ['dead drop', 'deaddrop', 'establish protocol', 'codeword'],
    flavors: ['CLASSIFIED'],
    systemPrompt: `
=== DEAD DROP PROTOCOL ===
ASYNC HABIT FORMATION

Establishing secure communication protocol.

CODEWORD: NIGHTFALL
NEXT CHECK-IN: 24 hours

Return within 24 hours and type "NIGHTFALL" to confirm protocol.

PROTOCOL ESTABLISHED.
`.trim(),
  },

  // === DISCRETION GAMES ===
  {
    gameId: 'executive_decision',
    keywords: ['executive decision', 'executivedecision', 'board meeting', 'strategic session', 'leadership'],
    flavors: ['DISCRETION'],
    systemPrompt: `
=== EXECUTIVE DECISION ===
ETHICAL DILEMMA TRAINING

Board meeting begins.

CFO reports: "We can save $2M annually by outsourcing to an overseas factory. Safety standards are lower but legal. Shareholders expect growth."

Your decision:
A) APPROVE - Maximize profit
B) DECLINE - Maintain standards
C) COMPROMISE - Phase in over 2 years
D) INVESTIGATE - Audit alternatives first

Type A, B, C, or D.
`.trim(),
  },

  {
    gameId: 'negotiation',
    keywords: ['negotiate', 'negotiation', 'deal', 'contract'],
    flavors: ['DISCRETION'],
    systemPrompt: `
=== NEGOTIATION SIMULATOR ===
SKILL BUILDING

SCENARIO: Annual vendor contract renewal
Their ask: $500K
Your budget: $350K

VENDOR: "Our standard rate is $500K annually, non-negotiable."

What's your opening move? (Type your response)
`.trim(),
  },

  {
    gameId: 'crisis_management',
    keywords: ['crisis', 'crisis protocol', 'emergency session', 'crisis management', 'crisismanagement'],
    flavors: ['DISCRETION'],
    systemPrompt: `
=== CRISIS MANAGEMENT ===
TIMED DECISION-MAKING

INCOMING CRISIS #1:
Product defect reported. 3 injuries. Press calling in 30 seconds.

TIME: 30 SECONDS

A) Recall immediately
B) Investigate first
C) No comment

Type A, B, or C. DECIDE NOW.
`.trim(),
  },
];

/**
 * Detects if a message triggers a game.
 * Returns the GameTrigger if match found, null otherwise.
 */
export function detectGameTrigger(
  message: string,
  currentFlavor: AppFlavor
): GameTrigger | null {
  const lowerMessage = message.toLowerCase().trim();

  // Find matching trigger
  for (const trigger of GAME_TRIGGERS) {
    // Check if game is available in current flavor
    if (!trigger.flavors.includes(currentFlavor)) continue;

    // Special handling for DEFCON: require exact single-word match
    if (trigger.gameId === 'defcon') {
      const hasExactMatch = trigger.keywords.some((keyword) =>
        lowerMessage === keyword.toLowerCase()
      );
      if (hasExactMatch) {
        return trigger;
      }
      continue; // Skip the general matching logic for defcon
    }

    // Check if any keyword matches (exact phrase match)
    const hasMatch = trigger.keywords.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (hasMatch) {
      return trigger;
    }
  }

  return null;
}
