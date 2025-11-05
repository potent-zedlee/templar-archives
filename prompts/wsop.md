# WSOP (World Series of Poker) - Hand History Extraction

## Platform-Specific UI Characteristics

### Visual Layout
- **Table Color**: Traditional green felt with WSOP logo
- **Branding**: Gold WSOP bracelets and tournament graphics
- **Card Display**: Large, easily readable playing cards
- **Player Boxes**: Positioned with player photos and chip counts
- **Chip Amounts**: Displayed as tournament chips
- **Pot Size**: Centered in gold/yellow text

### Player Information
- **Name Display**: Player name (sometimes with nickname in quotes)
- **WSOP Bracelets**: Number of bracelets displayed for champions
- **Stack Size**: Tournament chip count (e.g., "1,250,000")
- **Seat Position**: Numbered seats 1-9
- **Hole Cards**: Shown with hole card cameras at key moments

### Game Flow
- **ESPN/PokerGO Production**: Professional broadcast quality
- **Commentary**: Norman Chad, Lon McEachern, or other WSOP commentators
- **Hand History**: Sometimes displayed on-screen overlay
- **Player Interviews**: Feature interviews during breaks
- **Tournament Clock**: Blinds, level, time remaining shown consistently
- **Live Updates**: Twitter handles and social media graphics

## WSOP Event Types
- **Main Event**: $10,000 No-Limit Hold'em World Championship
- **High Roller**: $25K, $50K, $100K, $250K buy-ins
- **Bracelet Events**: $1K to $10K various formats
- **Poker Players Championship**: $50K mixed games
- **Tag Team Event**: Unique format with player swapping

## Typical Stakes (Tournament Blinds)
- Early Day 1: 100/100, 100/200, 200/400
- Day 2-3: 1K/2K, 2K/4K, 3K/6K
- Final Table: 50K/100K, 100K/200K, 200K/400K and higher
- BB Ante structure (ante = 1 BB)

## WSOP-Specific Notes

1. **ESPN/PokerGO Graphics**: Professional overlay with player bios
2. **Hole Card Graphics**: Clear display of pocket cards for featured players
3. **Player Bios**: Background stories and WSOP history shown
4. **Bracelet Count**: Displays number of WSOP bracelets won
5. **Prize Money**: Running total of prize pool and payouts
6. **Hand #**: Sometimes shows official hand number from floor
7. **BB Ante**: WSOP uses big blind ante (1 BB ante from BB position)

## Common Player Names (for reference)
- Phil Hellmuth (17 bracelets)
- Doyle Brunson (10 bracelets)
- Johnny Chan (10 bracelets)
- Phil Ivey (10 bracelets)
- Daniel Negreanu (6 bracelets)
- Scotty Nguyen
- Chris Moneymaker (2003 Main Event winner)
- Jamie Gold
- Joe Cada
- Ryan Riess

## Extraction Priority

Focus on **Live tournament action**:
- Extract hands from actual gameplay
- Skip player bio segments
- Skip commercial breaks
- Skip recap montages
- Skip interview segments (unless hand is shown during interview)
- Skip "hand of the day" replays unless it's a new hand

## WSOP-Specific Considerations

### BB Ante Structure
- WSOP uses **big blind ante** (BB posts 1 BB + 1 BB ante)
- Include ante in pot calculation
- Example: Blinds 100K/200K → SB posts 100K, BB posts 200K + 200K ante = 500K starting pot

### Player Nicknames
- Some players use nicknames (e.g., "Phil 'The Poker Brat' Hellmuth")
- Use the primary name shown on the screen
- If nickname is used more prominently, use that

### Chip Denomination
- Convert tournament chips to **big blinds** (BB)
- Example: 2,000,000 chips at 100K/200K blinds = 10 BB

## Example Hand Output

```json
{
  "number": "#1",
  "description": "Hellmuth raises UTG, Ivey 3-bets from CO",
  "summary": "Phil Hellmuth raises to 2.5 BB from UTG with pocket Queens. Phil Ivey 3-bets to 8 BB from cutoff. Hellmuth 4-bets to 22 BB, Ivey folds. Hellmuth shows QQ.",
  "timestamp": "08:45-10:20",
  "pot_size": 9.5,
  "board_cards": [],
  "players": [
    {
      "name": "Phil Hellmuth",
      "position": "UTG",
      "cards": ["Qh", "Qs"],
      "starting_stack": 75,
      "ending_stack": 83.5,
      "is_winner": true
    },
    {
      "name": "Phil Ivey",
      "position": "CO",
      "cards": [],
      "starting_stack": 120,
      "ending_stack": 112,
      "is_winner": false
    }
  ],
  "streets": {
    "preflop": {
      "actions": [
        {"player_name": "Phil Hellmuth", "action_type": "raise", "amount": 2.5, "sequence": 1},
        {"player_name": "Phil Ivey", "action_type": "raise", "amount": 8, "sequence": 2},
        {"player_name": "Phil Hellmuth", "action_type": "raise", "amount": 22, "sequence": 3},
        {"player_name": "Phil Ivey", "action_type": "fold", "amount": 0, "sequence": 4}
      ],
      "pot": 9.5
    },
    "flop": {"actions": [], "pot": 0},
    "turn": {"actions": [], "pot": 0},
    "river": {"actions": [], "pot": 0}
  }
}
```

---

Apply the base prompt guidelines with these WSOP-specific adaptations.
