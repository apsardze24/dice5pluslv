export const GAME_RULES = `
# Dice Wars - Complete Rulebook

## 1. Objective
The primary goal is to achieve total domination by conquering every territory on the map. The last player (or alliance) remaining wins the war.

## 2. Game Setup
- **Players:** The game can be played with 2 to 8 players, which can be a mix of humans and AI opponents.
- **Map:** You can play on a randomly generated map or a custom-designed map.
  - **Map Size:** Determines the number of territories (cells) on the board.
  - **Territory Layout (Classic Mode):** The 'compactness' slider controls how clustered or scattered each player's starting territories are.
- **Game Modes:**
  - **Classic:** Players start with an equal share of territories, distributed across the map.
  - **Conquest:** All players start with a single, powerful territory. The rest of the map is controlled by neutral 'Barbarian' forces that do not receive reinforcements but will attack aggressively.
- **Turn Order Bonus:** To balance the advantage of going first, players who start later receive bonus dice. The bonus amount depends on the map size and the player's turn order.

  1.  A **Base Bonus** value is determined by the map size:
      -   Maps with < 100 cells: **1 die**
      -   Maps with 100-199 cells: **2 dice**
      -   Maps with 200-299 cells: **3 dice**
      -   Maps with 300-400 cells: **4 dice**

  2.  The total bonus for each player is calculated as: \`(Turn Position - 1) * Base Bonus\`.
      -   The 1st player (who starts) gets no bonus.
      -   The 2nd player gets \`1 * Base Bonus\` dice.
      -   The 3rd player gets \`2 * Base Bonus\` dice.
      -   ...and so on.

  **Example (Large Map):** On a map with 350 cells, the Base Bonus is 4. The second player gets 4 extra dice (1 * 4), the third gets 8 (2 * 4), the fourth gets 12 (3 * 4), etc. These dice are added to their territories at the start of the game.

## 3. The Turn
Each player takes their turn in a cycle. A player's turn consists of two phases:
1.  **Attack Phase:** The player may initiate as many attacks as they wish, as long as they have valid territories to attack from.
2.  **Reinforcement Phase:** After choosing to end their turn, the player receives bonus dice which are automatically distributed.

## 4. Attack Phase
- **Declaring an Attack:** To attack, select one of your territories that contains at least 2 dice. Then, click on an adjacent enemy territory.
- **Rolling the Dice:** The attacker rolls a number of dice equal to the dice on their attacking territory. The defender rolls a number of dice equal to the dice on their defending territory.
- **Determining the Winner:** The player who rolls the higher total sum wins the battle.
  - **In case of a tie, the defender wins.**
- **Outcome of Battle:**
  - **If the Attacker Wins:** The attacker captures the defender's territory. All but one of the attacking dice are moved into the newly captured territory. The original attacking territory is left with a single die.
  - **If the Defender Wins:** The attacker loses all but one of their dice from the attacking territory. The defender's territory is unaffected.

## 5. Reinforcement Phase
- **Ending Your Turn:** When you are finished attacking (or choose not to attack), click the "End Turn" button.
- **Calculating Reinforcements:** You receive a number of new dice equal to the size of your single largest group of connected territories. For example, if your largest contiguous block of land consists of 7 territories, you will receive 7 new dice.
- **Distributing Dice:** These new dice are automatically and randomly distributed across all of your territories, one by one.
  - A single territory can hold a maximum of 8 dice. If a randomly chosen territory is already full, the die will be placed elsewhere.
  - **Reserve Dice:** If all of a player's territories are full, any remaining reinforcement dice are placed in a 'reserve'. These are added to the next turn's reinforcement count. Your current reserve count is displayed with a 📦 icon.

## 6. Advanced Rules & Features
- **Alliances:**
  - In the game settings, players can be assigned to "Alliance A" or "Alliance B". Players in the same alliance are considered allies.
  - AI players will be extremely reluctant to attack their allies.
  - An AI will only attack an ally if:
    1.  It is in direct retaliation for a recent attack from that ally.
    2.  The attack is the only possible way to connect two of its own large territories.
  - **Unreliable Allies:** If a player is a member of both Alliance A and B, and those two alliances are hostile, that player is considered an 'unreliable ally' by the AI. An AI is more likely to attack an unreliable ally than a loyal one if an attack on an ally is deemed necessary.
- **Corruption (Optional Rule):**
  - If enabled, any reinforcement die placed on a territory that is NOT part of your largest connected region has a 50% chance of being lost forever. This rule encourages maintaining a single, large empire.
- **AI Personalities:** AI players have hidden personalities ('aggressive', 'normal', 'kind') that influence their strategic decisions, such as who they are more likely to target.
- **Surrender:** If a player's position becomes hopeless (significantly weaker than the strongest opponent), they may be prompted to surrender. AI players will automatically surrender under these conditions to speed up the end-game.

## 7. Winning the Game
- **Classic Mode:** A player wins when they are the only one left with territories on the map.
- **Conquest Mode:** The Barbarian player does not count towards victory conditions. The last non-Barbarian player remaining on the map wins.

Good luck, commander!
`