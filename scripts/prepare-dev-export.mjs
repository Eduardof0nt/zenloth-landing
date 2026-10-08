import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
mkdirSync('dist/en',{recursive:true});
for(const file of ['index.html','info.html','en/index.html','en/info.html']){
 const html=readFileSync(file,'utf8').replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');writeFileSync('dist/'+file,html);
}
cpSync('src','dist/src',{recursive:true});
writeFileSync('dist/robots.txt','User-agent: *\nDisallow: /\n');
writeFileSync('dist/404.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page not found | Zenloth</title><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Page not found</h1><p lang="es">Página no encontrada.</p><a href="/">Zenloth</a></main></body></html>');
writeFileSync('dist/release.json',JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()})+'\n');
