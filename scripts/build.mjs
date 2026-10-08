import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,openSync,closeSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const platform={win32:'win32-x64/esbuild.exe',linux:`linux-${process.arch}/bin/esbuild`,darwin:`darwin-${process.arch}/bin/esbuild`}[process.platform];
const viteRequire=createRequire(require.resolve('vite/package.json'));
const esbuildRequire=createRequire(viteRequire.resolve('esbuild/package.json'));
const executable=esbuildRequire.resolve(`@esbuild/${platform}`);
mkdirSync('dist/assets',{recursive:true});
// Parent-opened output handles work in Windows sandboxes where native children
// can compile but cannot open workspace files themselves. No service pipes.
function compile(args,output){
 const handle=openSync(output,'w');let r;
 try{r=spawnSync(executable,args,{stdio:['ignore',handle,'inherit']})}finally{closeSync(handle)}
 if(r.error)throw r.error;
 if(r.status!==0||statSync(output).size<100)throw new Error(`Build failed: ${output}`);
}
compile(['src/main.jsx','--bundle','--minify','--format=esm','--target=es2022','--loader:.js=jsx','--loader:.css=empty','--define:process.env.NODE_ENV="production"'],'dist/assets/app.js');
compile(['src/style.css','--minify'],'dist/assets/app.css');
const html=readFileSync('index.html','utf8').replace('<script type="module" src="/src/main.jsx"></script>','<link rel="stylesheet" href="/assets/app.css"/><script type="module" src="/assets/app.js"></script>');
writeFileSync('dist/index.html',html);
console.log('Production build complete: dist/');
