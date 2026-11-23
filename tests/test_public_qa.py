import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from sapore_public_qa import make_target, index_feed


def feed(*ids):
    return {'schema': 'sapore.app.published.v1', 'recipes': [
        {'id': i, 'name': i, 'ingredients': ['1 g sale'], 'steps': ['Mescolare.'],
         'reviewedRecordSha256': 'a' * 64} for i in ids]}


class DeltaTests(unittest.TestCase):
    def test_only_added(self):
        self.assertEqual([r['source_id'] for r in make_target(feed('a'), feed('a', 'b'))['recipes']], ['b'])
    def test_modified_and_removed(self):
        after = feed('a')
        after['recipes'][0]['steps'] = ['Cuocere.']
        target = make_target(feed('a', 'b'), after)
        self.assertEqual(target['absent_ids'], ['b'])
        self.assertEqual(target['recipes'][0]['source_id'], 'a')
    def test_unchanged_is_empty(self):
        self.assertEqual(make_target(feed('a'), feed('a'))['recipes'], [])
    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError): index_feed(feed('a', 'a'))
    def test_missing_digest_rejected(self):
        doc = feed('a'); doc['recipes'][0]['reviewedRecordSha256'] = ''
        with self.assertRaises(ValueError): index_feed(doc)
    def test_inputs_unchanged(self):
        doc = feed('a'); before = copy.deepcopy(doc)
        make_target(doc, feed('a', 'b'))
        self.assertEqual(doc, before)


if __name__ == '__main__': unittest.main()
