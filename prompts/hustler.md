# Hustler Casino Live - Hand History Extraction

## Platform-Specific UI Characteristics

### Visual Layout
- **Table Color**: Black felt with Hustler Casino Live branding
- **Modern Aesthetic**: Sleek, dark theme with neon accents
- **Card Display**: High-quality RFID card readers showing all hole cards
- **Player Boxes**: Name + stack displayed in modern UI boxes
- **Chip Amounts**: Real cash amounts (e.g., "$50,000")
- **Pot Size**: Centered in white/cyan text

### Player Information
- **Name Display**: Player name or nickname (sometimes anonymous as "Player 1")
- **Stack Size**: Displayed in USD ($)
- **All Hole Cards Visible**: RFID technology shows all players' hole cards to viewers
- **Social Media**: Twitter/Instagram handles sometimes displayed
- **Celebrity Players**: Often features poker pros, streamers, and businesspeople

### Game Flow
- **Live Stream**: Real-time cash game, not tournament
- **Commentary**: Ryan Feldman (host) + rotating commentators
- **All-In Graphics**: Dramatic countdown graphics for all-ins
- **Graphics Overlays**: Modern, minimalist design
- **Hand Replays**: Sometimes shows instant replay of big pots
- **Chat Integration**: Twitch/YouTube chat may be visible on stream

## Game Format
- **Cash Game**: No-Limit Texas Hold'em (not tournament)
- **Stakes**: Typically $25/$50, $50/$100, $100/$200 and higher
- **Straddles**: Frequent UTG and button straddles
- **Bomb Pots**: Special all-call preflop hands (skip these or mark clearly)
- **Run It Twice**: Option to run board twice in all-ins

## Typical Stakes
- Small game: $25/$50 blinds
- Medium game: $50/$100 blinds
- Big game: $100/$200 or $100/$200/$400 (with $400 straddle)
- Stacks typically $20K to $500K+ USD

## Hustler-Specific Notes

1. **All Hole Cards Shown**: Unlike most poker, ALL players' hole cards are visible to viewers
2. **Cash Amounts**: All numbers are in USD, not tournament chips or BB
3. **Straddles**: Very common (especially button straddle)
4. **Anonymous Players**: Some players use "Handsome" + seat number instead of real names
5. **Run It Twice**: When players agree to run it twice, extract as separate outcomes
6. **Bomb Pots**: Mark clearly in description (e.g., "Bomb Pot - $5K each")
7. **Time Bank**: Players have time banks for tough decisions
8. **Dealer Voice**: Dealers announce actions clearly

## Common Player Names (for reference)
- Garrett Adelstein (reg)
- Andy Stacks
- Wesley Fei
- Mr. Beast (Jimmy Donaldson)
- Alexandra Botez
- Eric Persson
- Nik Airball
- Mariano
- Art Papazyan
- Rampage Poker (Ethan Yau)

## Extraction Priority

Focus on **Cash game action**:
- Extract hands from actual gameplay
- Skip host segments and advertisements
- Skip player interviews (unless showing a hand)
- Skip graphics-only segments
- Mark bomb pots clearly in description
- If run it twice, can extract as one hand with final result

## Hustler-Specific Considerations

### Converting to Big Blinds
- **Stakes $100/$200**: 1 BB = $200
- Example: Player bets $1,000 = 5 BB
- Example: Pot is $15,000 = 75 BB
- **Always convert USD amounts to BB** for consistency

### Straddles
- UTG straddle = 2 BB (optional)
- Button straddle = 2 BB or more (optional)
- Include straddles in pot calculation and action sequence
- Mark straddler as "UTG (straddle)" or "BTN (straddle)" in position

### Bomb Pots
- All players post set amount preflop (e.g., $5K each)
- Flop dealt immediately (no preflop action)
- Mark in description: "Bomb Pot - $5K each ($50K pot)"
- Leave preflop actions empty

### Run It Twice
- If players run it twice in all-in, record the **final net result**
- In description, note: "Run it twice - [outcome]"
- Divide pot accordingly if boards split

### Anonymous Players
- If player uses "Handsome Jack" or seat number, use that name
- If name changes mid-session, use most recent name shown

## Example Hand Output (Normal Hand)

```json
{
  "number": "#1",
  "description": "Garrett opens CO, Andy 3-bets BTN, Garrett calls",
  "summary": "Garrett Adelstein opens to $600 (3 BB) from CO with Ac Kh. Andy Stacks 3-bets to $2,000 (10 BB) from button with Qd Qc. Garrett calls. Flop: Ah 7s 2d. Garrett checks, Andy bets $3,000 (15 BB), Garrett raises to $9,000 (45 BB), Andy folds. Garrett wins $11,500 pot (57.5 BB).",
  "timestamp": "15:20-17:45",
  "pot_size": 57.5,
  "board_cards": ["Ah", "7s", "2d"],
  "players": [
    {
      "name": "Garrett Adelstein",
      "position": "CO",
      "cards": ["Ac", "Kh"],
      "starting_stack": 1000,
      "ending_stack": 1057.5,
      "is_winner": true
    },
    {
      "name": "Andy Stacks",
      "position": "BTN",
      "cards": ["Qd", "Qc"],
      "starting_stack": 800,
      "ending_stack": 788,
      "is_winner": false
    }
  ],
  "streets": {
    "preflop": {
      "actions": [
        {"player_name": "Garrett Adelstein", "action_type": "raise", "amount": 3, "sequence": 1},
        {"player_name": "Andy Stacks", "action_type": "raise", "amount": 10, "sequence": 2},
        {"player_name": "Garrett Adelstein", "action_type": "call", "amount": 10, "sequence": 3}
      ],
      "pot": 21.5
    },
    "flop": {
      "actions": [
        {"player_name": "Garrett Adelstein", "action_type": "check", "amount": 0, "sequence": 1},
        {"player_name": "Andy Stacks", "action_type": "bet", "amount": 15, "sequence": 2},
        {"player_name": "Garrett Adelstein", "action_type": "raise", "amount": 45, "sequence": 3},
        {"player_name": "Andy Stacks", "action_type": "fold", "amount": 0, "sequence": 4}
      ],
      "pot": 57.5
    },
    "turn": {"actions": [], "pot": 0},
    "river": {"actions": [], "pot": 0}
  }
}
```

## Example Hand Output (Bomb Pot)

```json
{
  "number": "#2",
  "description": "Bomb Pot - $5K each ($40K pot preflop)",
  "summary": "8-handed bomb pot, all players post $5K each. Flop: Kd Qd Jd. Wesley checks, Garrett bets $15K (75 BB), all fold. Garrett wins $40K pot (200 BB).",
  "timestamp": "22:30-24:15",
  "pot_size": 200,
  "board_cards": ["Kd", "Qd", "Jd"],
  "players": [...],
  "streets": {
    "preflop": {
      "actions": [],
      "pot": 200
    },
    "flop": {
      "actions": [
        {"player_name": "Wesley Fei", "action_type": "check", "amount": 0, "sequence": 1},
        {"player_name": "Garrett Adelstein", "action_type": "bet", "amount": 75, "sequence": 2},
        ...
      ],
      "pot": 200
    },
    "turn": {"actions": [], "pot": 0},
    "river": {"actions": [], "pot": 0}
  }
}
```

---

Apply the base prompt guidelines with these Hustler Casino Live-specific adaptations.
