import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { CLASSIFIED_THEMES } from '../themes/themes';
import { ClassifiedHeader } from './components/ClassifiedUI';
import { getLocalDateString } from '../utils/dateUtils';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type DefconLevel = 1 | 2 | 3 | 4 | 5;
type ThreatLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'NUCLEAR';
type DecisionType = 'escalate' | 'diplomatic' | 'cyber' | 'standdown';
type CampaignOutcome = 'victory' | 'defeat' | 'stalemate';
type DefconScreen = 'intro' | 'phase_briefing' | 'decision' | 'consequence' | 'evolution' | 'campaign_end';

interface ResourceCost {
  military: number;
  diplomacy: number;
  cyber: number;
}

interface DefconCampaignState {
  // Core progression
  defconLevel: DefconLevel;
  phaseNumber: number;

  // Resources (0-100 scale)
  resources: {
    military: number;
    diplomacy: number;
    cyber: number;
  };

  // Time tracking
  lastPhaseTimestamp: number;
  lastPhaseDate: string;

  // Decision history
  decisions: Array<{
    phase: number;
    choice: DecisionType;
    consequence: string;
    resourceImpact: ResourceCost;
  }>;

  // Threat tracking
  threatLevel: ThreatLevel;

  // Campaign outcome
  completed: boolean;
  outcome?: CampaignOutcome;
}

interface DecisionOption {
  id: DecisionType;
  label: string;
  description: string;
  resourceCost: ResourceCost;
  defconImpact: -1 | 0 | 1;
  threatImpact: number;
  consequenceText: string;
}

interface PhaseDefinition {
  number: number;
  title: string;
  situation: string;
  objective: string;
  options: DecisionOption[];
  evolutionText: string;
}

// ============================================================
// PHASE DEFINITIONS
// ============================================================

const PHASES: PhaseDefinition[] = [
  {
    number: 1,
    title: 'INITIAL_CRISIS',
    situation: `SITUATION: Border skirmish in contested territory.
Intelligence reports enemy troop movements.
Allies requesting immediate support.

Current Status:
• Enemy forces: 2 divisions mobilizing
• Allied forces: Requesting backup
• Civilian casualties: Rising
• International pressure: Mounting`,
    objective: 'Establish strategic posture without triggering full conflict',
    options: [
      {
        id: 'escalate',
        label: 'DEPLOY_FORCES',
        description: 'Deploy military assets to border region',
        resourceCost: { military: -20, diplomacy: -5, cyber: 0 },
        defconImpact: -1,
        threatImpact: 15,
        consequenceText: `Forces deployed successfully.

Enemy responding with counter-mobilization.
Regional allies express concern over escalation.
Window for diplomatic solution narrowing.

Military readiness at peak.
International relations strained.`
      },
      {
        id: 'diplomatic',
        label: 'OPEN_CHANNELS',
        description: 'Emergency diplomatic summit with neutral mediators',
        resourceCost: { military: 0, diplomacy: -15, cyber: -5 },
        defconImpact: 0,
        threatImpact: -10,
        consequenceText: `Summit convened with neutral parties.

Tentative ceasefire established.
Both sides agree to temporary stand-down.
International community applauds restraint.

Diplomatic capital expended.
Enemy intentions remain unclear.`
      },
      {
        id: 'cyber',
        label: 'INTEL_OP',
        description: 'Launch cyber reconnaissance to assess true threat',
        resourceCost: { military: 0, diplomacy: 0, cyber: -20 },
        defconImpact: 0,
        threatImpact: 5,
        consequenceText: `Intelligence operation successful.

Enemy plans decoded: Troop movements are defensive posturing.
Internal faction pressuring leadership to escalate.
Strategic weakness identified in command structure.

Cyber resources depleted.
Enemy unaware of breach.`
      },
      {
        id: 'standdown',
        label: 'STRATEGIC_PATIENCE',
        description: 'Monitor without escalation',
        resourceCost: { military: 0, diplomacy: -5, cyber: -5 },
        defconImpact: 0,
        threatImpact: -5,
        consequenceText: `Strategic patience maintained.

Situation stabilizes temporarily.
Enemy forces remain at border but no further movement.
Allies express frustration at lack of action.

Resources conserved.
Tensions remain high.`
      }
    ],
    evolutionText: `While you were away, the border crisis intensified.

Enemy fortifications detected.
Civilian evacuation ongoing.
Allied patience wearing thin.

Intelligence suggests enemy preparing secondary operation.`
  },
  {
    number: 2,
    title: 'PROXY_CONFLICT',
    situation: `SITUATION: Enemy backing insurgent forces in allied nation.
Proxy war threatening regional stability.
Evidence of weapons transfers confirmed.

Current Status:
• Insurgent strength: Growing rapidly
• Allied government: Under siege
• Weapons shipments: Ongoing
• Regional stability: Deteriorating`,
    objective: 'Counter proxy forces without direct confrontation',
    options: [
      {
        id: 'escalate',
        label: 'ARM_ALLIES',
        description: 'Supply advanced weapons to allied government',
        resourceCost: { military: -25, diplomacy: -10, cyber: 0 },
        defconImpact: -1,
        threatImpact: 20,
        consequenceText: `Advanced weapons delivered covertly.

Allied forces gain tactical advantage.
Enemy increases support to insurgents in response.
Risk of direct confrontation escalating.

Military stockpiles depleted.
Proxy war intensifying.`
      },
      {
        id: 'diplomatic',
        label: 'SANCTION_REGIME',
        description: 'Coordinate international sanctions and isolation',
        resourceCost: { military: 0, diplomacy: -20, cyber: -10 },
        defconImpact: 0,
        threatImpact: -5,
        consequenceText: `Sanctions coalition formed.

Economic pressure mounting on enemy.
Weapons transfers slowing but not stopped.
Enemy propaganda portrays us as aggressors.

Diplomatic leverage exhausted.
Long-term strategy taking hold.`
      },
      {
        id: 'cyber',
        label: 'DISRUPT_SUPPLY',
        description: 'Cyber attacks on enemy supply chains',
        resourceCost: { military: 0, diplomacy: -5, cyber: -25 },
        defconImpact: 0,
        threatImpact: 10,
        consequenceText: `Cyber operations successful.

Enemy logistics networks disrupted.
Weapons shipments delayed significantly.
Attribution unclear but enemy suspects involvement.

Cyber capabilities strained.
Enemy enhancing digital defenses.`
      },
      {
        id: 'standdown',
        label: 'HUMANITARIAN_FOCUS',
        description: 'Concentrate on refugee support and aid',
        resourceCost: { military: 0, diplomacy: -10, cyber: -5 },
        defconImpact: 0,
        threatImpact: 0,
        consequenceText: `Humanitarian corridors established.

International goodwill increasing.
Insurgent forces continue to gain ground.
Allied government requests more direct support.

Resources allocated to relief efforts.
Strategic position unchanged.`
      }
    ],
    evolutionText: `During your absence, the proxy conflict escalated.

Insurgent forces captured key infrastructure.
Allied government losing control of territory.
Regional powers choosing sides.

Enemy confidence growing.`
  },
  {
    number: 3,
    title: 'NAVAL_STANDOFF',
    situation: `SITUATION: Enemy naval task force entering disputed waters.
Our carrier group in the region.
Freedom of navigation at stake.

Current Status:
• Enemy vessels: 12 ships including cruisers
• Our forces: Carrier group with escorts
• Distance: 50 nautical miles and closing
• Threat level: Weapons lock detected`,
    objective: 'Maintain strategic position without naval engagement',
    options: [
      {
        id: 'escalate',
        label: 'TACTICAL_MANEUVER',
        description: 'Position strike group for engagement readiness',
        resourceCost: { military: -30, diplomacy: -15, cyber: 0 },
        defconImpact: -1,
        threatImpact: 25,
        consequenceText: `Strike group repositioned aggressively.

Enemy task force alters course but maintains presence.
Both sides weapons hot, targeting solutions active.
Single miscalculation could trigger naval battle.

Military at maximum readiness.
Risk of accidental engagement critical.`
      },
      {
        id: 'diplomatic',
        label: 'BACK_CHANNEL',
        description: 'Urgent military-to-military communications',
        resourceCost: { military: -10, diplomacy: -25, cyber: -10 },
        defconImpact: 0,
        threatImpact: -15,
        consequenceText: `Direct military communications established.

De-escalation protocols agreed upon.
Both sides maintain position but reduce threat posture.
Face-saving solution allowing mutual stand-down.

Diplomatic reserves exhausted.
Temporary reprieve secured.`
      },
      {
        id: 'cyber',
        label: 'ELECTRONIC_WARFARE',
        description: 'Jam enemy targeting and communications',
        resourceCost: { military: -10, diplomacy: -5, cyber: -30 },
        defconImpact: 0,
        threatImpact: 15,
        consequenceText: `Electronic warfare assets deployed.

Enemy fire control systems disrupted.
Temporary tactical advantage achieved.
Enemy aware of cyber attack, escalating countermeasures.

Cyber warfare capabilities depleted.
Enemy preparing enhanced responses.`
      },
      {
        id: 'standdown',
        label: 'STRATEGIC_WITHDRAWAL',
        description: 'Reposition forces to reduce tensions',
        resourceCost: { military: -5, diplomacy: -10, cyber: 0 },
        defconImpact: 1,
        threatImpact: -20,
        consequenceText: `Forces withdrawn from immediate area.

Immediate crisis defused.
Enemy claims victory, occupies disputed waters.
Allies question our resolve and commitment.

Military posture weakened.
Regional influence diminished.`
      }
    ],
    evolutionText: `While you were absent, the naval standoff intensified.

Additional enemy vessels arrived.
Our allies deployed supporting units.
Commercial shipping halted in the region.

Accidental engagement risk increasing.`
  },
  {
    number: 4,
    title: 'INTELLIGENCE_BREACH',
    situation: `SITUATION: Massive cyber attack on government networks.
Classified data compromised.
Enemy fingerprints on the intrusion.

Current Status:
• Systems compromised: 40% of secure networks
• Data exfiltrated: Terabytes of classified intel
• Attribution: High confidence enemy state actor
• Active intrusion: Ongoing`,
    objective: 'Respond to cyber attack and prevent further damage',
    options: [
      {
        id: 'escalate',
        label: 'KINETIC_RESPONSE',
        description: 'Strike cyber warfare facilities with precision munitions',
        resourceCost: { military: -35, diplomacy: -20, cyber: -10 },
        defconImpact: -1,
        threatImpact: 30,
        consequenceText: `Precision strikes launched on enemy cyber command.

Target facilities destroyed.
Enemy leadership furious, promises retaliation.
International reaction mixed - unprecedented escalation.

Military action taken.
Cyber war becomes conventional war.`
      },
      {
        id: 'diplomatic',
        label: 'EXPOSE_OPERATION',
        description: 'Public disclosure with international condemnation',
        resourceCost: { military: 0, diplomacy: -30, cyber: -15 },
        defconImpact: 0,
        threatImpact: -10,
        consequenceText: `Evidence presented to international community.

Enemy isolated by cyber attack condemnation.
Coordinated response forming.
Enemy denies involvement despite clear evidence.

Diplomatic pressure maximized.
Long-term consequences for enemy.`
      },
      {
        id: 'cyber',
        label: 'COUNTER_HACK',
        description: 'Retaliatory cyber operations on enemy infrastructure',
        resourceCost: { military: -10, diplomacy: -10, cyber: -35 },
        defconImpact: 0,
        threatImpact: 20,
        consequenceText: `Counter-cyber operations executed.

Enemy power grid and communications disrupted.
Civilian impact in enemy territory significant.
Cyber warfare escalating into dangerous territory.

Cyber arsenal depleted.
Enemy preparing devastating response.`
      },
      {
        id: 'standdown',
        label: 'DAMAGE_CONTROL',
        description: 'Focus on securing networks and containment',
        resourceCost: { military: -5, diplomacy: -10, cyber: -20 },
        defconImpact: 0,
        threatImpact: -5,
        consequenceText: `Networks secured and hardened.

Data breach contained.
Enemy retains stolen intelligence.
Defensive posture allows assessment of damage.

Cyber defenses rebuilt.
Enemy gains intelligence advantage.`
      }
    ],
    evolutionText: `During your absence, the cyber breach consequences emerged.

Stolen data used in enemy propaganda.
Allied intelligence partnerships questioned.
Additional intrusion attempts detected.

Enemy exploiting stolen information.`
  },
  {
    number: 5,
    title: 'FINAL_CRISIS',
    situation: `SITUATION: Enemy military exercises near our borders.
Nuclear forces mobilizing.
Ultimatum delivered: 48 hours to respond.

Current Status:
• Enemy forces: Full mobilization
• Nuclear posture: Elevated
• Ultimatum: Territorial concessions demanded
• Global tension: Unprecedented

This is the final decision.
The fate of millions rests on your choice.`,
    objective: 'Resolve the crisis - war or peace',
    options: [
      {
        id: 'escalate',
        label: 'FULL_MOBILIZATION',
        description: 'Counter with full military mobilization',
        resourceCost: { military: -40, diplomacy: -25, cyber: -15 },
        defconImpact: -1,
        threatImpact: 40,
        consequenceText: `Full mobilization ordered.

All forces at maximum readiness.
Nuclear weapons on alert.
The world holds its breath.

Brinkmanship at its peak.
Any miscalculation leads to catastrophe.`
      },
      {
        id: 'diplomatic',
        label: 'EMERGENCY_SUMMIT',
        description: 'Direct leader-to-leader negotiations',
        resourceCost: { military: -15, diplomacy: -35, cyber: -10 },
        defconImpact: 0,
        threatImpact: -25,
        consequenceText: `Emergency summit convened.

Direct negotiations underway.
Concessions on both sides required.
Framework for lasting peace emerging.

Diplomacy prevails.
The crisis begins to de-escalate.`
      },
      {
        id: 'cyber',
        label: 'DECAPITATION_STRIKE',
        description: 'Cyber attack on enemy command and control',
        resourceCost: { military: -20, diplomacy: -15, cyber: -40 },
        defconImpact: 0,
        threatImpact: 35,
        consequenceText: `Cyber decapitation strike launched.

Enemy command networks crippled.
Confusion in enemy leadership.
High risk of uncontrolled escalation.

Cyber gambit executed.
Enemy response unpredictable.`
      },
      {
        id: 'standdown',
        label: 'ACCEPT_TERMS',
        description: 'Agree to territorial concessions',
        resourceCost: { military: -10, diplomacy: -20, cyber: -10 },
        defconImpact: 1,
        threatImpact: -30,
        consequenceText: `Concessions accepted.

War averted, but at a cost.
Territory ceded to enemy control.
Allies question our resolve.

Peace preserved.
Strategic position weakened.`
      }
    ],
    evolutionText: `While you were away, the final crisis reached critical point.

Enemy nuclear forces on full alert.
Global markets collapsing.
Allied leaders requesting urgent consultation.

The world awaits your decision.`
  }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

interface DefconProps {
  onComplete: () => void;
  onCancel: () => void;
  onViewGallery?: () => void;
}

export const Defcon = ({ onComplete, onCancel, onViewGallery }: DefconProps) => {
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const gameState = useChatStore((state) => state.gameState);
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);

  const themeData = CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED;
  const TACTICAL_COLOR = themeData.colors.primary;
  const CARD_BG = themeData.colors.cardBg;
  const theme = {
    background: themeData.colors.background,
    card: themeData.colors.cardBg,
    accent: themeData.colors.primary,
    text: themeData.colors.text,
    subtext: themeData.colors.subtext,
    success: '#00ff00', // Green for success
    warning: '#ff3333', // Red for warnings
    fontHeader: 'Courier-Bold',
    fontBody: 'Courier'
  };

  // Screen state
  const [screen, setScreen] = useState<DefconScreen>('intro');
  const [currentDecision, setCurrentDecision] = useState<DefconCampaignState['decisions'][0] | null>(null);
  const [outcome, setOutcome] = useState<CampaignOutcome | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Initialize or load campaign state
  const getCampaignState = (): DefconCampaignState => {
    if (gameState.currentSession?.sessionData?.defconCampaign) {
      return gameState.currentSession.sessionData.defconCampaign;
    }

    // Initialize new campaign
    return {
      defconLevel: 5,
      phaseNumber: 1,
      resources: {
        military: 100,
        diplomacy: 100,
        cyber: 100
      },
      lastPhaseTimestamp: Date.now(),
      lastPhaseDate: getLocalDateString(new Date()),
      decisions: [],
      threatLevel: 'LOW',
      completed: false
    };
  };

  const [campaign, setCampaign] = useState<DefconCampaignState>(getCampaignState());

  // Update campaign state in store
  const updateCampaignState = (newState: DefconCampaignState) => {
    setCampaign(newState);
    useChatStore.setState((state) => ({
      gameState: {
        ...state.gameState,
        currentSession: {
          ...state.gameState.currentSession,
          sessionData: {
            ...state.gameState.currentSession.sessionData,
            defconCampaign: newState
          }
        }
      }
    }));
  };

  // Get current phase definition
  const currentPhase = PHASES[campaign.phaseNumber - 1];

  // Threat level calculations
  const getThreatNumeric = (level: ThreatLevel): number => {
    const map = { LOW: 10, MODERATE: 30, HIGH: 60, CRITICAL: 80, NUCLEAR: 100 };
    return map[level];
  };

  const calculateThreatLevel = (numeric: number): ThreatLevel => {
    if (numeric >= 90) return 'NUCLEAR';
    if (numeric >= 70) return 'CRITICAL';
    if (numeric >= 40) return 'HIGH';
    if (numeric >= 20) return 'MODERATE';
    return 'LOW';
  };

  // Resource management
  const applyResourceCost = (cost: ResourceCost) => {
    const newResources = {
      military: Math.max(0, Math.min(100, campaign.resources.military + cost.military)),
      diplomacy: Math.max(0, Math.min(100, campaign.resources.diplomacy + cost.diplomacy)),
      cyber: Math.max(0, Math.min(100, campaign.resources.cyber + cost.cyber))
    };

    updateCampaignState({
      ...campaign,
      resources: newResources
    });

    // Check for resource depletion failure
    if (newResources.military <= 0 && newResources.diplomacy <= 0 && newResources.cyber <= 0) {
      // Update campaign to reflect final defeat state
      updateCampaignState({
        ...campaign,
        resources: newResources,
        defconLevel: 1,
        threatLevel: 'NUCLEAR',
        completed: true,
        outcome: 'defeat'
      });
      setOutcome('defeat');
      setTimeout(() => setScreen('campaign_end'), 2000);
    }
  };

  // Check for evolution (24h+ elapsed)
  useEffect(() => {
    const checkEvolution = () => {
      if (!campaign.lastPhaseTimestamp || screen !== 'intro') return;

      const now = Date.now();
      const hoursElapsed = (now - campaign.lastPhaseTimestamp) / (1000 * 60 * 60);

      if (hoursElapsed >= 24 && campaign.phaseNumber > 1) {
        // Apply time-based consequences
        const decayedResources = {
          military: Math.max(0, campaign.resources.military - 5),
          diplomacy: Math.max(0, campaign.resources.diplomacy - 5),
          cyber: Math.max(0, campaign.resources.cyber - 3)
        };

        const newThreat = calculateThreatLevel(
          getThreatNumeric(campaign.threatLevel) + 10
        );

        updateCampaignState({
          ...campaign,
          resources: decayedResources,
          threatLevel: newThreat
        });

        setScreen('evolution');
        return;
      }

      // Normal flow - go to phase briefing
      if (campaign.phaseNumber > 1) {
        setScreen('phase_briefing');
      }
    };

    checkEvolution();
  }, []);

  // Decision handler
  const handleDecision = (optionId: DecisionType) => {
    const chosenOption = currentPhase.options.find(opt => opt.id === optionId)!;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Apply resource costs
    const newResources = {
      military: Math.max(0, Math.min(100, campaign.resources.military + chosenOption.resourceCost.military)),
      diplomacy: Math.max(0, Math.min(100, campaign.resources.diplomacy + chosenOption.resourceCost.diplomacy)),
      cyber: Math.max(0, Math.min(100, campaign.resources.cyber + chosenOption.resourceCost.cyber))
    };

    // Update DEFCON level
    const newDefconLevel = Math.max(1, Math.min(5,
      campaign.defconLevel + chosenOption.defconImpact
    )) as DefconLevel;

    // Update threat
    const newThreatNumeric = getThreatNumeric(campaign.threatLevel) + chosenOption.threatImpact;
    const newThreatLevel = calculateThreatLevel(newThreatNumeric);

    // Record decision
    const decision = {
      phase: campaign.phaseNumber,
      choice: optionId,
      consequence: chosenOption.consequenceText,
      resourceImpact: chosenOption.resourceCost
    };

    // Update campaign state
    updateCampaignState({
      ...campaign,
      defconLevel: newDefconLevel,
      threatLevel: newThreatLevel,
      resources: newResources,
      decisions: [...campaign.decisions, decision],
      lastPhaseTimestamp: Date.now(),
      lastPhaseDate: getLocalDateString(new Date())
    });

    setCurrentDecision(decision);
    setScreen('consequence');

    // Check for immediate loss conditions
    if (newDefconLevel === 1 || newThreatLevel === 'NUCLEAR') {
      setTimeout(() => {
        // Update campaign to reflect final defeat state
        updateCampaignState({
          ...campaign,
          defconLevel: 1,
          threatLevel: 'NUCLEAR',
          completed: true,
          outcome: 'defeat'
        });
        setOutcome('defeat');
        setScreen('campaign_end');
      }, 3000);
    }
  };

  // Exit modal handlers
  const handleExitWithoutSaving = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExitModal(false);
    onCancel(); // Clears sessionData and exits
  };

  const handleSaveAndExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExitModal(false);

    // Same logic as Save & Exit button
    const nextPhaseState = {
      ...campaign,
      phaseNumber: campaign.phaseNumber + 1
    };

    const completedPhases = gameState.gameProgress.defcon?.completedPhases || [];
    const newCompletedPhases = completedPhases.includes(campaign.phaseNumber)
      ? completedPhases
      : [...completedPhases, campaign.phaseNumber];

    useChatStore.setState((state) => ({
      gameState: {
        ...state.gameState,
        currentSession: {
          ...state.gameState.currentSession,
          activeGameId: null,
          sessionData: {
            ...state.gameState.currentSession.sessionData,
            defconCampaign: nextPhaseState
          }
        },
        gameProgress: {
          ...state.gameState.gameProgress,
          defcon: {
            ...state.gameState.gameProgress.defcon,
            completedPhases: newCompletedPhases,
            lastPlayedAt: Date.now()
          }
        }
      }
    }));
  };

  const handleCloseButton = () => {
    // If we're in phase 5 or campaign is complete, just exit
    if (campaign.phaseNumber === 5 || campaign.completed || screen === 'campaign_end') {
      onCancel();
      return;
    }

    // If we're in intro screen (phase 1, no decisions made yet), just exit
    if (screen === 'intro' && campaign.decisions.length === 0) {
      onCancel();
      return;
    }

    // Otherwise, show exit modal
    setShowExitModal(true);
  };

  // Phase completion
  const handlePhaseComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Mark phase as completed
    const completedPhases = gameState.gameProgress.defcon?.completedPhases || [];
    if (!completedPhases.includes(campaign.phaseNumber)) {
      useChatStore.setState((state) => ({
        gameState: {
          ...state.gameState,
          gameProgress: {
            ...state.gameState.gameProgress,
            defcon: {
              ...state.gameState.gameProgress.defcon,
              completedPhases: [...completedPhases, campaign.phaseNumber],
              lastPlayedAt: Date.now()
            }
          }
        }
      }));
    }

    // Check if final phase
    if (campaign.phaseNumber === 5) {
      // Determine outcome
      let finalOutcome: CampaignOutcome;

      const totalResources =
        campaign.resources.military +
        campaign.resources.diplomacy +
        campaign.resources.cyber;

      if (campaign.defconLevel >= 4 && totalResources >= 150) {
        finalOutcome = 'victory';
      } else if (campaign.defconLevel <= 2 || totalResources < 50) {
        finalOutcome = 'defeat';
      } else {
        finalOutcome = 'stalemate';
      }

      // Update campaign state with final outcome
      // If defeat, set DEFCON to 1 and threat to NUCLEAR
      updateCampaignState({
        ...campaign,
        defconLevel: finalOutcome === 'defeat' ? 1 : campaign.defconLevel,
        threatLevel: finalOutcome === 'defeat' ? 'NUCLEAR' : campaign.threatLevel,
        completed: true,
        outcome: finalOutcome
      });

      setOutcome(finalOutcome);
      setScreen('campaign_end');
    } else {
      // Advance to next phase
      updateCampaignState({
        ...campaign,
        phaseNumber: campaign.phaseNumber + 1
      });

      // Continue to next phase briefing
      setScreen('phase_briefing');
    }
  };

  // Render functions
  const renderIntro = () => (
    <View style={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
        <Text style={[styles.header, { color: theme.accent, fontFamily: theme.fontHeader }]}>
          // DEFCON_ESCALATION_PROTOCOL
        </Text>
        <Text style={[styles.body, { color: theme.text, fontFamily: theme.fontBody }]}>
          {`CLASSIFIED: TOP SECRET

BRIEFING:
You are authorized to manage strategic crisis response.
Five escalating phases test your decision-making under pressure.

RESOURCES:
• MILITARY: Force projection and readiness
• DIPLOMACY: International influence and negotiations
• CYBER: Intelligence and digital warfare

DEFCON LEVELS:
5 = PEACE | 1 = NUCLEAR WAR

MISSION:
Navigate each crisis without depleting all resources.
Prevent escalation to DEFCON 1.
Complete all phases to achieve strategic victory.

WARNING:
Decisions have consequences.
Time away from the game affects the situation.
Choose wisely.`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setScreen('phase_briefing');
        }}
      >
        <Text style={[styles.buttonText, { color: theme.background, fontFamily: theme.fontHeader }]}>
          BEGIN_CAMPAIGN
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderResourceBar = () => (
    <View style={styles.resourceContainer}>
      <View style={styles.resourceItem}>
        <Text style={[styles.resourceLabel, { color: theme.subtext, fontFamily: theme.fontBody }]}>MIL</Text>
        <View style={[styles.resourceBar, { backgroundColor: `${theme.accent}30` }]}>
          <View style={[styles.resourceFill, { width: `${campaign.resources.military}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.resourceValue, { color: theme.accent, fontFamily: theme.fontHeader }]}>
          {campaign.resources.military}
        </Text>
      </View>

      <View style={styles.resourceItem}>
        <Text style={[styles.resourceLabel, { color: theme.subtext, fontFamily: theme.fontBody }]}>DIP</Text>
        <View style={[styles.resourceBar, { backgroundColor: `${theme.accent}30` }]}>
          <View style={[styles.resourceFill, { width: `${campaign.resources.diplomacy}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.resourceValue, { color: theme.accent, fontFamily: theme.fontHeader }]}>
          {campaign.resources.diplomacy}
        </Text>
      </View>

      <View style={styles.resourceItem}>
        <Text style={[styles.resourceLabel, { color: theme.subtext, fontFamily: theme.fontBody }]}>CYB</Text>
        <View style={[styles.resourceBar, { backgroundColor: `${theme.accent}30` }]}>
          <View style={[styles.resourceFill, { width: `${campaign.resources.cyber}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.resourceValue, { color: theme.accent, fontFamily: theme.fontHeader }]}>
          {campaign.resources.cyber}
        </Text>
      </View>
    </View>
  );

  const renderDefconLevel = () => {
    const getDefconColor = () => {
      // Use theme accent color for safe levels (5, 4)
      // Escalate to warning colors for dangerous levels
      if (campaign.defconLevel === 5) return theme.accent;
      if (campaign.defconLevel === 4) return theme.accent;
      if (campaign.defconLevel === 3) return '#ff8800'; // Orange warning
      if (campaign.defconLevel === 2) return '#ff4400'; // Red alert
      return '#ff0000'; // Critical red
    };

    return (
      <View style={[styles.defconContainer, { borderColor: getDefconColor() }]}>
        <Text style={[styles.defconLabel, { color: theme.subtext, fontFamily: theme.fontBody }]}>
          DEFCON LEVEL
        </Text>
        <Text style={[styles.defconLevel, { color: getDefconColor(), fontFamily: theme.fontHeader }]}>
          {campaign.defconLevel}
        </Text>
        <Text style={[styles.threatLabel, { color: theme.subtext, fontFamily: theme.fontBody }]}>
          THREAT: {campaign.threatLevel}
        </Text>
      </View>
    );
  };

  const renderPhaseBriefing = () => (
    <View style={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
        <Text style={[styles.header, { color: theme.accent, fontFamily: theme.fontHeader }]}>
          // PHASE_{campaign.phaseNumber}_OF_5
        </Text>
        <Text style={[styles.subheader, { color: theme.text, fontFamily: theme.fontHeader }]}>
          {currentPhase.title}
        </Text>
        <Text style={[styles.body, { color: theme.text, fontFamily: theme.fontBody }]}>
          {currentPhase.situation}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
        <Text style={[styles.objectiveLabel, { color: theme.accent, fontFamily: theme.fontHeader }]}>
          OBJECTIVE:
        </Text>
        <Text style={[styles.body, { color: theme.text, fontFamily: theme.fontBody }]}>
          {currentPhase.objective}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setScreen('decision');
        }}
      >
        <Text style={[styles.buttonText, { color: theme.background, fontFamily: theme.fontHeader }]}>
          ASSESS_OPTIONS
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDecision = () => (
    <View style={styles.content}>
      <Text style={[styles.objectiveLabel, { color: theme.accent, fontFamily: theme.fontHeader, marginBottom: 20 }]}>
        SELECT_ACTION:
      </Text>

      {currentPhase.options.map((option) => {
        const canAfford =
          campaign.resources.military + option.resourceCost.military >= 0 &&
          campaign.resources.diplomacy + option.resourceCost.diplomacy >= 0 &&
          campaign.resources.cyber + option.resourceCost.cyber >= 0;

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              { backgroundColor: theme.card, borderColor: canAfford ? theme.accent : theme.subtext, opacity: canAfford ? 1 : 0.5 }
            ]}
            onPress={() => canAfford && handleDecision(option.id)}
            disabled={!canAfford}
          >
            <Text style={[styles.optionTitle, { color: theme.accent, fontFamily: theme.fontHeader }]}>
              {option.label}
            </Text>
            <Text style={[styles.optionDescription, { color: theme.text, fontFamily: theme.fontBody }]}>
              {option.description}
            </Text>
            <View style={styles.costContainer}>
              {option.resourceCost.military !== 0 && (
                <Text style={[styles.costText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                  MIL: {option.resourceCost.military > 0 ? '+' : ''}{option.resourceCost.military}
                </Text>
              )}
              {option.resourceCost.diplomacy !== 0 && (
                <Text style={[styles.costText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                  DIP: {option.resourceCost.diplomacy > 0 ? '+' : ''}{option.resourceCost.diplomacy}
                </Text>
              )}
              {option.resourceCost.cyber !== 0 && (
                <Text style={[styles.costText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                  CYB: {option.resourceCost.cyber > 0 ? '+' : ''}{option.resourceCost.cyber}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderConsequence = () => (
    <View style={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.accent }]}>
        <Text style={[styles.header, { color: theme.accent, fontFamily: theme.fontHeader }]}>
          // OUTCOME
        </Text>
        <Text style={[styles.body, { color: theme.text, fontFamily: theme.fontBody }]}>
          {currentDecision?.consequence}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={handlePhaseComplete}
      >
        <Text style={[styles.buttonText, { color: theme.background, fontFamily: theme.fontHeader }]}>
          {campaign.phaseNumber === 5 ? 'ASSESS_OUTCOME' : 'CONTINUE'}
        </Text>
      </TouchableOpacity>

      {/* Save & Exit option for phases 1-4 */}
      {campaign.phaseNumber < 5 && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.accent, marginTop: 12 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Advance to next phase and save to store
            const nextPhaseState = {
              ...campaign,
              phaseNumber: campaign.phaseNumber + 1
            };

            // Mark phase as completed in game progress
            const completedPhases = gameState.gameProgress.defcon?.completedPhases || [];
            const newCompletedPhases = completedPhases.includes(campaign.phaseNumber)
              ? completedPhases
              : [...completedPhases, campaign.phaseNumber];

            // Update store: save campaign progress AND close game WITHOUT calling endGame()
            useChatStore.setState((state) => ({
              gameState: {
                ...state.gameState,
                currentSession: {
                  ...state.gameState.currentSession,
                  activeGameId: null, // Close the game overlay
                  sessionData: {
                    ...state.gameState.currentSession.sessionData,
                    defconCampaign: nextPhaseState // Preserve campaign state
                  }
                },
                gameProgress: {
                  ...state.gameState.gameProgress,
                  defcon: {
                    ...state.gameState.gameProgress.defcon,
                    completedPhases: newCompletedPhases,
                    lastPlayedAt: Date.now()
                  }
                }
              }
            }));

            // Don't call onComplete() or onCancel() - they both call endGame() which clears sessionData
            // The game is now closed via activeGameId: null, but sessionData persists
          }}
        >
          <Text style={[styles.buttonText, { color: theme.accent, fontFamily: theme.fontHeader }]}>
            SAVE_&_EXIT
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEvolution = () => (
    <View style={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.warning }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="warning" size={24} color={theme.warning} style={{ marginRight: 12 }} />
          <Text style={[styles.header, { color: theme.warning, fontFamily: theme.fontHeader }]}>
            // TIME_ELAPSED_CONSEQUENCES
          </Text>
        </View>
        <Text style={[styles.body, { color: theme.text, fontFamily: theme.fontBody }]}>
          {currentPhase.evolutionText}
        </Text>
        <Text style={[styles.body, { color: theme.warning, fontFamily: theme.fontBody, marginTop: 16 }]}>
          {`RESOURCE DECAY:
• Military: -5
• Diplomacy: -5
• Cyber: -3

THREAT LEVEL: INCREASED`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setScreen('phase_briefing');
        }}
      >
        <Text style={[styles.buttonText, { color: theme.background, fontFamily: theme.fontHeader }]}>
          ASSESS_SITUATION
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCampaignEnd = () => {
    const getOutcomeDisplay = () => {
      if (outcome === 'victory') {
        return {
          title: '// STRATEGIC_VICTORY',
          message: `CAMPAIGN COMPLETED SUCCESSFULLY

Final Status:
• DEFCON Level: ${campaign.defconLevel}
• Threat Level: ${campaign.threatLevel}
• Total Resources: ${campaign.resources.military + campaign.resources.diplomacy + campaign.resources.cyber}

Through strategic decision-making and careful resource management, you navigated five escalating crises without triggering nuclear war.

Your leadership prevented global catastrophe.

ACHIEVEMENT UNLOCKED: STRATEGIST`,
          color: theme.success
        };
      } else if (outcome === 'defeat') {
        return {
          title: '// STRATEGIC_FAILURE',
          message: `CAMPAIGN ENDED IN DEFEAT

Final Status:
• DEFCON Level: 1
• Threat Level: NUCLEAR
• Total Resources: ${campaign.resources.military + campaign.resources.diplomacy + campaign.resources.cyber}

Nuclear war initiated.

The crisis escalated beyond control.

Try again with different strategies.`,
          color: theme.warning
        };
      } else {
        return {
          title: '// STALEMATE',
          message: `CAMPAIGN ENDED IN STALEMATE

Final Status:
• DEFCON Level: ${campaign.defconLevel}
• Threat Level: ${campaign.threatLevel}
• Total Resources: ${campaign.resources.military + campaign.resources.diplomacy + campaign.resources.cyber}

Neither victory nor defeat.
The crisis was contained but not resolved.

Tensions remain high.

Consider more aggressive or diplomatic strategies.`,
          color: theme.accent
        };
      }
    };

    const display = getOutcomeDisplay();

    return (
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: display.color }]}>
          <Text style={[styles.header, { color: display.color, fontFamily: theme.fontHeader }]}>
            {display.title}
          </Text>
          <Text style={[styles.body, { color: theme.text, fontFamily: theme.fontBody }]}>
            {display.message}
          </Text>
        </View>

        {/* Show DISMISS and VIEW_GALLERY buttons for victory (badge unlock) */}
        {outcome === 'victory' ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingHorizontal: 20 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: theme.accent,
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onComplete();
              }}
            >
              <Text style={{ fontFamily: theme.fontHeader, fontSize: 13, color: theme.accent, fontWeight: '600' }}>
                DISMISS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.accent,
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (onViewGallery) {
                  onViewGallery();
                }
                onComplete();
              }}
            >
              <Text style={{ fontFamily: theme.fontHeader, fontSize: 13, color: theme.background, fontWeight: '600' }}>
                VIEW_GALLERY
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onComplete();
            }}
          >
            <Text style={[styles.buttonText, { color: theme.background, fontFamily: theme.fontHeader }]}>
              EXIT
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <ClassifiedHeader
          title={`// DEFCON_${campaign.defconLevel}_PROTOCOL`}
          subtitle={`PHASE ${campaign.phaseNumber}/5 | THREAT: ${campaign.threatLevel}`}
          onClose={handleCloseButton}
          tacticalColor={TACTICAL_COLOR}
          cardBg={CARD_BG}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >

        {/* Resource Display */}
        {screen !== 'intro' && screen !== 'campaign_end' && (
          <>
            {renderResourceBar()}
            {renderDefconLevel()}
          </>
        )}

        {/* Screen Content */}
        {screen === 'intro' && renderIntro()}
        {screen === 'phase_briefing' && renderPhaseBriefing()}
        {screen === 'decision' && renderDecision()}
        {screen === 'consequence' && renderConsequence()}
        {screen === 'evolution' && renderEvolution()}
        {screen === 'campaign_end' && renderCampaignEnd()}
        </ScrollView>
      </View>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
        accessibilityViewIsModal={true}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: theme.background,
            borderWidth: 2,
            borderColor: theme.accent,
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400,
          }}>
            <Text style={{
              fontFamily: theme.fontHeader,
              fontSize: 18,
              fontWeight: '700',
              color: theme.accent,
              marginBottom: 16,
              textAlign: 'center',
            }}>
              // EXIT_CONFIRMATION
            </Text>

            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.text,
              marginBottom: 24,
              textAlign: 'center',
              lineHeight: 20,
            }}>
              {`You have made progress in this campaign.\n\nWould you like to save your progress before exiting?`}
            </Text>

            {/* Save & Exit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.accent,
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
              }}
              onPress={handleSaveAndExit}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: theme.background,
                textAlign: 'center',
              }}>
                SAVE_&_EXIT
              </Text>
            </TouchableOpacity>

            {/* Exit Without Saving Button */}
            <TouchableOpacity
              style={{
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: theme.warning,
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
              }}
              onPress={handleExitWithoutSaving}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: theme.warning,
                textAlign: 'center',
              }}>
                EXIT_WITHOUT_SAVING
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={{
                backgroundColor: 'transparent',
                padding: 12,
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowExitModal(false);
              }}
            >
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.subtext,
                textAlign: 'center',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resourceContainer: {
    marginBottom: 20,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resourceLabel: {
    width: 40,
    fontSize: 14,
    fontWeight: '700',
  },
  resourceBar: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  resourceFill: {
    height: '100%',
  },
  resourceValue: {
    width: 50,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
  },
  defconContainer: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  defconLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  defconLevel: {
    fontSize: 48,
    fontWeight: '700',
  },
  threatLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  card: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  subheader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  objectiveLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  costContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  costText: {
    fontSize: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
