#!/bin/sh
# Rebuild every student page, the hub (index.html) and the teacher record page from state.json.
# Usage: sh tools/build_all.sh state.json
set -e
cd "$(dirname "$0")/.."
python3 tools/make_print_pdfs.py "$1"
EP=$(node -e "try{console.log(require('./tools/config.json').endpoint||'')}catch(e){console.log('')}")
node -e "const fs=require('fs');fs.writeFileSync('teacher.html',fs.readFileSync('tools/teacher-template.html','utf8').replace('__ENDPOINT__',process.argv[1]))" "$EP"
node -e "
const fs=require('fs');const m=JSON.parse(fs.readFileSync('tools/pages.json','utf8'));
for(const [file,p] of Object.entries(m)){const meta=typeof p==='string'?{id:p}:p;
  require('child_process').execFileSync('node',['tools/make_student.js',process.argv[1],meta.id,file].concat(meta.grade?[String(meta.grade)]:[]),{stdio:'inherit'})}" "$1"
node tools/make_hub.js "$1"
cp tools/roster.json study/roster.json
