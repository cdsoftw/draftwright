# draftwright

A Playwright-based browser automation tool that is intended to help with fantasy sports drafts.

## CLI Draft Driver

A TypeScript command-line tool to help run your fantasy football draft by dynamically updating rankings after each pick.

### Features

- Remove players from rankings by typing their name
- Partial player name matching - Type partial names to find players (e.g., "mahomes", "mccaffrey")
- Smart player verification - Confirms player selection before removal
- View top 5 overall available players with detailed rankings
- View top 5 available players by position with detailed rankings
- Automatically updates both overall and position-specific rankings

### Usage

1. Install dependencies:
   ```shell
   npm install
   ```

2. Start the draft:
   ```shell
   npm run draft
   ```

### Commands

- **Player name**: Enter any partial player name to search and remove from rankings
  - Single match: Shows player details and asks for confirmation
  - Multiple matches: Shows numbered list for selection
- **`top5`**: Show next 5 overall available players with Best/Worst/Avg rankings
- **Position commands**: Show next 5 available at position:
  - `qb5` - Quarterbacks
  - `rb5` - Running backs
  - `wr5` - Wide receivers
  - `te5` - Tight ends
  - `k5` - Kickers
  - `def5` - Defenses
- **`quit`**: Exit the draft

### Example Session

```
🏈 Fantasy Football Draft Driver 🏈
=====================================

📊 TOP 5 OVERALL AVAILABLE:
═══════════════════════════════════════════════════════════════════════════════
Rank | Tier | Player Name               | Team | Pos | Bye | Best | Worst | Avg
-----|------|---------------------------|------|-----|-----|------|-------|----
1    | 1    | Christian McCaffrey       | SF   | RB1 | 9   | 1    | 3     | 1.2
2    | 1    | Austin Ekeler             | LAC  | RB2 | 8   | 1    | 5     | 2.4
...

Enter command or player name: mccaffrey

🎯 Found player: Christian McCaffrey (SF - RB1)
Remove Christian McCaffrey? (y/n): y

🔄 Removing "Christian McCaffrey" from rankings...
✅ "Christian McCaffrey" has been removed from rankings.

📊 TOP 5 OVERALL AVAILABLE:
...

Enter command or player name: johnson

🔍 Found 3 players matching "johnson":
═══════════════════════════════════════════════════════════
# | Player Name               | Team | Pos | Tier | Avg
--|---------------------------|------|-----|------|----
1 | Calvin Johnson Jr.        | DET  | WR1 | 2    | 12.4
2 | Keaton Johnson           | TB   | WR3 | 8    | 45.2
3 | Tyler Johnson            | TB   | WR4 | 9    | 67.8
═══════════════════════════════════════════════════════════

Enter player number (1-3) or type full player name: 1
Remove Calvin Johnson Jr.? (y/n): y

Enter command or player name: qb5

🎯 TOP 5 QB AVAILABLE:
═══════════════════════════════════════════════════════════════════════════
Rank | Tier | Player Name               | Team | Bye | Best | Worst | Avg
-----|------|---------------------------|------|-----|------|-------|----
...
```

### Files Required

Make sure you have these CSV files in the `src/data` directory:
- `rankings.csv` - Overall player rankings
- `qb.csv` - Quarterback rankings
- `rb.csv` - Running back rankings
- `wr.csv` - Wide receiver rankings
- `te.csv` - Tight end rankings
- `k.csv` - Kicker rankings
- `def.csv` - Defense rankings
