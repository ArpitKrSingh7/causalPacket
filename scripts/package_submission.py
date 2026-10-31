"""Create an allowlisted source snapshot with credential-pattern checks."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tarfile
from tempfile import TemporaryDirectory

ROOT=Path(__file__).resolve().parents[1]
TOP_FILES={'.gitignore','.python-version','README.md','PLAN.md','run.sh','pyproject.toml','requirements.txt','requirements-dev.txt'}
SOURCE_DIRS={'backend','scripts','tests','docs','samples','frontend'}
SKIP_DIRS={'node_modules','.next','out','__pycache__','.pytest_cache','.ruff_cache','coverage','playwright-report','test-results'}
SECRET_PATTERNS=(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'\bAKIA[A-Z0-9]{16}\b',rb'\bghp_[A-Za-z0-9]{36}\b',rb'\bsk-proj-[A-Za-z0-9_-]{60,}\b')


def source_files(root):
    manifest=json.loads((root/'samples/manifest.json').read_text())
    if manifest.get('synthetic') is not True:
        raise ValueError('The sample manifest must explicitly identify synthetic captures.')
    capture_names=set(manifest['scenarios'])
    result=[]
    for path in root.iterdir():
        if path.name in TOP_FILES and path.is_file():
            result.append(path)
    for directory in sorted(SOURCE_DIRS):
        base=root/directory
        if base.is_symlink():
            raise ValueError('Refusing a source directory symlink: '+directory)
        if not base.exists():
            continue
        for current,dirs,names in os.walk(base,followlinks=False):
            dirs[:]=sorted(d for d in dirs if d not in SKIP_DIRS and not d.startswith('.'))
            for name in sorted(names):
                path=Path(current)/name
                if path.is_symlink():
                    raise ValueError('Refusing a source symlink: '+str(path.relative_to(root)))
                if name.startswith('.') and not name.endswith('.example'):
                    continue
                if name.startswith('.env') and not name.endswith('.example'):
                    continue
                if path.suffix in {'.pyc','.log','.tsbuildinfo','.pem','.p12','.key'} or name in {'id_rsa','id_ed25519'}:
                    continue
                relative=path.relative_to(root)
                if path.suffix.lower() in {'.pcap','.pcapng'} and (relative.parent!=Path('samples') or name not in capture_names):
                    continue
                result.append(path)
    return sorted(result,key=lambda path:path.relative_to(root).as_posix())


def validate_samples(root):
    from scripts.generate_samples import generate
    manifest=json.loads((root/'samples/manifest.json').read_text())
    with TemporaryDirectory(prefix='causalpacket-package-controls-') as directory:
        generate(Path(directory),seed=manifest['seed'])
        for path in Path(directory).iterdir():
            original=root/'samples'/path.name
            if not original.is_file() or original.read_bytes()!=path.read_bytes():
                raise ValueError('A sample differs from deterministic synthetic generation: '+path.name)


def create_archive(root,output,check_samples=True):
    root,output=Path(root).resolve(),Path(output).resolve()
    if check_samples:
        validate_samples(root)
    entries=[]
    for path in source_files(root):
        if path.is_symlink():
            raise ValueError('Refusing a source symlink: '+str(path.relative_to(root)))
        if path.resolve()==output:
            raise ValueError('Archive output must not overwrite a source file. Use .artifacts/.')
        data=path.read_bytes()
        if any(re.search(pattern,data) for pattern in SECRET_PATTERNS):
            raise ValueError('Potential credential pattern in '+path.relative_to(root).as_posix()+'; review that file before packaging.')
        entries.append((path.relative_to(root).as_posix(),data))
    record={'description':'Source snapshot; not proof of publication or submission.',
        'files':[{'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()} for name,data in entries]}
    output.parent.mkdir(parents=True,exist_ok=True)
    with tarfile.open(output,'w:gz') as archive:
        for name,data in [*entries,('_submission-manifest.json',(json.dumps(record,indent=2)+'\n').encode())]:
            info=tarfile.TarInfo(name)
            info.size=len(data); info.mode=0o755 if name=='run.sh' else 0o644
            info.uid=info.gid=0; info.uname=info.gname=''; info.mtime=0
            archive.addfile(info,io.BytesIO(data))
    return record


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'.artifacts/causalpacket-submission.tar.gz')
    args=parser.parse_args()
    try:
        record=create_archive(ROOT,args.output)
    except (ValueError,OSError) as error:
        raise SystemExit(str(error))
    digest=hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(f'Packaged {len(record["files"])} source files: {args.output}')
    print(f'SHA256 {digest}')
    print('Excluded environments, dependency trees, Git metadata, caches, private env files, and undeclared captures.')
    print('This is a review snapshot; rebuild after final edits before publishing a real GitHub repository.')


if __name__=='__main__':
    main()
