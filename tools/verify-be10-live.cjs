// Seeded local accounts and real Admin/Core/Postgres. No mocked network responses.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_PACKAGE || 'playwright') + '/test');
const { api } = require('./verify-creator-comment-controls-live.cjs');
const { mkdir, writeFile } = require('node:fs/promises');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve('../be10-acceptance');
let owner, staff, other, postId, caseId, browser;
const extraPosts=[];
const lease = (token, action, leaseId, status = 201) => api(`/v1/admin/moderation/queue/${caseId}/lease`,token,'POST',{action,...(leaseId?{leaseId}:{})},status);
async function login(page,email,search=postId) {
  await page.goto('http://localhost:3200/login?returnTo=%2Fmoderation',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email',{exact:true}).waitFor();
  await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled();
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.CREATOR_QA_PASSWORD.trim());
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/moderation',{timeout:30000,waitUntil:'domcontentloaded'});
  await page.getByPlaceholder('Tìm trong toàn bộ hàng chờ').fill(search);
  await page.getByRole('button',{name:'Chi tiết',exact:true}).click();
}
async function main() {
  await mkdir(output,{recursive:true});
  const password=process.env.CREATOR_QA_PASSWORD?.trim(); assert.ok(password);
  const token = async email => (await api('/auth/login',null,'POST',{email,password})).accessToken;
  [owner,staff,other]=await Promise.all(['member@tripflix.local','moderator@tripflix.local','superadmin@tripflix.local'].map(token));
  postId=(await api('/v1/posts',owner,'POST',{post_type:'vlog',title:'BE10 QA '+Date.now(),body:'Hồ sơ kiểm tra phân công và thời hạn xử lý.'},201)).id;
  await api(`/v1/posts/${postId}/publish`,owner,'POST',undefined,201);
  caseId=(await api(`/v1/posts/${postId}/reports`,staff,'POST',{reasonCode:'OTHER'},201)).caseId;
  assert.match(caseId,/^[a-f0-9-]{36}$/);
  browser=await chromium.launch({channel:'msedge',headless:true});
  const a=await browser.newPage({viewport:{width:1440,height:1080}}), b=await browser.newPage({viewport:{width:1440,height:1080}});
  await login(a,'moderator@tripflix.local');
  const dialog=a.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'Đóng hồ sơ',exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'Nhận hồ sơ',exact:true}).click();
  await expect(dialog.getByText('Bạn đang xử lý',{exact:true})).toBeVisible();
  const first=await api(`/v1/admin/moderation/queue/${caseId}`,staff);
  assert.ok(first.leaseId);
  await dialog.getByRole('button',{name:'Gia hạn 15 phút',exact:true}).click();
  await expect.poll(async()=> (await api(`/v1/admin/moderation/queue/${caseId}`,staff)).leaseExpiresAt).not.toBe(first.leaseExpiresAt);
  assert.equal((await api(`/v1/admin/moderation/queue/${caseId}`,staff)).dueAt,first.dueAt);
  await login(b,'superadmin@tripflix.local');
  await expect(b.getByRole('dialog').getByRole('button',{name:'Nhận lại hồ sơ',exact:true})).toBeDisabled();
  await lease(other,'claim',undefined,409);
  await api(`/v1/admin/moderation/queue/${caseId}/decisions`,other,'POST',{action:'hide',reasonCode:'OTHER'},409);
  await api(`/v1/admin/posts/${postId}/moderation-actions`,other,'POST',{action:'hide',reason_code:'OTHER'},409);
  await a.screenshot({path:path.join(output,'owner-lease-1440.png')});
  await b.screenshot({path:path.join(output,'other-admin-blocked.png')});
  await a.setViewportSize({width:390,height:900});
  await a.screenshot({path:path.join(output,'owner-lease-390.png')});
  await a.setViewportSize({width:1440,height:1080});
  await dialog.getByRole('button',{name:'Trả hồ sơ',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Nhận hồ sơ',exact:true})).toBeEnabled();
  await b.getByRole('button',{name:'Đóng modal',exact:true}).click();
  await b.getByRole('button',{name:'Chi tiết',exact:true}).click();
  await b.getByRole('dialog').getByRole('button',{name:'Nhận hồ sơ',exact:true}).click();
  await expect(b.getByRole('dialog').getByText('Bạn đang xử lý',{exact:true})).toBeVisible();
  const next=await api(`/v1/admin/moderation/queue/${caseId}`,other);
  assert.notEqual(next.leaseId,first.leaseId);
  await lease(staff,'release',first.leaseId,409);
  // Only this newly-created local QA case is aged; no production data or clock changes.
  execFileSync('docker',['exec','tripflix-postgres-1','psql','-U','postgres','-d','core','-c',`UPDATE content.moderation_cases SET due_at=now()-interval '1 hour', lease_expires_at=now()-interval '1 second' WHERE id='${caseId}'`],{stdio:'pipe'});
  await lease(other,'renew',next.leaseId,409);
  const reclaimed=await lease(staff,'claim');
  const mine=await api('/v1/admin/moderation/queue?view=pending&assignment=mine&sla=overdue&search='+postId,staff);
  assert.equal(mine.total,1); assert.equal(mine.items[0].id,caseId);
  assert.ok((await api('/v1/admin/moderation/stats',staff)).overdue>=1);
  await a.getByRole('button',{name:'Đóng modal',exact:true}).click();
  await a.getByRole('combobox',{name:'Hạn xử lý',exact:true}).selectOption('overdue');
  await a.getByRole('combobox',{name:'Người xử lý',exact:true}).selectOption('mine');
  await a.getByRole('button',{name:'Chi tiết',exact:true}).click();
  await dialog.getByRole('button',{name:'Lịch sử xử lý',exact:true}).click();
  await expect(dialog.getByText('Lịch sử nhận hồ sơ và truy cập bằng chứng (100 lượt gần nhất)',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Thông tin',exact:true}).click();
  await dialog.getByRole('combobox').selectOption('OTHER');
  await expect(dialog.getByRole('button',{name:'Đóng hồ sơ',exact:true})).toBeEnabled();
  await dialog.getByRole('button',{name:'Đóng hồ sơ',exact:true}).click();
  await expect(dialog).toBeHidden();
  await api(`/v1/admin/moderation/queue/${caseId}/decisions`,staff,'POST',{action:'dismiss',reasonCode:'OTHER',leaseId:reclaimed.leaseId},409);
  const audit=await api(`/v1/admin/moderation/queue/${caseId}`,staff);
  assert.ok(audit.reviewAudit.some(row=>row.action==='evidence_view'));
  assert.ok(audit.reviewAudit.some(row=>row.action==='release'));
  assert.equal(audit.status,'resolved');

  const marker='BE10BATCH'+Date.now(), batch=[];
  for(let i=0;i<2;i++) {
    const id=(await api('/v1/posts',owner,'POST',{post_type:'vlog',title:marker+' '+i,body:'Kiểm tra xử lý hàng loạt độc lập từng hồ sơ.'},201)).id;
    extraPosts.push(id);
    await api('/v1/posts/'+id+'/publish',owner,'POST',undefined,201);
    batch.push((await api('/v1/posts/'+id+'/reports',staff,'POST',{reasonCode:'OTHER'},201)).caseId);
  }
  await api('/v1/admin/moderation/queue/'+batch[0]+'/lease',other,'POST',{action:'claim'},201);
  await a.getByRole('button',{name:/^Chờ duyệt/}).click();
  await a.getByRole('combobox',{name:'Hạn xử lý',exact:true}).selectOption('all');
  await a.getByRole('combobox',{name:'Người xử lý',exact:true}).selectOption('all');
  await a.getByPlaceholder('Tìm trong toàn bộ hàng chờ').fill(marker);
  await expect(a.getByRole('button',{name:'Chi tiết',exact:true})).toHaveCount(2);
  await a.getByRole('checkbox',{name:'Chọn tất cả',exact:true}).check();
  await a.getByRole('combobox',{name:'Lý do xử lý hàng loạt',exact:true}).selectOption('OTHER');
  await a.getByRole('button',{name:'Ẩn (tạm thời)',exact:true}).click();
  await expect(a.getByText('Đã xử lý 1 mục. Có 1 mục chưa xử lý được.',{exact:true})).toBeVisible();
  assert.equal((await api('/v1/admin/moderation/queue/'+batch[0],other)).status,'pending');
  assert.equal((await api('/v1/admin/moderation/queue/'+batch[1],staff)).status,'resolved');
  await a.screenshot({path:path.join(output,'queue-bulk-partial.png')});

  await writeFile(path.join(output,'result.json'),JSON.stringify({result:'passed',checks:['real Admin login x2','claim and explicit decision guard','renew preserves dueAt','other Admin conflict + direct API guard','release and reclaim','expired lease reclaim + stale token rejected','mine + overdue server filter and aggregate','audit view + actions','UI decision + duplicate prevention','1440/390 screenshots','bulk partial success preserves other Admin lease']},null,2));
  process.stdout.write('BE10 live Admin/API acceptance passed\n');
}
if (require.main === module) main().catch(async error=>{
  if(browser)for(const[i,context]of browser.contexts().entries())for(const[j,page]of context.pages().entries())await page.screenshot({path:path.join(output,`failure-${i}-${j}.png`)}).catch(()=>{});
  process.stderr.write(String(error.stack||error));process.exitCode=1;
}).finally(async()=>{await browser?.close();if(owner)for(const id of [postId,...extraPosts].filter(Boolean))await api(`/v1/posts/${id}`,owner,'DELETE').catch(()=>{});});

module.exports = { login };
