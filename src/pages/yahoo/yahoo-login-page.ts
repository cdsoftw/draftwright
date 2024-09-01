import { expect, type Locator, type Page } from '@playwright/test';

export class YahooLoginPage {
    private readonly usernameField: Locator;
    private readonly nextButton: Locator;
    private readonly passwordField: Locator;

    constructor(page: Page) {
        this.usernameField = page.locator('#login-username');
        this.nextButton = page.locator('#login-signin');
        this.passwordField = page.locator('#login-passwd');
    }

    async signIn(username: string, password: string) {
        console.log(`Typing "${username}" into username field...`);
        await this.usernameField.clear();
        await this.usernameField.fill(username);
        await expect(this.usernameField).toHaveValue(username);
        await this.clickNext();

        console.log('Typing password into password field...');
        await this.passwordField.clear();
        await this.passwordField.fill(password);
        await expect(this.passwordField).toHaveValue(password);
        await this.clickNext();

        // TODO: figure out better way to handle 2FA - for now just wait for the user to do it
    }

    private async clickNext() {
        console.log('Clicking "Next" button...');
        await this.nextButton.click();
    }
}
