import json
from pathlib import Path
import tarfile

import pytest

from scripts.package_submission import create_archive


def minimal_source(root):
    (root/'samples').mkdir()
    (root/'samples/manifest.json').write_text(json.dumps({'synthetic':True,'scenarios':{'sample.pcap':{}}}))
    (root/'samples/sample.pcap').write_bytes(b'synthetic fixture')
    (root/'frontend').mkdir()
    (root/'frontend/package.json').write_text('{}')
    (root/'README.md').write_text('Example')
    (root/'run.sh').write_text('#!/bin/sh\n')


def test_archive_excludes_private_runtime_and_undeclared_capture_files(tmp_path):
    minimal_source(tmp_path)
    for name in ['frontend/.env.local','frontend/node_modules/private.txt','frontend/.next/cache/private.txt','.aws/credentials','.git/config','.artifacts/runtime.bin','samples/private.pcap']:
        path=tmp_path/name; path.parent.mkdir(parents=True,exist_ok=True); path.write_text('PRIVATE_EXAMPLE')
    (tmp_path/'frontend/.env.local.example').write_text('NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000')
    archive=tmp_path/'snapshot.tar.gz'
    record=create_archive(tmp_path,archive,check_samples=False)
    with tarfile.open(archive) as bundle:
        names=bundle.getnames()
        assert 'frontend/.env.local.example' in names and 'samples/sample.pcap' in names
        assert not any('node_modules' in n or '.next' in n or '.aws' in n or '.git/' in n for n in names)
        assert 'frontend/.env.local' not in names and 'samples/private.pcap' not in names
        assert bundle.getmember('run.sh').mode==0o755
        assert '_submission-manifest.json' in names
    assert len(record['files'])==6


def test_potential_private_key_pattern_prevents_archive(tmp_path):
    minimal_source(tmp_path)
    (tmp_path/'frontend/leak.txt').write_text('-----BEGIN '+'PRIVATE KEY-----')
    with pytest.raises(ValueError,match='Potential credential'):
        create_archive(tmp_path,tmp_path/'snapshot.tar.gz',check_samples=False)


def test_source_symlink_does_not_copy_external_file(tmp_path):
    minimal_source(tmp_path)
    (tmp_path/'frontend/external').symlink_to('/etc/passwd')
    with pytest.raises(ValueError,match='symlink'):
        create_archive(tmp_path,tmp_path/'snapshot.tar.gz',check_samples=False)


def test_top_level_source_symlink_is_rejected(tmp_path):
    minimal_source(tmp_path)
    (tmp_path/'README.md').unlink()
    (tmp_path/'README.md').symlink_to('/etc/passwd')
    with pytest.raises(ValueError,match='symlink'):
        create_archive(tmp_path,tmp_path/'snapshot.tar.gz',check_samples=False)


def test_archive_cannot_overwrite_a_source_file(tmp_path):
    minimal_source(tmp_path)
    with pytest.raises(ValueError,match='overwrite'):
        create_archive(tmp_path,tmp_path/'README.md',check_samples=False)
