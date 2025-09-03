import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import {
    Player,
    PositionPlayer,
    removeMatchingPlayer,
    findPlayersByPartialName,
} from './data/rankings-csv';

const FILE_PATH = path.resolve(__dirname, './data/rankings.csv');

// Helper function to parse CSV with csv-parser
async function parseCSVFile<T>(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const results: T[] = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data: T) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

enum Position {
    QB = 'QB',
    RB = 'RB',
    WR = 'WR',
    TE = 'TE',
    K = 'K',
    DST = 'DST',
}

class CliDraftDriver {
    private rl: readline.Interface;
    private currentPick: number = 1;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    async start() {
        console.log('🏈 Fantasy Football Draft Driver 🏈');
        console.log('=====================================');
        console.log('Commands:');
        console.log('  - Enter player name to remove from rankings');
        console.log('  - "top5" - Show next 5 overall players');
        console.log('  - "qb5", "rb5", "wr5", "te5", "k5", "def5" - Show next 5 at position');
        console.log('  - "quit" - Exit the draft');
        console.log('=====================================\n');

        // Show initial top 5 overall
        await this.showTop5Overall();

        this.promptUser();
    }

    private promptUser() {
        this.rl.question(
            `\n📋 Pick #${this.currentPick} - Enter command or player name: `,
            async (input) => {
                const command = input.trim().toLowerCase();

                if (command === 'quit' || command === 'exit') {
                    console.log('Draft complete! Good luck with your season! 🏆');
                    this.rl.close();
                    return;
                }

                if (command === 'top5') {
                    await this.showTop5Overall();
                } else if (command.endsWith('5')) {
                    if (command.length < 2 || command.length > 4) {
                        console.log("Invalid position command. Please use 'pos5' format.");
                        this.promptUser();
                        return;
                    }

                    const position = command.slice(0, -1);
                    if (position.toUpperCase() in Position) {
                        await this.showTop5Position(position);
                    } else {
                        console.log("Invalid position command. Please use 'pos5' format.");
                    }
                } else {
                    // Treat as player name to remove
                    await this.removePlayer(input.trim());
                }

                this.promptUser();
            }
        );
    }

    private async askForConfirmation(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.rl.question(message, (answer) => {
                const response = answer.trim().toLowerCase();
                resolve(response === 'y' || response === 'yes');
            });
        });
    }

    private async removePlayer(playerName: string) {
        if (!playerName) {
            console.log('Please enter a valid player name.');
            return;
        }

        // Find players that match the partial name
        const matchingPlayers = await findPlayersByPartialName(playerName);

        if (matchingPlayers.length === 0) {
            console.log(`❌ No players found matching "${playerName}"`);
            return;
        }

        if (matchingPlayers.length === 1) {
            // Single match - show player and ask for confirmation
            const player = matchingPlayers[0];
            console.log(
                `\n🎯 Found player: ${player['PLAYER NAME']} (${player.TEAM} - ${player.POS})`
            );

            const confirmed = await this.askForConfirmation(
                `Remove ${player['PLAYER NAME']}? (y/n): `
            );

            if (confirmed) {
                console.log(`\n🔄 Removing "${player['PLAYER NAME']}" from rankings...`);
                const success = await removeMatchingPlayer(player);

                if (success) {
                    console.log(`✅ "${player['PLAYER NAME']}" has been removed from rankings.`);
                    this.currentPick++;
                    await this.showTop5Overall();
                } else {
                    console.log(`❌ Failed to remove "${player['PLAYER NAME']}".`);
                }
            } else {
                console.log('❌ Player removal cancelled.');
            }
        } else {
            // Multiple matches - show list and let user choose
            console.log(`\n🔍 Found ${matchingPlayers.length} players matching "${playerName}":`);
            console.log('═════════════════════════════════════════════════════════════');
            console.log(' # | Rank | Player Name               | Team |  Pos  | Avg');
            console.log('---|------|---------------------------|------|-------|-------');

            matchingPlayers.slice(0, 10).forEach((player, index) => {
                const num = (index + 1).toString().padEnd(2);
                const rank = player.RK.toString().padEnd(4);
                const name = player['PLAYER NAME'].padEnd(25);
                const team = player.TEAM.padEnd(4);
                const pos = player.POS.padEnd(5);
                const avg = player['AVG.'];

                console.log(`${num} | ${rank} | ${name} | ${team} | ${pos} | ${avg}`);
            });

            if (matchingPlayers.length > 10) {
                console.log(`... and ${matchingPlayers.length - 10} more players`);
            }
            console.log('═════════════════════════════════════════════════════════════');

            // Ask user to select by number or type full name
            const selection = await new Promise<string>((resolve) => {
                this.rl.question('Enter player number (1-10) or type full player name: ', resolve);
            });

            const selectionTrimmed = selection.trim();
            const playerIndex = parseInt(selectionTrimmed) - 1;

            let selectedPlayer: Player | undefined;

            if (
                !isNaN(playerIndex) &&
                playerIndex >= 0 &&
                playerIndex < Math.min(matchingPlayers.length, 10)
            ) {
                // User selected by number
                selectedPlayer = matchingPlayers[playerIndex];
            } else {
                // User typed full name - find exact match
                selectedPlayer = matchingPlayers.find(
                    (p) => p['PLAYER NAME'].toLowerCase() === selectionTrimmed.toLowerCase()
                );
            }

            if (selectedPlayer) {
                const confirmed = await this.askForConfirmation(
                    `Remove ${selectedPlayer['PLAYER NAME']}? (y/n): `
                );

                if (confirmed) {
                    console.log(
                        `\n🔄 Removing "${selectedPlayer['PLAYER NAME']}" from rankings...`
                    );
                    const success = await removeMatchingPlayer(selectedPlayer);

                    if (success) {
                        console.log(
                            `✅ "${selectedPlayer['PLAYER NAME']}" has been removed from rankings.`
                        );
                        this.currentPick++;
                        await this.showTop5Overall();
                    } else {
                        console.log(`❌ Failed to remove "${selectedPlayer['PLAYER NAME']}".`);
                    }
                } else {
                    console.log('❌ Player removal cancelled.');
                }
            } else {
                console.log('❌ Invalid selection. Player removal cancelled.');
            }
        }
    }

    private async showTop5Overall(): Promise<void> {
        try {
            if (!fs.existsSync(FILE_PATH)) {
                console.log('❌ Rankings file not found.');
                return;
            }

            const players = await parseCSVFile<Player>(FILE_PATH);

            console.log('\n📊 TOP 5 OVERALL AVAILABLE:');
            console.log(
                '══════════════════════════════════════════════════════════════════════════════════'
            );
            console.log(
                'Rank | Tier | Player Name               | Team |  Pos  | Bye | Best | Worst | Avg'
            );
            console.log(
                '-----|------|---------------------------|------|-------|-----|------|-------|-----'
            );

            const top5 = players.slice(0, 5);
            top5.forEach((player, index) => {
                const rank = player.RK.toString().padEnd(4);
                const tier = player.TIERS.toString().padEnd(4);
                const name = player['PLAYER NAME'].padEnd(25);
                const team = player.TEAM.padEnd(4);
                const pos = player.POS.padEnd(5);
                const bye = player['BYE WEEK'].toString().padEnd(3);
                const best = player.BEST.toString().padEnd(4);
                const worst = player.WORST.toString().padEnd(5);
                const avg = player['AVG.'].toString();

                console.log(
                    `${rank} | ${tier} | ${name} | ${team} | ${pos} | ${bye} | ${best} | ${worst} | ${avg}`
                );
            });
            console.log(
                '══════════════════════════════════════════════════════════════════════════════════'
            );
        } catch (error) {
            console.error('Error reading overall rankings:', error);
        }
    }

    private async showTop5Position(position: string): Promise<void> {
        try {
            const positionFilePath = path.resolve(__dirname, `./data/${position}.csv`);

            if (!fs.existsSync(positionFilePath)) {
                console.log(`❌ Position file "${position}.csv" not found.`);
                return;
            }

            const players = await parseCSVFile<PositionPlayer>(positionFilePath);

            console.log(`\n🎯 TOP 5 ${position.toUpperCase()} AVAILABLE:`);
            console.log(
                '═══════════════════════════════════════════════════════════════════════════'
            );
            console.log(
                'Rank | Tier | Player Name               | Team | Bye | Best | Worst | Avg'
            );
            console.log(
                '-----|------|---------------------------|------|-----|------|-------|-----'
            );

            const top5 = players.slice(0, 5);
            top5.forEach((player, index) => {
                const rank = player.RK.toString().padEnd(4);
                const tier = player.TIERS.toString().padEnd(4);
                const name = player['PLAYER NAME'].padEnd(25);
                const team = player.TEAM.padEnd(4);
                const bye = player['BYE WEEK'].toString().padEnd(3);
                const best = player.BEST.toString().padEnd(4);
                const worst = player.WORST.toString().padEnd(5);
                const avg = player['AVG.'].toString();

                console.log(
                    `${rank} | ${tier} | ${name} | ${team} | ${bye} | ${best} | ${worst} | ${avg}`
                );
            });
            console.log(
                '═══════════════════════════════════════════════════════════════════════════'
            );
        } catch (error) {
            console.error(`Error reading ${position} rankings:`, error);
        }
    }
}

// Start the draft driver
const driver = new CliDraftDriver();
driver.start().catch(console.error);
