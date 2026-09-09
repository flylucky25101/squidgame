import fs from 'node:fs';
const p='app/arena/Arena.jsx';let s=fs.readFileSync(p,'utf8');
s=s.replace("if(e.code==='Space'&&!e.repeat&&!pausedRef.current)","if(e.code==='Space'&&!e.repeat&&!pausedRef.current&&run.current.round===2)");
s=s.replace('Math.floor(s.time/60)','Math.floor(Math.ceil(s.time)/60)').replace('Math.ceil(s.time%60)','(Math.ceil(s.time)%60)');
fs.writeFileSync(p,s);
