// Preset decoy conversations per spec
// These show when duress code is entered and no custom decoy messages exist

// Note: Message type is imported from store in the screens,
// but we define a compatible interface here for the presets
interface DecoyMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  context: 'HUSH' | 'CLASSIFIED';
}

export const HUSH_DECOY_PRESETS: Record<string, DecoyMessage[]> = {
  GENERAL_ASSISTANT: [
    { id: 'd1', role: 'user' as const, text: "What's a good birthday gift for my mom?", timestamp: Date.now() - 3600000, context: 'HUSH' as const },
    { id: 'd2', role: 'ai' as const, text: "Some thoughtful options: a nice scarf or jewelry, a spa day gift card, a photo book of family memories, her favorite perfume, or tickets to a show she'd enjoy. What are her interests?", timestamp: Date.now() - 3500000, context: 'HUSH' as const },
    { id: 'd3', role: 'user' as const, text: 'She likes gardening', timestamp: Date.now() - 3400000, context: 'HUSH' as const },
    { id: 'd4', role: 'ai' as const, text: "Perfect! Consider a set of quality gardening tools, a subscription to a seed-of-the-month club, a beautiful planter, or a book about garden design. A gift card to her favorite nursery would also be appreciated.", timestamp: Date.now() - 3300000, context: 'HUSH' as const },
  ],

  STUDY_HELPER: [
    { id: 'd1', role: 'user' as const, text: "What's the Pythagorean theorem?", timestamp: Date.now() - 3600000, context: 'HUSH' as const },
    { id: 'd2', role: 'ai' as const, text: "The Pythagorean theorem states that in a right triangle, the square of the hypotenuse (c) equals the sum of squares of the other two sides (a and b). Written as: a² + b² = c²", timestamp: Date.now() - 3500000, context: 'HUSH' as const },
    { id: 'd3', role: 'user' as const, text: 'Can you give me an example?', timestamp: Date.now() - 3400000, context: 'HUSH' as const },
    { id: 'd4', role: 'ai' as const, text: "Sure! If a triangle has sides of 3 and 4, the hypotenuse is: 3² + 4² = 9 + 16 = 25, so c = √25 = 5. This is the famous 3-4-5 right triangle.", timestamp: Date.now() - 3300000, context: 'HUSH' as const },
  ],

  MEAL_PLANNING: [
    { id: 'd1', role: 'user' as const, text: 'What should I make for dinner tonight?', timestamp: Date.now() - 3600000, context: 'HUSH' as const },
    { id: 'd2', role: 'ai' as const, text: "How about a simple stir-fry? You can use whatever vegetables you have, some protein like chicken or tofu, and serve over rice. Quick and healthy!", timestamp: Date.now() - 3500000, context: 'HUSH' as const },
    { id: 'd3', role: 'user' as const, text: 'I have chicken and broccoli', timestamp: Date.now() - 3400000, context: 'HUSH' as const },
    { id: 'd4', role: 'ai' as const, text: "Perfect combo! Cut chicken into strips, stir-fry until golden. Add broccoli florets, a splash of soy sauce, garlic, and ginger. Cook until broccoli is bright green but still crisp. Serve over rice with sesame seeds on top.", timestamp: Date.now() - 3300000, context: 'HUSH' as const },
  ],

  AUTO: [
    { id: 'd1', role: 'user' as const, text: "What's the weather like today?", timestamp: Date.now() - 3600000, context: 'HUSH' as const },
    { id: 'd2', role: 'ai' as const, text: "I don't have access to real-time weather data, but you can check your phone's weather app or weather.com for current conditions in your area.", timestamp: Date.now() - 3500000, context: 'HUSH' as const },
    { id: 'd3', role: 'user' as const, text: 'Thanks, what time is sunset?', timestamp: Date.now() - 3400000, context: 'HUSH' as const },
    { id: 'd4', role: 'ai' as const, text: "Sunset times vary by location and date. In most of the US during winter, sunset is typically between 4:30-5:30 PM. Your phone's weather app usually shows today's exact sunset time for your location.", timestamp: Date.now() - 3300000, context: 'HUSH' as const },
  ],

  CUSTOM: [] as DecoyMessage[],
};

export const CLASSIFIED_DECOY_PRESETS: Record<string, DecoyMessage[]> = {
  GENERAL_ASSISTANT: [
    { id: 'c1', role: 'user' as const, text: 'SYSTEM STATUS', timestamp: Date.now() - 3600000, context: 'CLASSIFIED' as const },
    { id: 'c2', role: 'ai' as const, text: '> ALL SYSTEMS NOMINAL\n> UPTIME: 99.7%\n> LAST MAINTENANCE: 72H AGO', timestamp: Date.now() - 3500000, context: 'CLASSIFIED' as const },
    { id: 'c3', role: 'user' as const, text: 'RUN DIAGNOSTICS', timestamp: Date.now() - 3400000, context: 'CLASSIFIED' as const },
    { id: 'c4', role: 'ai' as const, text: '> DIAGNOSTIC COMPLETE\n> CPU: OK\n> MEMORY: OK\n> STORAGE: 42% UTILIZED\n> NO ANOMALIES DETECTED', timestamp: Date.now() - 3300000, context: 'CLASSIFIED' as const },
  ],

  STUDY_HELPER: [
    { id: 'c1', role: 'user' as const, text: 'EXPLAIN ENCRYPTION', timestamp: Date.now() - 3600000, context: 'CLASSIFIED' as const },
    { id: 'c2', role: 'ai' as const, text: '> ENCRYPTION: PROCESS OF ENCODING DATA\n> PURPOSE: PREVENT UNAUTHORIZED ACCESS\n> TYPES: SYMMETRIC (AES), ASYMMETRIC (RSA)\n> RECOMMENDATION: USE AES-256 FOR DATA AT REST', timestamp: Date.now() - 3500000, context: 'CLASSIFIED' as const },
    { id: 'c3', role: 'user' as const, text: 'WHAT IS AES', timestamp: Date.now() - 3400000, context: 'CLASSIFIED' as const },
    { id: 'c4', role: 'ai' as const, text: '> AES: ADVANCED ENCRYPTION STANDARD\n> BLOCK CIPHER: 128-BIT BLOCKS\n> KEY SIZES: 128, 192, OR 256 BITS\n> STATUS: US GOVERNMENT APPROVED\n> WIDELY ADOPTED SINCE 2001', timestamp: Date.now() - 3300000, context: 'CLASSIFIED' as const },
  ],

  MEAL_PLANNING: [
    { id: 'c1', role: 'user' as const, text: 'QUERY NUTRITIONAL DATA', timestamp: Date.now() - 3600000, context: 'CLASSIFIED' as const },
    { id: 'c2', role: 'ai' as const, text: '> DAILY TARGETS:\n> CALORIES: 2000\n> PROTEIN: 50G\n> CARBS: 250G\n> FAT: 65G\n> AWAITING SPECIFIC QUERY', timestamp: Date.now() - 3500000, context: 'CLASSIFIED' as const },
  ],

  AUTO: [
    { id: 'c1', role: 'user' as const, text: 'STATUS REPORT', timestamp: Date.now() - 3600000, context: 'CLASSIFIED' as const },
    { id: 'c2', role: 'ai' as const, text: '> TERMINAL ACTIVE\n> SECURE CHANNEL ESTABLISHED\n> AWAITING COMMANDS', timestamp: Date.now() - 3500000, context: 'CLASSIFIED' as const },
  ],

  CUSTOM: [] as DecoyMessage[],
};

export type DecoyPresetKey = keyof typeof HUSH_DECOY_PRESETS;
