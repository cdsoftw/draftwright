import { expect, type Locator, type Page } from '@playwright/test';

export class YahooDraftLoadingPage {
    private readonly page: Page;
    private readonly draftLoadingHeader: Locator;

    constructor(page: Page) {
        this.page = page;
        this.draftLoadingHeader = page.getByRole('heading', { name: 'Draft is now loading' });
    }

    async waitForDraftToLoad() {
        await this.waitForCountdown();
        console.log('Waiting for draft to finish loading...');
        await expect(this.draftLoadingHeader).not.toBeVisible({ timeout: 60000 });
        await expect(this.page).not.toHaveURL(/.*waiting.*/);
        await this.page.pause();
    }

    private async waitForCountdown() {
        const countdown = await this.getCountdownInSeconds();
        if (!countdown) return;

        console.log(`Waiting for ${countdown} second countdown to complete...`);
        await this.draftLoadingHeader.waitFor({ timeout: (countdown + 5) * 1000 });
    }

    private async getCountdownInSeconds(): Promise<number> {
        const countdownLocator = this.page.locator('#waiting_room-countdown');

        try {
            await countdownLocator.waitFor();
        } catch {
            console.warn('No draft countdown found!');
            return NaN;
        }

        const num10MinsStr = await countdownLocator.locator('#minutes-10').textContent();
        const numMinsStr = await countdownLocator.locator('#minutes-1').textContent();
        const num10SecsStr = await countdownLocator.locator('#seconds-10').textContent();
        const numSecsStr = await countdownLocator.locator('#seconds-10').textContent();

        if (
            !num10MinsStr?.trim() ||
            !numMinsStr?.trim() ||
            !num10SecsStr?.trim() ||
            !numSecsStr?.trim()
        ) {
            return NaN;
        }

        return (
            (parseInt(num10MinsStr) * 10 + parseInt(numMinsStr)) * 60 +
            (parseInt(num10SecsStr) * 10 + parseInt(numSecsStr))
        );
    }
}
