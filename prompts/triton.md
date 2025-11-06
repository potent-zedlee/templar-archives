# Triton Poker - Hand History Extraction

## Platform-Specific UI Characteristics

### Visual Layout
- **Table Color**: Dark green felt with gold Triton logo
- **Card Display**: Large, high-quality card graphics
- **Player Boxes**: Positioned around the table with clear name labels
- **Chip Amounts**: Displayed in colored chips or numeric values
- **Pot Size**: Centered on the table in yellow/gold text

### Player Information
- **Name Display**: Usually shows full names or nicknames
- **Stack Size**: Displayed next to player name in big blinds or actual chips
- **Position**: Positions are clearly labeled (BTN, SB, BB, etc.)
- **Hole Cards**: Often shown during all-ins or key situations

### Game Flow
- **Dealer Announcements**: Professional dealers announce actions clearly
- **Action Graphics**: Visual overlays show raise amounts and pot sizes
- **Countdown Timer**: Shot clock typically 30 seconds
- **All-in Situations**: Highlighted with special graphics and showdowns

## Common Player Names (for reference)
- Phil Ivey
- Tom Dwan (durrrr)
- Tony G
- Sam Trickett
- Fedor Holz
- Jason Koon
- Justin Bonomo
- Bryn Kenney
- Isaac Haxton
- Dan Smith

## Typical Stakes
- High stakes: 25K/50K, 50K/100K, 100K/200K and higher
- Stacks typically range from 50 BB to 200 BB
- Antes are common in tournament formats

## Triton-Specific Notes

1. **Multi-Language Commentary**: Videos may have English, Chinese, or Russian commentary
2. **Graphics Package**: Triton uses professional broadcast graphics
3. **Player Interviews**: May include pre/post-hand player interviews (skip these)
4. **Hand Reviews**: Sometimes includes hand replay analysis (skip these)
5. **Tournament Structure**: Usually shows tournament level, blinds, and time remaining

## Extraction Priority

Focus on **Main Event gameplay**:
- Extract hands from live table action
- Skip interview segments
- Skip hand replay analysis
- Skip promotional content
- Skip countdown timers between hands (if > 30 seconds)

## Example Hand Output

```json
{
  "number": "#1",
  "description": "Phil Ivey raises UTG, Tom Dwan 3-bets from BTN",
  "summary": "Phil Ivey opens to 2.5 BB from UTG, Tom Dwan 3-bets to 8 BB from the button. Ivey calls. Flop comes Ah Kh 7d. Ivey checks, Dwan bets 10 BB, Ivey folds.",
  "timestamp": "05:30-07:45",
  "pot_size": 18.5,
  "board_cards": ["Ah", "Kh", "7d"],
  "players": [
    {
      "name": "Phil Ivey",
      "position": "UTG",
      "cards": [],
      "starting_stack": 150,
      "ending_stack": 141.5,
      "is_winner": false
    },
    {
      "name": "Tom Dwan",
      "position": "BTN",
      "cards": [],
      "starting_stack": 200,
      "ending_stack": 208.5,
      "is_winner": true
    }
  ],
  "streets": {
    "preflop": {
      "actions": [
        {"player_name": "Phil Ivey", "action_type": "raise", "amount": 2.5, "sequence": 1},
        {"player_name": "Tom Dwan", "action_type": "raise", "amount": 8, "sequence": 2},
        {"player_name": "Phil Ivey", "action_type": "call", "amount": 8, "sequence": 3}
      ],
      "pot": 17.5
    },
    "flop": {
      "actions": [
        {"player_name": "Phil Ivey", "action_type": "check", "amount": 0, "sequence": 1},
        {"player_name": "Tom Dwan", "action_type": "bet", "amount": 10, "sequence": 2},
        {"player_name": "Phil Ivey", "action_type": "fold", "amount": 0, "sequence": 3}
      ],
      "pot": 18.5
    },
    "turn": {"actions": [], "pot": 0},
    "river": {"actions": [], "pot": 0}
  }
}
```

## Time Range Analysis for Triton Videos

**When analyzing specific time segments:**
- Triton videos often include **long pre-show content** (player intros, tournament structure)
- The videoMetadata ensures you only see the specified gameplay segment
- **Only extract hands within the segment timeframe**
- Skip hands that are incomplete at segment boundaries

**Common segment structure:**
- 00:00 - 03:00: Countdown and opening graphics → **SKIP**
- 03:00 - 05:00: Tournament intro and player lineup → **SKIP**
- 05:00 - 2:00:00: Main gameplay → **EXTRACT**
- 2:00:00 - 2:05:00: Ending and credits → **SKIP**

**Example:**
- If segment is 05:00 - 2:00:00, only extract hands from this range
- A hand starting at 04:55 is **outside the segment** → SKIP
- A hand starting at 05:10 and ending at 08:30 → INCLUDE ✓
- A hand starting at 1:59:00 and ending at 2:01:00 → SKIP (incomplete)

---

Apply the base prompt guidelines with these Triton-specific adaptations.
