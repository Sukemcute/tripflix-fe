// Real local Core/Postgres/AI/OpenAI/Admin. Optional seeded public CDN images when local S3 credentials are absent.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_PACKAGE || 'playwright') + '/test');
const { api } = require('./verify-creator-comment-controls-live.cjs');
const { login } = require('./verify-be10-live.cjs');
const { execFileSync } = require('node:child_process');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const output = path.resolve('../be09-acceptance');
const sql = (query) => execFileSync('docker', ['exec', 'tripflix-postgres-1', 'psql', '-U', 'postgres', '-d', 'core', '-At', '-c', query], {encoding:'utf8'}).trim();
async function main() {
  await mkdir(output,{recursive:true});
  await expect.poll(async()=>{try{return (await fetch('http://localhost:3000/health')).status;}catch{return 0;}},{timeout:60000,intervals:[1000]}).toBe(200);
  const password = process.env.CREATOR_QA_PASSWORD?.trim(); assert.ok(password);
  const token = async email => (await api('/auth/login',null,'POST',{email,password})).accessToken;
  const owner = await token('member@tripflix.local');
  const staff = await token('moderator@tripflix.local');
  const assetIds=[];
  const fixtureMode=process.env.BE09_USE_EXISTING_CDN==='1';
  if (fixtureMode) {
    const authorId=JSON.parse(Buffer.from(owner.split('.')[1],'base64url')).sub;
    assert.match(authorId,/^[0-9a-f-]{36}$/);
    const prefixes=sql("select hls_prefix from content.media_assets where status='ready' and kind='video' order by id limit 2").split('\n');
    assert.equal(prefixes.length,2);
    for (const prefix of prefixes) {
      assert.match(prefix,/^[a-zA-Z0-9/-]+$/);
      const image=await fetch(`https://d399hxccn6y84z.cloudfront.net/${prefix}/poster_540.jpg`); assert.ok(image.ok);
      const id=randomUUID();
      sql(`insert into content.media_assets (id,owner_id,kind,status,mime_type,file_size_bytes,source_key) values ('${id}','${authorId}','image','ready','image/jpeg',100,'${prefix}/poster_540.jpg')`);
      assetIds.push(id);
    }
  } else {
    const response = await fetch('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=640&fm=jpg');
    assert.ok(response.ok); const bytes = Buffer.from(await response.arrayBuffer());
    for(let n=0;n<2;n++) {
    const upload = await api('/media/uploads',owner,'POST',{mimeType:'image/jpeg',fileSizeBytes:bytes.length,widthPx:640,heightPx:400},201);
    const put = await fetch(upload.parts[0].url,{method:'PUT',body:bytes}); assert.ok(put.ok,'S3 upload');
    const etag = put.headers.get('etag'); assert.ok(etag);
    const completed = await api(`/media/uploads/${upload.assetId}/complete`,owner,'POST',{parts:[{partNumber:1,etag}]},202);
    assert.equal(completed.status,'ready'); assetIds.push(upload.assetId);
    }
  }
  const title='BE09 nghiệm thu caption và 2 ảnh '+Date.now();
  const postId=(await api('/v1/posts',owner,'POST',{post_type:'vlog',title,body:'Một chuyến đi bình yên giữa thiên nhiên.',media_ids:assetIds},201)).id;
  assert.match(postId,/^[0-9a-f-]{36}$/);
  await api(`/v1/posts/${postId}/publish`,owner,'POST',undefined,201);
  const endpoint=`/v1/admin/moderation/posts/${postId}/parts`;
  await api(endpoint,null,'GET',undefined,401);
  await api(endpoint,owner,'GET',undefined,403);
  let evidence;
  await expect.poll(async()=>{evidence=await api(endpoint,staff);return evidence.items.filter(i=>i.status==='passed').length;},{timeout:120000,intervals:[1000]}).toBe(3);
  assert.equal(evidence.imagePolicy,'review_only');
  assert.equal(evidence.items.filter(i=>i.kind==='image').length,2);
  assert.ok(evidence.items.every(i=>i.model==='omni-moderation-latest'));
  if (!fixtureMode) assert.equal(sql(`select count(*) from content.outbox_events where type='content.image.ready' and payload->>'assetId' in ('${assetIds[0]}','${assetIds[1]}')`),'2');
  await api(`/v1/posts/${postId}/reports`,staff,'POST',{reasonCode:'OTHER',reasonDetail:'Hồ sơ QA BE09 để xem bằng chứng từng phần'},201);
  const part=evidence.items.find(i=>i.kind==='image'); assert.match(part.id,/^[0-9a-f-]{36}$/);
  sql(`update content.moderation_parts set status='failed',attempts=8,error_code='provider_timeout',verdict=null where id='${part.id}'`);
  const failed = await api('/v1/admin/moderation/scans/failed',staff);
  assert.ok(failed.items.some(i=>i.eventId===part.id&&i.partKind==='image'));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));
    await login(page,'moderator@tripflix.local',postId);
    const panel=page.getByRole('region',{name:'Kết quả quét caption và ảnh'});
    await expect(panel.getByText('Quét thất bại',{exact:true})).toBeVisible();
    await page.screenshot({path:path.join(output,'parts-failure-desktop.png'),fullPage:true});
    await panel.getByRole('button',{name:'Thử quét lại',exact:true}).click();
    await expect(panel.getByRole('status')).toContainText('Đã lên lịch thử lại');
    await expect.poll(async()=>{evidence=await api(endpoint,staff);return evidence.items.find(i=>i.id===part.id)?.status;},{timeout:90000,intervals:[1000]}).toBe('passed');
    await panel.getByRole('button',{name:'Làm mới',exact:true}).click();
    await expect(panel.getByText('Chưa phát hiện vi phạm',{exact:true})).toHaveCount(3);
    assert.equal(sql(`select count(*) from content.moderation_parts where id='${part.id}' and retried_by is not null and retried_at is not null`),'1');
    await page.screenshot({path:path.join(output,'parts-passed-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await expect(panel.getByText('Caption',{exact:true})).toBeVisible();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'no page overflow');
    await page.screenshot({path:path.join(output,'parts-mobile.png'),fullPage:true});
    await panel.getByText('Ảnh 2',{exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,'parts-images-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
  await writeFile(path.join(output,'result.json'),JSON.stringify({postId,title,assetIds,fixtureMode,realProvider:true,model:'omni-moderation-latest',checks:['separate-caption-and-two-images',fixtureMode?'existing-public-CDN-fixtures':'real-S3-image-ready-outbox','staff-only-evidence','failed-parts-recovery-list','Admin-retry-to-real-provider','desktop-and-mobile','no-browser-errors'],evidence},null,2));
  console.log(JSON.stringify({postId,title,checks:7,parts:evidence.items.map(i=>({kind:i.kind,status:i.status,model:i.model}))}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
