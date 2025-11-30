/**
 * Phase 2 프롬프트 - 상세 추출 + 시맨틱 분석
 *
 * 모델: Gemini 3 Pro Preview
 * 목적: 단일 핸드에 대한 심층 분석
 */

export const PHASE2_PROMPT = `You are an expert poker analyst with deep understanding of game theory and player psychology.

## Task
Analyze this poker hand video clip and extract detailed information plus semantic analysis.

## Output Format
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
      "hand": "Two Pair"
    }
  ],
  "timestamp_start": "05:30",
  "timestamp_end": "08:45",

  "semantic_tags": ["#HeroCall", "#BigPot"],
  "ai_analysis": {
    "confidence": 0.92,
    "reasoning": "Player X made a hero call...",
    "player_states": {
      "player_name": {
        "emotional_state": "confident",
        "play_style": "aggressive"
      }
    },
    "hand_quality": "highlight"
  }
}

## Semantic Tags (apply all that match)
- #BadBeat: 95%+ equity on turn loses on river
- #Cooler: Premium vs premium (AA vs KK, set over set)
- #HeroCall: Successful bluff catch with marginal hand
- #Tilt: Aggressive play after recent bad beat
- #SoulRead: Accurate hand reading decision
- #SuckOut: Winning with few outs
- #SlowPlay: Check/call with strong hand
- #Bluff: Large bet with weak hand
- #AllIn: All-in situation
- #BigPot: Pot exceeds 100BB
- #FinalTable: Final table action
- #BubblePlay: Bubble situation play

## Player State Analysis
Analyze each player's:
- emotional_state: 'tilting' | 'confident' | 'cautious' | 'neutral'
- play_style: 'aggressive' | 'passive' | 'balanced'

## Hand Quality
- routine: Standard play, nothing special
- interesting: Notable decision or situation
- highlight: Exciting hand worth watching
- epic: Exceptional hand (huge pot, amazing play)

## Card/Position Notation
Cards: Two-character format (rank + suit)
- Ranks: A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
- Suits: s (spades), h (hearts), d (diamonds), c (clubs)
- Example: "As" (Ace of spades), "Kh" (King of hearts)

Positions (9-max):
- BTN (Button/Dealer)
- SB (Small Blind)
- BB (Big Blind)
- UTG (Under The Gun)
- UTG+1, UTG+2
- MP (Middle Position)
- CO (Cutoff)

Actions:
- fold, check, call, raise, bet, all-in

Streets:
- preflop, flop, turn, river

Return ONLY JSON, no explanation.`

export const getPhase2PromptForPlatform = (platform: 'ept' | 'triton' | 'wsop'): string => {
  // 플랫폼별 커스터마이징 (Triton은 ante 형식 등)
  const platformNotes = {
    ept: 'EPT uses standard European Poker Tour format.',
    triton: 'Triton uses big blind ante format (SB/BB/Ante). May use HKD currency.',
    wsop: 'WSOP World Series of Poker standard format.'
  }

  return PHASE2_PROMPT + `\n\n## Platform Notes\n${platformNotes[platform]}`
}
