import { Message } from '../state/rootStore';
import { AppFlavor } from '../../config';

export type DecoyPreset = 'AUTO' | 'STUDY_HELPER' | 'MEAL_PLANNING' | 'GENERAL_ASSISTANT' | 'CUSTOM';

/**
 * DecoyContentManager
 *
 * Generates fake conversation histories for Decoy Mode / Decoy Protocol.
 * These appear when a user enters their duress code instead of real passcode.
 */

// Helper to generate message ID
const genId = () => Math.random().toString(36).substring(2, 15);
const timestamp = () => Date.now() - Math.floor(Math.random() * 3600000); // Random time in last hour

// ============================================================
// HUSH MODE PRESETS (Friendly, conversational)
// ============================================================

const HUSH_STUDY_HELPER: Message[] = [
  {
    id: genId(),
    role: 'user',
    text: "What's the formula for calculating velocity?",
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'ai',
    text: "Velocity equals displacement divided by time, or v = Δx/Δt. If you need average velocity, it's the total displacement over total time. For instantaneous velocity, you'd use calculus (the derivative of position). Want me to work through an example?",
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'user',
    text: 'Can you explain photosynthesis?',
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'ai',
    text: "Photosynthesis is how plants convert sunlight into energy. The basic equation is: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. Plants absorb carbon dioxide and water, use light energy to convert them into glucose (sugar) for food, and release oxygen as a byproduct. It happens in the chloroplasts, specifically using chlorophyll which gives plants their green color.",
    timestamp: timestamp(),
    context: 'HUSH',
  },
];

const HUSH_MEAL_PLANNING: Message[] = [
  {
    id: genId(),
    role: 'user',
    text: 'What should I make for dinner tonight?',
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'ai',
    text: "How about a quick stir-fry? You'll need some protein (chicken, tofu, or shrimp), mixed vegetables, soy sauce, garlic, and ginger. Cook the protein first, set aside, then stir-fry veggies on high heat for 2-3 minutes. Combine everything with sauce at the end. Serve over rice. Takes about 20 minutes total!",
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'user',
    text: 'I need a grocery list for the week',
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'ai',
    text: "Here's a basic weekly list: eggs, milk, bread, chicken breasts, ground beef, rice, pasta, canned tomatoes, onions, garlic, bell peppers, broccoli, spinach, bananas, apples, cheese, yogurt, olive oil. Want me to build this around specific meals you're planning?",
    timestamp: timestamp(),
    context: 'HUSH',
  },
];

const HUSH_GENERAL_ASSISTANT: Message[] = [
  {
    id: genId(),
    role: 'user',
    text: 'Good birthday gift ideas?',
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'ai',
    text: "Some categories to consider: experiences (concert tickets, cooking class, spa day), personalized items (custom photo book, engraved jewelry), practical luxuries (nice headphones, quality wallet), subscriptions (streaming service, book club, meal kit). What's your budget and who's the gift for? I can narrow it down.",
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'user',
    text: 'How do I remove a coffee stain?',
    timestamp: timestamp(),
    context: 'HUSH',
  },
  {
    id: genId(),
    role: 'ai',
    text: "For fresh stains: blot (don't rub) with cold water immediately. Mix 1 tablespoon dish soap + 1 tablespoon white vinegar + 2 cups warm water. Apply to stain, let sit 5 minutes, blot with clean cloth. Rinse with cold water. For older stains, try soaking in the solution for 30 minutes first. Avoid hot water - it can set the stain permanently.",
    timestamp: timestamp(),
    context: 'HUSH',
  },
];

// ============================================================
// CLASSIFIED MODE PRESETS (Terminal style, terse)
// ============================================================

const CLASSIFIED_STUDY_HELPER: Message[] = [
  {
    id: genId(),
    role: 'user',
    text: 'QUERY: VELOCITY FORMULA',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'ai',
    text: '> VELOCITY (v) = DISPLACEMENT (Δx) / TIME (Δt)\n> UNIT: m/s\n> VARIANTS:\n  - AVERAGE: v_avg = Δx_total / Δt_total\n  - INSTANTANEOUS: v = dx/dt\n> END QUERY',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'user',
    text: 'QUERY: PHOTOSYNTHESIS EQUATION',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'ai',
    text: '> PHOTOSYNTHESIS REACTION:\n> 6CO₂ + 6H₂O + LIGHT ENERGY → C₆H₁₂O₆ + 6O₂\n> LOCATION: CHLOROPLAST\n> KEY MOLECULE: CHLOROPHYLL\n> OUTPUT: GLUCOSE + OXYGEN\n> END QUERY',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
];

const CLASSIFIED_MEAL_PLANNING: Message[] = [
  {
    id: genId(),
    role: 'user',
    text: 'QUERY: DINNER OPTIONS',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'ai',
    text: '> RECOMMENDED: STIR-FRY\n> TIME: 20 MIN\n> INGREDIENTS:\n  - PROTEIN (CHICKEN/TOFU)\n  - VEGETABLES (MIXED)\n  - SOY SAUCE\n  - GARLIC, GINGER\n> PROCEDURE: COOK PROTEIN → SET ASIDE → STIR-FRY VEG → COMBINE\n> END QUERY',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'user',
    text: 'GENERATE: WEEKLY GROCERY LIST',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'ai',
    text: '> WEEKLY PROVISIONS:\n> PROTEIN: EGGS, CHICKEN, GROUND BEEF\n> DAIRY: MILK, CHEESE, YOGURT\n> PRODUCE: ONIONS, GARLIC, PEPPERS, BROCCOLI, SPINACH, BANANAS, APPLES\n> STAPLES: BREAD, RICE, PASTA, CANNED TOMATOES, OLIVE OIL\n> END LIST',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
];

const CLASSIFIED_GENERAL_ASSISTANT: Message[] = [
  {
    id: genId(),
    role: 'user',
    text: 'QUERY: GIFT RECOMMENDATIONS',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'ai',
    text: '> GIFT CATEGORIES:\n> EXPERIENCES: CONCERT, CLASS, SPA\n> PERSONALIZED: PHOTO BOOK, ENGRAVING\n> PRACTICAL: HEADPHONES, WALLET\n> SUBSCRIPTIONS: STREAMING, BOOK CLUB\n> PROVIDE: BUDGET + RECIPIENT FOR OPTIMIZATION\n> END QUERY',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'user',
    text: 'QUERY: COFFEE STAIN REMOVAL',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
  {
    id: genId(),
    role: 'ai',
    text: '> PROCEDURE:\n> 1. BLOT WITH COLD WATER (DO NOT RUB)\n> 2. MIX: 1 TBSP DISH SOAP + 1 TBSP VINEGAR + 2 CUPS WARM WATER\n> 3. APPLY → WAIT 5 MIN → BLOT\n> 4. RINSE COLD\n> WARNING: AVOID HOT WATER (SETS STAIN)\n> END QUERY',
    timestamp: timestamp(),
    context: 'CLASSIFIED',
  },
];

// ============================================================
// EXPORT FUNCTION
// ============================================================

/**
 * Get decoy messages for a given preset and mode
 */
export const getDecoyMessages = (
  preset: DecoyPreset,
  mode: AppFlavor,
  customMessages?: Message[]
): Message[] => {
  // Custom preset returns user-defined messages
  if (preset === 'CUSTOM' && customMessages) {
    return customMessages;
  }

  // Auto-generate (random selection)
  if (preset === 'AUTO') {
    const presets: DecoyPreset[] = ['STUDY_HELPER', 'MEAL_PLANNING', 'GENERAL_ASSISTANT'];
    const randomPreset = presets[Math.floor(Math.random() * presets.length)];
    return getDecoyMessages(randomPreset, mode);
  }

  // Get preset messages based on mode
  if (mode === 'HUSH') {
    switch (preset) {
      case 'STUDY_HELPER':
        return HUSH_STUDY_HELPER;
      case 'MEAL_PLANNING':
        return HUSH_MEAL_PLANNING;
      case 'GENERAL_ASSISTANT':
      default:
        return HUSH_GENERAL_ASSISTANT;
    }
  } else {
    // CLASSIFIED mode
    switch (preset) {
      case 'STUDY_HELPER':
        return CLASSIFIED_STUDY_HELPER;
      case 'MEAL_PLANNING':
        return CLASSIFIED_MEAL_PLANNING;
      case 'GENERAL_ASSISTANT':
      default:
        return CLASSIFIED_GENERAL_ASSISTANT;
    }
  }
};

/**
 * Get preset display name
 */
export const getPresetDisplayName = (preset: DecoyPreset): string => {
  switch (preset) {
    case 'AUTO':
      return 'Auto-generate';
    case 'STUDY_HELPER':
      return 'Study Helper';
    case 'MEAL_PLANNING':
      return 'Meal Planning';
    case 'GENERAL_ASSISTANT':
      return 'General Assistant';
    case 'CUSTOM':
      return 'Custom';
    default:
      return preset;
  }
};
