const { IntegrationPage } = require('./integration-page.cjs');

class HotelPage extends IntegrationPage {
  heading(name) {
    return this.page.getByRole('heading', { name, exact: true });
  }
  section(id) {
    return this.page.locator(`#${id}`);
  }
  async chooseFilter(label, value) {
    await this.page.getByLabel(label, { exact: true }).selectOption(value);
  }
  async waitForReviews(action, predicate = () => true) {
    const response = this.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/reviews') && predicate(url.searchParams) && response.status() === 200;
    });
    const [received] = await Promise.all([response, action()]);
    return received.json();
  }
}
module.exports = { HotelPage };
