import { expect, type Locator, type Page } from '@playwright/test';
import { removeMatchingPlayer } from '../../data/rankings-csv';

const ALERT_REG_EXPS = [
    [/You\s+have\s+the\s+\d+\w{2}\s+pick/i],
    [/It's\s+your\s+turn\s+to\s+draft/i, /Pick\s+Now/i],
    [/your\s+team\s+is\s+full/i, /draft\s+complete/i],
];

enum draftState {
    PRE_DRAFT,
    WAITING,
    MY_TURN,
    AUTODRAFT,
    POST_DRAFT,
}

export class YahooDraftPage {
    private state: draftState = draftState.PRE_DRAFT;
    private readonly page: Page;

    //#region PageElements

    // globals
    private readonly shittyPopupAdCloseButton: Locator;
    private readonly queueButton: Locator;
    private readonly alertLocator: Locator;
    private readonly endingAlertLocator: Locator;
    private readonly disableAutodraftButton: Locator;

    // queue section
    private readonly queuePlaceholderText: Locator;
    private readonly expandButton: Locator;
    private readonly queueTable: Locator;

    // 'Players' tab
    private readonly playersTab: Locator;
    private readonly positionFilter: Locator;
    private readonly playerSearchField: Locator;
    private readonly playerList: Locator;

    // 'Draft Results' tab
    private readonly resultsTab: Locator;
    private readonly roundByRoundTab: Locator;
    private readonly resultsTable: Locator;

    //#endregion

    constructor(page: Page) {
        this.page = page;

        this.shittyPopupAdCloseButton = page.locator('*[class*="Close" i]').getByRole('button');
        this.queueButton = page.getByRole('button', { name: 'Queue' });
        this.alertLocator = page.locator('#draft-now');
        this.endingAlertLocator = page.locator('#countdown');
        this.disableAutodraftButton = page.getByRole('button', { name: 'Disable Autodraft' });

        this.expandButton = page.getByTitle('Click to expand the panel');
        this.queueTable = page.getByLabel('My Queue');
        this.queuePlaceholderText = page.getByText(
            'Click star icon next to players you want to add to your queue'
        );

        this.playersTab = page.getByRole('tab', { name: 'Players' });
        this.positionFilter = page.locator('#position-filter');
        this.playerSearchField = page.getByPlaceholder('Search for a player');
        this.playerList = page.getByLabel('Player list');

        this.resultsTab = page.getByRole('tab', { name: 'Draft Results' });
        this.roundByRoundTab = page.getByText('Round by Round');
        this.resultsTable = page.getByLabel('Draft results by round');
    }

    async closeAd() {
        console.log('Closing popup ad...');
        await this.shittyPopupAdCloseButton.click();
    }

    async waitForPage() {
        console.log('Waiting for draft page elements...');
        await expect(this.queueButton).toBeVisible();
        await expect(this.alertLocator).toBeVisible();
        await expect(this.alertLocator).not.toHaveText('');

        try {
            await expect(this.queueTable.or(this.queuePlaceholderText)).toBeVisible();
        } catch {
            await this.expandButton.click();
            await expect(this.queueTable.or(this.queuePlaceholderText)).toBeVisible();
        }

        await this.ensurePlayersTabSelected();
        await expect(this.resultsTab).toBeVisible();
        await expect(this.positionFilter).toBeVisible();
        await expect(this.positionFilter).not.toBeEmpty();
        await expect(this.playerSearchField).toBeVisible();
        await expect(this.playerSearchField).toBeEditable();
        await expect(this.playerList).toBeVisible();
        await expect(this.playerList).not.toHaveText('');
    }

    private pickCell?: Locator = undefined;

    async doDraft() {
        await this.ensurePlayersTabSelected();
        await this.positionFilter.selectOption('All Players');
        await this.playerSearchField.clear();

        let pickCount = 0;

        while ((await this.getState()) != draftState.POST_DRAFT) {
            // TODO: handle 2 picks in quick succesion; currently first will be 'lost'

            switch (this.state) {
                case draftState.AUTODRAFT:
                    console.log('Autodraft detected - disabling...');
                    await this.disableAutodraft();
                    await expect(this.disableAutodraftButton).not.toBeVisible();

                    continue;
                case draftState.PRE_DRAFT:
                    await this.ensurePlayersTabSelected();

                    // TODO: queue players

                    console.log('Waiting for draft to begin...');
                    await expect(this.alertLocator).not.toHaveText(ALERT_REG_EXPS[0][0], {
                        timeout: 901000, // 15 min 1 s
                    });

                    break;
                case draftState.MY_TURN:
                    await this.ensurePlayersTabSelected();

                    // TODO: queue players

                    console.log('Waiting for your pick!');
                    await expect(this.alertLocator).not.toContainText(ALERT_REG_EXPS[1][0], {
                        timeout: 111000, // 1 min 51 s
                    });
                    await expect(this.alertLocator).not.toContainText(ALERT_REG_EXPS[1][1], {
                        timeout: 11000,
                    });

                    // TODO: handle edge case of last pick in round (2 back to back picks)

                    const myPick = await this.getLastPick();
                    expect(myPick).not.toEqual('');
                    console.log(`\nPick #${++pickCount}: ${myPick}`);
                    await this.updateRankings(myPick);

                    break;
                default:
                    console.log('Waiting for new pick...');
                    let prevPick = await this.getLastPick();

                    if (!this.pickCell || prevPick == '') {
                        console.log(
                            'Very first pick detected - waiting 2 seconds and checking again...'
                        );

                        await this.page.waitForTimeout(2000);
                        let prevPick = await this.getLastPick();
                        if (!this.pickCell || prevPick == '') continue;
                    }

                    await this.ensureResultsTabSelected();

                    if (pickCount == 0) {
                        console.log(`\nPick #${++pickCount}: ${prevPick}`);
                        await this.updateRankings(prevPick);
                    }

                    await expect(this.pickCell).not.toContainText(prevPick, { timeout: 121000 });

                    const currPick = await this.getLastPick();
                    console.log(`\nPick #${++pickCount}: ${currPick}`);
                    await this.updateRankings(currPick);

                    break;
            }
        }
    }

    private async ensurePlayersTabSelected() {
        if (!(await this.playerList.isVisible())) {
            await this.playersTab.click();
            await expect(this.playerList).toBeVisible();
            await expect(this.playerList).not.toHaveText('');
        }
    }

    private async getState(): Promise<draftState> {
        let alertText = '';
        let endingAlertText = '';

        if (await this.alertLocator.isVisible())
            alertText = (await this.alertLocator.textContent()) ?? '';
        endingAlertText = (await this.endingAlertLocator.textContent()) ?? '';

        if (alertText && ALERT_REG_EXPS[0][0].test(alertText)) {
            this.state = draftState.PRE_DRAFT;
            console.log('Current draft state: pre-draft');
        } else if (
            alertText &&
            (ALERT_REG_EXPS[1][0].test(alertText) || ALERT_REG_EXPS[1][1].test(alertText))
        ) {
            this.state = draftState.MY_TURN;
            console.log('Current draft state: my turn!');
        } else if (alertText && /Autodraft\s+Enabled/i.test(alertText)) {
            this.state = draftState.AUTODRAFT;
            console.log('Current draft state: autodraft');
        } else if (
            endingAlertText &&
            (ALERT_REG_EXPS[2][0].test(endingAlertText) ||
                ALERT_REG_EXPS[2][1].test(endingAlertText))
        ) {
            this.state = draftState.POST_DRAFT;
            console.log('Current draft state: post-draft');
        } else {
            this.state = draftState.WAITING; // default
            console.log('Current draft state: waiting for turn');
        }

        return this.state;
    }

    private async disableAutodraft() {
        await this.disableAutodraftButton.click();
    }

    private async ensureResultsTabSelected() {
        if (!(await this.resultsTable.isVisible())) {
            await this.resultsTab.click();
            await this.roundByRoundTab.click(); // might be header if tab is already active, but that's fine
            await expect(this.resultsTable).toBeVisible();
            await expect(this.resultsTable.getByRole('row')).not.toHaveCount(0);
        }
    }

    private async getPickCellLocator() {
        await this.ensureResultsTabSelected();
        const rowArr = await this.resultsTable.getByRole('row').all();
        if (rowArr.length < 3) return; // first pick not yet made

        const pickRowCells: Locator = rowArr[2].getByRole('cell');
        await expect(pickRowCells).not.toHaveCount(0);
        await expect(pickRowCells).not.toHaveCount(1);

        // most recent pick is in 3rd row, 2nd cell
        // rowArr[0] = header; rowArr[1] = 'Round X'; rowArr[2] = pick
        this.pickCell = (await pickRowCells.all())[1];
    }

    private async getLastPick(): Promise<string> {
        await this.ensureResultsTabSelected();
        if (!this.pickCell) await this.getPickCellLocator();
        if (!this.pickCell) return ''; // first pick not yet made

        let pick = await this.pickCell.innerText();
        expect(pick).not.toEqual('');

        let teamPosStr = pick.match(/[A-Z]{1,3}[a-z]{0,3}-\s[A-Z,]{1,5}$/)?.at(0); // 'Mia- WR', 'NYG- RB', 'LV- K', etc.
        if (!teamPosStr) teamPosStr = pick.match(/\s-\sDEF/)?.at(0); // - DEF
        if (teamPosStr) pick = pick.replace(teamPosStr, '');

        return pick;
    }

    private async updateRankings(playerName: string) {
        await removeMatchingPlayer(playerName);
    }
}
