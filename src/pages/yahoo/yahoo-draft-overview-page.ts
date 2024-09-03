import { expect, type Locator, type Page, type BrowserContext } from '@playwright/test';

export class YahooDraftOverviewPage {
    // public readonly relativeUrl = '/';
    public readonly relativeUrl = '/f1/mock_lobby';

    private readonly context: BrowserContext;
    private readonly page: Page;
    private readonly signInButton: Locator;
    private readonly joinDraftButton: Locator;
    private readonly numberOfTeams: number = 10; // TODO: make configurable

    constructor(context: BrowserContext, page: Page) {
        this.context = context;
        this.page = page;
        this.signInButton = page.getByRole('link', { name: 'Sign In' }).last();
        this.joinDraftButton = page
            .getByRole('link', { name: 'Enter Live Draft' }) // real draft
            .or(
                // new mock draft
                page.getByRole('button', {
                    name: `${this.numberOfTeams.toString()} Team`,
                })
            )
            .or(
                // existing mock draft
                page.getByRole('link', {
                    name: 'Launch Draft App',
                })
            );
    }

    async goto() {
        console.log('Navigating to draft overview page...');
        await this.page.goto(this.relativeUrl);
        console.log(`Current URL: ${this.page.url()}`);
    }

    async waitForPage(timeoutinSec?: number) {
        await expect(this.signInButton.or(this.joinDraftButton)).toBeVisible({
            timeout: (timeoutinSec ?? 5) * 1000,
        });
    }

    async clickSignIn() {
        console.log('Clicking "Sign In" button...');
        await this.signInButton.click();
    }

    async joinDraft(): Promise<Page> {
        const pagePromise = this.context.waitForEvent('page');

        console.log(`Clicking button to join ${this.numberOfTeams}-team draft...`);
        await this.joinDraftButton.click();

        return await pagePromise;
    }
}
