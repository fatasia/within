import {expect,test} from '@playwright/test';
for (const width of [1440,390]) test(`Roadster song follows entry, mute and exits at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:900});
 await page.addInitScript(()=>{
  const audios:HTMLAudioElement[]=[];const contexts:AudioContext[]=[];
  Object.assign(window,{roadsterAudioAudit:{audios,contexts}});
  window.Audio=new Proxy(window.Audio,{construct(target,args){const a=Reflect.construct(target,args) as HTMLAudioElement;audios.push(a);return a;}});
  window.AudioContext=new Proxy(window.AudioContext,{construct(target,args){const a=Reflect.construct(target,args) as AudioContext;contexts.push(a);return a;}});
  localStorage.setItem('ruhua.preferences.v1',JSON.stringify({painting:'roadster'}));
 });
 const state=()=>page.evaluate(()=>{const a=(window as unknown as {roadsterAudioAudit:{audios:HTMLAudioElement[];contexts:AudioContext[]}}).roadsterAudioAudit;return{playing:a.audios.filter(x=>!x.paused).length,time:a.audios[0]?.currentTime??0,ambient:a.contexts.filter(x=>x.state==='running').length};});
 await page.goto('/');await page.getByRole('button',{name:'进入试场',exact:true}).click();
 await expect.poll(async()=>(await state()).playing).toBe(1);await expect.poll(async()=>(await state()).time).toBeGreaterThan(0);
 expect((await state()).ambient).toBe(0);
 await page.getByRole('button',{name:'关闭配乐与音效',exact:true}).click();await expect.poll(async()=>(await state()).playing).toBe(0);
 await page.getByRole('button',{name:'开启配乐与音效',exact:true}).click();await expect.poll(async()=>(await state()).playing).toBe(1);
 await page.getByRole('button',{name:'返回画境首页',exact:true}).click();await expect.poll(async()=>(await state()).playing).toBe(0);
 await page.getByRole('button',{name:'进入试场',exact:true}).click();await expect.poll(async()=>(await state()).playing).toBe(1);
 await page.getByRole('button',{name:/选择画境，当前/}).click();await page.getByRole('button',{name:/^切换到西湖雷峰塔/}).click();
 await expect.poll(async()=>(await state()).playing).toBe(0);expect((await state()).ambient).toBe(0);
});

