import { expect, type Locator, type Page } from '@playwright/test';

export class YahooDraftLoadingPage {
    private readonly page: Page;
    private readonly countdownLocator: Locator;
    private readonly draftLoadingHeader: Locator;

    constructor(page: Page) {
        this.page = page;
        this.countdownLocator = page.locator('#waiting_room-countdown');
        this.draftLoadingHeader = page.getByRole('heading', { name: 'Draft is now loading' });
    }

    async waitForDraftToLoad() {
        await this.waitForCountdown();
        console.log('Waiting for draft to finish loading...');
        await expect(this.draftLoadingHeader).not.toBeVisible({ timeout: 60000 });
        await expect(this.page).not.toHaveURL(/.*waiting.*/);
    }

    private async waitForCountdown() {
        try {
            await this.countdownLocator.waitFor({ timeout: 5000 });
        } catch {
            console.warn('No draft countdown found!');
            return;
        }

        let humanizedCoundownTxt: string | undefined = undefined;
        const countdownTxt = await this.countdownLocator.textContent();
        if (countdownTxt) {
            const colonIdx = countdownTxt.indexOf(':');
            if (colonIdx) {
                humanizedCoundownTxt = countdownTxt.substring(colonIdx - 2, colonIdx + 3);
            }
        }

        const countdownSec = await this.getCountdownInSeconds();
        if (!countdownSec) return;
        console.log(
            `Waiting for ${humanizedCoundownTxt ?? countdownSec + ' second'} countdown to complete...`
        );

        await this.draftLoadingHeader.waitFor({ timeout: (countdownSec + 5) * 1000 });
    }

    private async getCountdownInSeconds(): Promise<number> {
        const num10MinsStr = await this.countdownLocator.locator('#minutes-10').textContent();
        const numMinsStr = await this.countdownLocator.locator('#minutes-1').textContent();
        const num10SecsStr = await this.countdownLocator.locator('#seconds-10').textContent();
        const numSecsStr = await this.countdownLocator.locator('#seconds-1').textContent();

        if (
            !num10MinsStr?.trim() ||
            !numMinsStr?.trim() ||
            !num10SecsStr?.trim() ||
            !numSecsStr?.trim()
        ) {
            console.warn('Countdown text parsing failed!');
            return NaN;
        }

        return (
            (parseInt(num10MinsStr) * 10 + parseInt(numMinsStr)) * 60 +
            (parseInt(num10SecsStr) * 10 + parseInt(numSecsStr))
        );
    }
}
