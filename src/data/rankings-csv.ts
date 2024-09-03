import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'node:stream/promises';
import { parse, stringify } from 'csv';

const FILE_PATH = path.resolve(__dirname, 'rankings.csv');
const HEADERS = ['RK', 'TIER', 'PLAYER NAME', 'TEAM', 'POS', 'BYE WEEK', 'BEST', 'WORST', 'AVG.'];
const POS_HEADERS = ['RK', 'TIER', 'PLAYER NAME', 'TEAM', 'BYE WEEK', 'BEST', 'WORST', 'AVG.'];

type Player = {
    RK: string;
    TIER: string;
    'PLAYER NAME': string;
    TEAM: string;
    POS: string;
    'BYE WEEK': string;
    BEST: string;
    WORST: string;
    'AVG.': string;
};

type PositionPlayer = {
    RK: string;
    TIER: string;
    'PLAYER NAME': string;
    TEAM: string;
    'BYE WEEK': string;
    BEST: string;
    WORST: string;
    'AVG.': string;
};

export async function removeMatchingPlayer(name: string) {
    try {
        console.log('Attempting removal from rankings.csv...');

        const overallRankingsContent = fs.readFileSync(FILE_PATH);
        let position = '';

        await finished(
            parse(overallRankingsContent, {
                delimiter: ',',
                columns: HEADERS,
                fromLine: 2,
                on_record: (record: Player) => {
                    if (record['PLAYER NAME'].toLowerCase().includes(name.toLowerCase())) {
                        if (position) {
                            console.log(`Duplicate match for name: ${name}, ignoring...`);
                            return record;
                        }

                        position = record.POS;
                        return null;
                    }

                    return record;
                },
            })
                .pipe(stringify({ header: true }))
                .pipe(fs.createWriteStream(FILE_PATH))
        );

        if (position) {
            // match was found, and it has a position

            position = position.toLowerCase().replace(/\d+/, ''); // remove number(s)
            const positionFilePath = path.resolve(__dirname, `${position}.csv`);
            console.log(`Attempting removal from ${position}.csv...`);

            if (fs.existsSync(positionFilePath)) {
                const positionRankingsContent = fs.readFileSync(positionFilePath);

                await finished(
                    parse(positionRankingsContent, {
                        delimiter: ',',
                        columns: POS_HEADERS,
                        fromLine: 2,
                        on_record: (record: PositionPlayer) => {
                            return record['PLAYER NAME'].toLowerCase().includes(name.toLowerCase())
                                ? null
                                : record;
                        },
                    })
                        .pipe(stringify({ header: true }))
                        .pipe(fs.createWriteStream(positionFilePath))
                );
            } else {
                console.log('Position file not found.');
            }
        }
    } catch (e) {
        console.warn('Removal failed!');
        console.warn(e);
    }
}
