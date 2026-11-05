class IntegrationPage {
  constructor(page, baseUrl) {
    this.page = page;
    this.baseUrl = baseUrl;
  }
  async visit(route) {
    await this.page.goto(new URL(route, this.baseUrl).href);
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async click(name) {
    await this.button(name).click();
  }
  async fill(label, value) {
    await this.page.getByLabel(label, { exact: true }).fill(value);
  }
  async visible(text) {
    await this.page.getByText(text, { exact: true }).first().waitFor();
  }
  async login(email, password) {
    await this.visit('/login');
    await this.fill('Email', email);
    await this.fill('Mật khẩu', password);
    await this.click('Đăng nhập');
  }
}
module.exports = { IntegrationPage };
