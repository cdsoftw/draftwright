import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { stringify } from 'csv';

const FILE_PATH = path.resolve(__dirname, 'rankings.csv');

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

// Helper function to write CSV data
async function writeCSVFile<T>(filePath: string, data: T[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const stringifier = stringify({ header: true });
        const writeStream = fs.createWriteStream(filePath);

        stringifier.pipe(writeStream);

        data.forEach((record) => stringifier.write(record));
        stringifier.end();

        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

export type Player = {
    RK: number;
    TIERS: number;
    'PLAYER NAME': string;
    TEAM: string;
    POS: string;
    'BYE WEEK': number;
    BEST: number;
    WORST: number;
    'AVG.': number;
    'STD.DEV': number;
    'ECR VS. ADP': number;
};

export type PositionPlayer = {
    RK: number;
    TIERS: number;
    'PLAYER NAME': string;
    TEAM: string;
    'BYE WEEK': number;
    BEST: number;
    WORST: number;
    'AVG.': number;
    'STD.DEV': number;
    'ECR VS. ADP': number;
};

export async function removeMatchingPlayer(player: Player): Promise<boolean> {
    try {
        console.log(
            `Attempting removal of "${player['PLAYER NAME']}" (${player.TEAM} - ${player.POS}) from rankings.csv...`
        );

        // Read and filter the overall rankings
        const allPlayers = await parseCSVFile<Player>(FILE_PATH);
        let playerFound = false;

        const filteredPlayers = allPlayers.filter((record) => {
            // Match on multiple fields to ensure exact player identification
            const isMatch =
                record['PLAYER NAME'].toLowerCase() === player['PLAYER NAME'].toLowerCase() &&
                record.TEAM === player.TEAM &&
                record.POS === player.POS;

            if (isMatch) {
                playerFound = true;
                return false; // Remove this player
            }
            return true; // Keep this player
        });

        if (playerFound) {
            // Write the filtered data back to the file
            await writeCSVFile(FILE_PATH, filteredPlayers);

            // Remove from position-specific file as well
            const cleanPosition = player.POS.toLowerCase().replace(/\d+/, ''); // remove number(s)
            const positionFilePath = path.resolve(__dirname, `${cleanPosition}.csv`);
            console.log(`Attempting removal from ${cleanPosition}.csv...`);

            if (fs.existsSync(positionFilePath)) {
                const allPositionPlayers = await parseCSVFile<PositionPlayer>(positionFilePath);

                const filteredPositionPlayers = allPositionPlayers.filter((record) => {
                    // Match on name and team for position files (no POS field in PositionPlayer)
                    return !(
                        record['PLAYER NAME'].toLowerCase() ===
                            player['PLAYER NAME'].toLowerCase() && record.TEAM === player.TEAM
                    );
                });

                await writeCSVFile(positionFilePath, filteredPositionPlayers);
            } else {
                console.log('Position file not found.');
            }
        }

        return playerFound;
    } catch (e) {
        console.warn('Removal failed!');
        console.warn(e);
        return false;
    }
}

export async function findPlayersByPartialName(partialName: string): Promise<Player[]> {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            return [];
        }

        const allPlayers = await parseCSVFile<Player>(FILE_PATH);
        const searchTerm = partialName.toLowerCase();

        return allPlayers.filter((player) =>
            player['PLAYER NAME'].toLowerCase().includes(searchTerm)
        );
    } catch (error) {
        console.error('Error searching for players:', error);
        return [];
    }
}
