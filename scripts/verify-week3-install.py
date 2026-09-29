#!/usr/bin/env python3
"""Install the actual ZIP under isolated CLAUDE_CONFIG_DIR and compare bytes."""
import argparse,hashlib,json,os,subprocess,zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('zip');p.add_argument('output');a=p.parse_args()
out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=False)
with zipfile.ZipFile(a.zip) as z:z.extractall(out/'unpacked')
kit=out/'unpacked/sparker-week3-preview';env=dict(os.environ,CLAUDE_CONFIG_DIR=str(out/'claude-config'))
def run(args):
 r=subprocess.run(['claude']+args,env=env,text=True,capture_output=True,timeout=90)
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return r.stdout
receipt={'marketplace':run(['plugin','marketplace','add',str(kit)]),'plugins':{}}
for name,folder in [('sparker-discovery','discovery'),('sparker-camp','camp')]:
 receipt['plugins'][name]={'install':run(['plugin','install',name+'@sparker-week3-preview']),'validate':run(['plugin','validate',str(kit/folder)])}
installed=json.loads((out/'claude-config/plugins/installed_plugins.json').read_text())
for name,folder in [('sparker-discovery','discovery'),('sparker-camp','camp')]:
 entry=installed['plugins'][name+'@sparker-week3-preview'][0];dest=Path(entry['installPath']);source=kit/folder
 files=[f for f in source.rglob('*') if f.is_file()];mismatch=[]
 for f in files:
  target=dest/f.relative_to(source)
  if not target.is_file() or hashlib.sha256(f.read_bytes()).digest()!=hashlib.sha256(target.read_bytes()).digest():mismatch.append(str(f.relative_to(source)))
 assert not mismatch,mismatch
 receipt['plugins'][name].update({'files':len(files),'mismatch':mismatch,'path':str(dest),'version':entry.get('version')})
receipt['list']=json.loads(run(['plugin','list','--json']))
(out/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(receipt,ensure_ascii=False,indent=2))
