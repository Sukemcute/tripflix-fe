class ReelsPage {
  constructor(page) {
    this.page = page;
    this.like = page.getByRole('button', { name: 'Thích', exact: true });
    this.unlike = page.getByRole('button', { name: 'Bỏ thích', exact: true });
    this.save = page.getByRole('button', { name: 'Lưu bài', exact: true });
    this.comments = page.getByRole('button', { name: 'Bình luận', exact: true });
    this.close = page.getByRole('button', { name: 'Đóng bình luận', exact: true });
    this.header = page.getByTestId('reel-comments-header');
    this.list = page.getByTestId('reel-comments-list');
  }
  async open() {
    await this.page.goto(process.env.MOBILE_PREVIEW_URL || 'http://localhost:8081/(tabs)');
  }
  async drag(locator, dy) {
    const box = await locator.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(30, box.height / 2);
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + dy, { steps: 20 });
    await this.page.mouse.up();
  }
}
module.exports = { ReelsPage };
