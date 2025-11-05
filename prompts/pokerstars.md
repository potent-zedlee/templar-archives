# PokerStars (EPT, APPT, UKIPT, etc.) - Hand History Extraction

## Platform-Specific UI Characteristics

### Visual Layout
- **Table Color**: Dark blue/green felt with PokerStars branding
- **EPT Logo**: European Poker Tour branding prominently displayed
- **Card Display**: Standard playing card graphics with clear rank/suit
- **Player Boxes**: Positioned around table with country flags
- **Chip Amounts**: Displayed in tournament chips (T$ notation)
- **Pot Size**: Centered on table with yellow/white text

### Player Information
- **Name Display**: Player name + country flag
- **Stack Size**: Tournament chips displayed (e.g., "125,000")
- **Position**: Dealer button clearly marked
- **Hole Cards**: Shown at showdown or when player goes all-in
- **Player Stats**: Sometimes shows VPIP/PFR statistics overlay

### Game Flow
- **Dealer Voice**: Professional dealer announces actions
- **Tournament Info Bar**: Top of screen shows level, blinds, antes, prize pool
- **Action Buttons**: Visual overlays for fold/check/call/raise
- **Time Bank**: 30-second shot clock with visual countdown
- **All-in Graphics**: Special graphics package with equity calculations

## Common Tournament Series
- **EPT**: European Poker Tour (Barcelona, Monte Carlo, Prague, etc.)
- **APPT**: Asia Pacific Poker Tour (Manila, Macau, Sydney, etc.)
- **UKIPT**: UK & Ireland Poker Tour (London, Dublin, etc.)
- **PSPC**: PokerStars Players Championship (25K buy-in)
- **EPT Main Event**: €5,300 buy-in flagship event

## Typical Stakes (Tournament Blinds)
- Early levels: 100/200, 200/400, 300/600
- Mid levels: 1K/2K, 2K/4K, 3K/6K
- Late levels: 10K/20K, 25K/50K, 50K/100K
- Antes typically 10-15% of big blind

## PokerStars-Specific Notes

1. **Graphics Package**: Professional broadcast overlay with player stats
2. **Hole Card Camera**: Often shows hole cards of featured players
3. **Commentary**: English commentary with expert analysis
4. **Hand History Display**: Sometimes shows hand history text on screen
5. **Tournament Structure**: Level, blinds, antes displayed consistently
6. **Break Timer**: Countdown to next break shown on screen

## Common Player Names (for reference)
- Daniel Negreanu
- Liv Boeree
- Igor Kurganov
- Steve O'Dwyer
- Ole Schemion
- Dominik Nitsche
- Adrian Mateos
- Ramon Colillas
- Julien Martini
- Talal Shakerchi

## Extraction Priority

Focus on **Main Event gameplay**:
- Extract hands from live final table action
- Skip commentary segments without gameplay
- Skip trophy ceremony and interviews
- Skip "Hand of the Day" replay segments
- Skip commercial breaks

## PokerStars Notation

- **Chips**: Use big blinds (BB), not tournament chips
  - Example: If blinds are 10K/20K and stack is 400K, that's 20 BB
- **Antes**: Include ante size in pot calculation
- **All-in**: Mark with action_type "all-in"

## Example Hand Output

```json
{
  "number": "#1",
  "description": "Negreanu raises BTN, Kurganov 3-bets from BB",
  "summary": "Daniel Negreanu raises to 2.5 BB from the button, Igor Kurganov 3-bets to 9 BB from the big blind. Negreanu calls. Flop: Ks Qh 7c. Kurganov continuation bets 12 BB, Negreanu folds.",
  "timestamp": "12:15-14:30",
  "pot_size": 21.5,
  "board_cards": ["Ks", "Qh", "7c"],
  "players": [
    {
      "name": "Daniel Negreanu",
      "position": "BTN",
      "cards": [],
      "starting_stack": 85,
      "ending_stack": 76,
      "is_winner": false
    },
    {
      "name": "Igor Kurganov",
      "position": "BB",
      "cards": [],
      "starting_stack": 120,
      "ending_stack": 129,
      "is_winner": true
    }
  ],
  "streets": {
    "preflop": {
      "actions": [
        {"player_name": "Daniel Negreanu", "action_type": "raise", "amount": 2.5, "sequence": 1},
        {"player_name": "Igor Kurganov", "action_type": "raise", "amount": 9, "sequence": 2},
        {"player_name": "Daniel Negreanu", "action_type": "call", "amount": 9, "sequence": 3}
      ],
      "pot": 19.5
    },
    "flop": {
      "actions": [
        {"player_name": "Igor Kurganov", "action_type": "bet", "amount": 12, "sequence": 1},
        {"player_name": "Daniel Negreanu", "action_type": "fold", "amount": 0, "sequence": 2}
      ],
      "pot": 21.5
    },
    "turn": {"actions": [], "pot": 0},
    "river": {"actions": [], "pot": 0}
  }
}
```

---

Apply the base prompt guidelines with these PokerStars-specific adaptations.
