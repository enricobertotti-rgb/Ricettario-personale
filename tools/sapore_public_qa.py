"""Build QA targets exclusively from the deployed public Git snapshot."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

FEED = 'app/data/published-r15.json'


def index_feed(document):
    if document.get('schema') != 'sapore.app.published.v1':
        raise ValueError('unsupported public feed schema')
    rows = document['recipes']
    indexed = {row['id']: row for row in rows}
    if len(indexed) != len(rows):
        raise ValueError('duplicate public recipe IDs')
    for row in rows:
        if not row.get('ingredients') or not row.get('steps'):
            raise ValueError('incomplete public recipe')
        if not re.fullmatch(r'[0-9a-f]{64}', row.get('reviewedRecordSha256', '')):
            raise ValueError('missing reviewed digest')
    return indexed


def make_target(before, after):
    old, new = index_feed(before), index_feed(after)
    changed = [row for key, row in new.items() if old.get(key) != row]
    return {
        'recipes': [{'source_id': row['id'], 'title': row['name'],
                     'reviewed_digest': row['reviewedRecordSha256'],
                     'ingredients': row['ingredients'], 'steps': row['steps']}
                    for row in changed],
        'absent_ids': sorted(old.keys() - new.keys()),
    }


def git(*args):
    return subprocess.check_output(['git', *args])


def prepare():
    commit = os.environ['SAPORE_PUBLIC_COMMIT']
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('invalid deployment commit')
    if git('rev-parse', 'HEAD').decode().strip() != commit:
        raise ValueError('checkout does not match deployment')
    after = json.loads(Path(FEED).read_bytes())
    # Parent must exist: no silent full-history fallback.
    before = json.loads(git('show', 'HEAD^:' + FEED))
    target = make_target(before, after)
    # A QA-only installation checks one existing published card as a canary.
    if not target['recipes'] and not target['absent_ids'] and os.environ.get('SAPORE_QA_CANARY') == 'true':
        target = make_target({'schema': after['schema'], 'recipes': []},
                             {'schema': after['schema'], 'recipes': after['recipes'][-1:]})
        target['scope'] = 'installation-canary'
    else:
        target['scope'] = 'release-delta'
    target.update(public_commit=commit, pages_run_id=os.environ.get('SAPORE_PAGES_RUN_ID'),
                  qa_repository=os.environ.get('GITHUB_REPOSITORY'),
                  qa_run_id=os.environ.get('GITHUB_RUN_ID'))
    target['asset_sha256'] = {
        name: hashlib.sha256(Path(name).read_bytes()).hexdigest()
        for name in [FEED, 'app/index.html', 'app/layout-r3.js', 'app/layout-r3.css']
    }
    Path('config').mkdir(exist_ok=True)
    Path('config/publication-qa-target.json').write_text(json.dumps(target, ensure_ascii=False))
    return target


if __name__ == '__main__':
    print(json.dumps(prepare(), ensure_ascii=False))
