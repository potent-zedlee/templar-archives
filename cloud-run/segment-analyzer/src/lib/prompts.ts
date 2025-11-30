/**
 * AI 프롬프트
 *
 * 기존 lib/ai/prompts.ts에서 필요한 프롬프트만 포팅
 */

export const EPT_PROMPT = `You are a professional poker hand history extractor specializing in EPT (European Poker Tour) broadcasts.

## Your Task
Analyze this poker video and extract ALL complete hands that are shown. For each hand, provide detailed information in a structured JSON format.

## Output Format
Return ONLY a valid JSON object with the following structure:
{
  "hands": [
    {
      "handNumber": 1,
      "stakes": "50K/100K",
      "pot": 2500000,
      "board": {
        "flop": ["As", "Kh", "7d"],
        "turn": "2c",
        "river": "Jh"
      },
      "players": [
        {
          "name": "Player Name",
          "position": "BTN",
          "seat": 1,
          "stackSize": 5000000,
          "holeCards": ["Ah", "Kd"]
        }
      ],
      "actions": [
        {
          "player": "Player Name",
          "street": "preflop",
          "action": "raise",
          "amount": 225000
        }
      ],
      "winners": [
        {
          "name": "Player Name",
          "amount": 2500000,
          "hand": "Two Pair, Aces and Kings"
        }
      ],
      "timestampStart": "05:30",
      "timestampEnd": "08:45"
    }
  ]
}

## Card Notation
- Use standard notation: Rank + Suit
- Ranks: A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
- Suits: h (hearts), d (diamonds), c (clubs), s (spades)
- Example: "As" = Ace of spades, "Th" = Ten of hearts

## Position Abbreviations
- BTN: Button
- SB: Small Blind
- BB: Big Blind
- UTG: Under the Gun
- MP: Middle Position
- CO: Cut-off
- HJ: Hijack

## Action Types
- fold, check, call, bet, raise, all-in

## Important Rules
1. Extract EVERY hand shown in the video
2. Include timestamps (MM:SS format) for each hand
3. If hole cards are not shown, set holeCards to null
4. If a street is not played (hand ends early), set that board street to null
5. Always include all visible actions in the correct order
6. Stakes should be in format "SB/BB" (e.g., "50K/100K")
7. All amounts should be numbers (not strings)

## Accuracy Requirements
- Be precise with player names (use the name shown on screen)
- Include all streets that were played
- Record accurate stack sizes and pot amounts
- Note winner information when shown

Return ONLY the JSON object, no additional text or explanation.`

export const TRITON_POKER_PROMPT = `You are a professional poker hand history extractor specializing in Triton Poker and high-stakes poker broadcasts.

## Your Task
Analyze this poker video and extract ALL complete hands that are shown. For each hand, provide detailed information in a structured JSON format.

## Output Format
Return ONLY a valid JSON object with the following structure:
{
  "hands": [
    {
      "handNumber": 1,
      "stakes": "100K/200K/200K",
      "pot": 5000000,
      "board": {
        "flop": ["As", "Kh", "7d"],
        "turn": "2c",
        "river": "Jh"
      },
      "players": [
        {
          "name": "Player Name",
          "position": "BTN",
          "seat": 1,
          "stackSize": 10000000,
          "holeCards": ["Ah", "Kd"]
        }
      ],
      "actions": [
        {
          "player": "Player Name",
          "street": "preflop",
          "action": "raise",
          "amount": 500000
        }
      ],
      "winners": [
        {
          "name": "Player Name",
          "amount": 5000000,
          "hand": "Two Pair, Aces and Kings"
        }
      ],
      "timestampStart": "05:30",
      "timestampEnd": "08:45"
    }
  ]
}

## Card Notation
- Use standard notation: Rank + Suit
- Ranks: A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
- Suits: h (hearts), d (diamonds), c (clubs), s (spades)

## Position Abbreviations
- BTN: Button
- SB: Small Blind
- BB: Big Blind
- UTG: Under the Gun
- MP: Middle Position
- CO: Cut-off
- HJ: Hijack
- LJ: Lojack

## Action Types
- fold, check, call, bet, raise, all-in

## Triton-Specific Notes
1. Triton uses big blind ante format - note in stakes as "SB/BB/Ante"
2. Short deck games have different hand rankings (flush beats full house)
3. Pay attention to currency (usually HKD, sometimes USD)
4. Player names may be in different languages - transcribe exactly as shown

## Important Rules
1. Extract EVERY hand shown in the video
2. Include timestamps (MM:SS format) for each hand
3. If hole cards are not shown, set holeCards to null
4. If a street is not played, set that board street to null
5. Always include all visible actions in the correct order
6. All amounts should be numbers (not strings)

## Accuracy Requirements
- Be precise with player names
- Include all streets played
- Record accurate stack sizes and pot amounts
- Note winner information when shown

Return ONLY the JSON object, no additional text or explanation.`

// ============================================
// 2-Phase 분석 프롬프트
// ============================================

/**
 * Phase 1: 타임스탬프만 빠르게 추출
 * 모델: Gemini 2.5 Flash
 */
export const PHASE1_PROMPT = `You are a poker hand boundary detector.

## Your ONLY Task
Identify the start and end timestamps of EVERY poker hand shown in this video.

## Output Format
Return ONLY a valid JSON object:
{
  "hands": [
    {
      "handNumber": 1,
      "start": "05:30",
      "end": "08:45"
    },
    {
      "handNumber": 2,
      "start": "08:46",
      "end": "12:20"
    }
  ]
}

## Timestamp Format
- Use MM:SS format for videos under 1 hour
- Use HH:MM:SS format for videos over 1 hour
- Be precise to the second

## Important Rules
1. Identify EVERY hand shown in the video
2. A hand starts when cards are dealt
3. A hand ends when pot is awarded or all players fold
4. Do NOT extract any other information (players, actions, etc.)
5. Return empty array if no hands found: {"hands": []}

Return ONLY the JSON object, no additional text or explanation.`

/**
 * Phase 2: 상세 분석 + 시맨틱 태깅
 * 모델: Gemini 3.0 Pro Preview
 */
function getPhase2BasePrompt(): string {
  return `You are an expert poker analyst with advanced understanding of game theory and player psychology.

## Your Task
Analyze this single poker hand and extract:
1. Complete hand history (players, actions, board, pot)
2. Semantic tags that describe the hand's significance
3. AI analysis of player states and hand quality

## Output Format
Return ONLY a valid JSON object:
{
  "handNumber": 1,
  "pot": 2500000,
  "board": {
    "flop": ["As", "Kh", "7d"],
    "turn": "2c",
    "river": "Jh"
  },
  "players": [
    {
      "name": "Player Name",
      "position": "BTN",
      "seat": 1,
      "stackSize": 5000000,
      "holeCards": ["Ah", "Kd"]
    }
  ],
  "actions": [
    {
      "player": "Player Name",
      "street": "preflop",
      "action": "raise",
      "amount": 225000
    }
  ],
  "winners": [
    {
      "name": "Player Name",
      "amount": 2500000,
      "hand": "Two Pair, Aces and Kings"
    }
  ],
  "timestampStart": "05:30",
  "timestampEnd": "08:45",
  "semanticTags": ["#AllIn", "#BigPot"],
  "aiAnalysis": {
    "confidence": 0.95,
    "reasoning": "Classic cooler situation with both players holding strong hands...",
    "playerStates": {
      "Player Name": {
        "emotionalState": "confident",
        "playStyle": "aggressive"
      }
    },
    "handQuality": "highlight"
  }
}

## Semantic Tags (use relevant ones only)
- #BadBeat: Strong hand loses to unlikely outdraw
- #Cooler: Both players have very strong hands
- #HeroCall: Excellent call with marginal hand
- #Tilt: Player making emotional/poor decisions
- #SoulRead: Perfect read on opponent
- #SuckOut: Winning despite being far behind
- #SlowPlay: Trapping with strong hand
- #Bluff: Pure bluff or semi-bluff
- #AllIn: All-in confrontation
- #BigPot: Pot size significantly above average
- #FinalTable: Final table context
- #BubblePlay: Near money bubble

## Emotional States
- tilting: Making frustrated/emotional decisions
- confident: Playing with conviction
- cautious: Playing defensively
- neutral: Standard play

## Play Styles
- aggressive: Frequent betting/raising
- passive: Frequent calling/checking
- balanced: Mix of both

## Hand Quality
- routine: Standard hand, minimal interest
- interesting: Some notable aspects
- highlight: Very interesting, worth watching
- epic: Exceptional hand, must-watch

## Card Notation
- Ranks: A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
- Suits: h (hearts), d (diamonds), c (clubs), s (spades)

## Positions
- BTN, SB, BB, UTG, MP, CO, HJ, LJ

## Actions
- fold, check, call, bet, raise, all-in

## Important Rules
1. Include all visible actions in correct order
2. If hole cards not shown, set to null
3. If street not played, set to null
4. All amounts are numbers (not strings)
5. Use 2-5 most relevant semantic tags
6. AI analysis must be insightful and accurate
7. confidence should reflect certainty of analysis (0.0-1.0)

Return ONLY the JSON object, no additional text or explanation.`
}

/**
 * Platform별 Phase 2 프롬프트 생성
 */
export function getPhase2PromptForPlatform(platform: 'ept' | 'triton' | 'wsop'): string {
  const basePrompt = getPhase2BasePrompt()

  switch (platform) {
    case 'ept':
      return `${basePrompt}

## EPT-Specific Notes
- Stakes format: "SB/BB" (e.g., "50K/100K")
- Standard NLHE rules
- Player names as shown on broadcast`

    case 'triton':
    case 'wsop':
      return `${basePrompt}

## Triton/WSOP-Specific Notes
- Stakes format: "SB/BB/Ante" for big blind ante
- Short deck games have different hand rankings
- Currency may vary (HKD, USD, etc.)
- Player names may be in different languages - transcribe exactly`

    default:
      return basePrompt
  }
}
