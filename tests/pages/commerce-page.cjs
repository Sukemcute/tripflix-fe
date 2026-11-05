class CommercePage {
  constructor(page, baseUrl, expect) {
    this.page = page;
    this.baseUrl = baseUrl;
    this.expect = expect;
  }
  async visit(path) {
    await this.page.goto(new URL(path, this.baseUrl).href);
  }
  button(name) {
    return this.page.getByRole('button', { name, exact: true });
  }
  async login(email, password) {
    await this.visit('/login');
    await this.page.getByLabel('Email', { exact: true }).fill(email);
    await this.page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await this.button('Đăng nhập').click();
    await this.expect(this.page.getByText(email, { exact: true })).toBeVisible();
  }
  async hold(hotelPath) {
    await this.visit(hotelPath);
    await this.page.getByRole('heading', { name: 'Vinpearl Beach Đà Nẵng', exact: true }).waitFor();
    const buttons = this.page.getByRole('button', { name: 'Chọn phòng', exact: true });
    await this.expect
      .poll(async () => {
        for (const button of await buttons.all()) if (await button.isEnabled()) return true;
        return false;
      })
      .toBe(true);
    const count = await buttons.count();
    for (let index = 0; index < count; index++) {
      if (await buttons.nth(index).isEnabled()) {
        await buttons.nth(index).click();
        break;
      }
    }
    await this.button('Giữ chỗ & tiếp tục').click();
    await this.page.getByLabel('Họ và tên', { exact: true }).waitFor();
    await this.expect(this.page.getByText(/Giữ chỗ còn \d+:\d+/)).toBeVisible();
    return new URL(this.page.url()).searchParams.get('id');
  }
  async contact(card) {
    await this.page.getByLabel('Họ và tên', { exact: true }).fill('NGUYEN VAN TEST');
    await this.page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
    await this.page.getByLabel('Số thẻ', { exact: true }).fill(card);
    await this.page.getByRole('button', { name: /Tôi đồng ý điều kiện đặt chỗ/ }).click();
  }
  async pay() {
    await this.button('Thanh toán').click();
  }
  async expectPaid() {
    await this.expect(this.page.getByText('Mã xác nhận', { exact: true })).toBeVisible({ timeout: 15000 });
  }
}
module.exports = { CommercePage };
