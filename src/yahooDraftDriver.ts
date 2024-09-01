import { test, expect } from './fixtures';
import { YahooDraftOverviewPage } from './pages/yahoo/yahoo-draft-overview-page';
import { YahooLoginPage } from './pages/yahoo/yahoo-login-page';
import { YahooDraftLoadingPage } from './pages/yahoo/yahoo-draft-loading-page';

test('perform draft', async ({ context }) => {
    context.setDefaultTimeout(5000);
    const page = await context.newPage();

    const overviewPage = new YahooDraftOverviewPage(context, page);
    await overviewPage.goto();
    await overviewPage.waitForPage();
    await overviewPage.clickSignIn();

    const loginPage = new YahooLoginPage(page);
    await loginPage.signIn('[PUT_USERNAME_HERE]', '[PUT_PASSWORD_HERE]');
    await overviewPage.waitForPage(60); // long wait so the user can manually perform 2FA

    const newPage = await overviewPage.joinDraft();

    const loadingPage = new YahooDraftLoadingPage(newPage);
    await loadingPage.waitForDraftToLoad();

    // TODO: do actual draft
});
