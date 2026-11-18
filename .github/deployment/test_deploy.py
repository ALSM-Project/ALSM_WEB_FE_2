"""Destructive/failure scenarios run only in temporary directories on hosted CI."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("alsm_deploy", Path(__file__).with_name("deploy.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
A, B = "a" * 40, "b" * 40


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.base = self.root / "user"
        self.base.mkdir()
        self.initial = self.base / "initial"
        self.make_artifact(self.initial, "initial")
        (self.base / "current").symlink_to(self.initial)
        self.calls = []
        self.tool = d.Deployer(self.base, "user", "https://user.example.org", self.healthy, keep=2)

    def tearDown(self):
        for item in self.root.rglob("*"):
            if item.is_dir() and not item.is_symlink():
                item.chmod(0o755)
        self.temp.cleanup()

    def make_artifact(self, path, revision, content=None):
        path.mkdir(parents=True, exist_ok=True)
        (path / "index.html").write_text(content or "<html>" + revision + "</html>", encoding="utf-8")
        (path / "assets").mkdir()
        (path / "assets/app.js").write_text("/* " + revision + " */", encoding="utf-8")
        return d.stamp(path, "user", revision)

    def artifact(self, revision=A):
        path = self.root / ("artifact-" + revision)
        return path, self.make_artifact(path, revision)

    def healthy(self, url, release):
        self.assertEqual((self.base / "current").resolve(), release)
        self.calls.append(release.name)

    def test_success_is_immutable_and_idempotent(self):
        artifact, sha = self.artifact()
        self.tool.deploy(artifact, A, sha)
        before = (self.base / A / "index.html").stat().st_mtime_ns
        self.tool.deploy(artifact, A, sha)
        self.assertEqual(self.tool.target().name, A)
        self.assertEqual(self.tool.target("previous"), self.initial)
        self.assertEqual(before, (self.base / A / "index.html").stat().st_mtime_ns)
        self.assertEqual((self.base / A).stat().st_mode & 0o222, 0)

    def test_https_failure_restores_previous_and_verifies_it(self):
        artifact, sha = self.artifact()
        def fail_new(url, release):
            self.healthy(url, release)
            if release.name == A:
                raise RuntimeError("simulated HTTPS/commit mismatch")
        self.tool.checker = fail_new
        with self.assertRaisesRegex(RuntimeError, "simulated"):
            self.tool.deploy(artifact, A, sha)
        self.assertEqual(self.tool.target(), self.initial)
        self.assertEqual(self.calls, ["initial", A, "initial"])
        self.assertFalse(self.tool.journal.exists())

    def test_cancellation_rolls_back(self):
        artifact, sha = self.artifact()
        def cancel_new(url, release):
            if release.name == A:
                raise KeyboardInterrupt()
        self.tool.checker = cancel_new
        with self.assertRaises(KeyboardInterrupt):
            self.tool.deploy(artifact, A, sha)
        self.assertEqual(self.tool.target(), self.initial)

    def test_corrupt_artifact_never_changes_current(self):
        artifact, sha = self.artifact()
        (artifact / "assets/app.js").write_text("tampered", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "digests"):
            self.tool.deploy(artifact, A, sha)
        self.assertEqual(self.tool.target(), self.initial)

    def test_existing_sha_cannot_be_overwritten(self):
        artifact, sha = self.artifact()
        self.tool.deploy(artifact, A, sha)
        (artifact / d.MARKER).unlink()
        (artifact / "index.html").write_text("different build for same SHA", encoding="utf-8")
        new_sha = d.stamp(artifact, "user", A)
        with self.assertRaisesRegex(RuntimeError, "manifest digest"):
            self.tool.deploy(artifact, A, new_sha)
        self.assertEqual(self.tool.target().name, A)

    def test_wrong_production_origin_cannot_deploy(self):
        artifact, sha = self.artifact()
        self.tool.expected_origins = {"user": "https://verified.example.org"}
        with self.assertRaisesRegex(RuntimeError, "origins"):
            self.tool.deploy(artifact, A, sha)
        self.assertEqual(self.tool.target(), self.initial)

    def test_crash_journal_recovers_previous(self):
        candidate = self.base / A
        self.make_artifact(candidate, A)
        d.atomic_json(self.tool.journal, {"previous": "initial", "candidate": A})
        d.switch(self.base, candidate)
        with self.tool.lock():
            self.tool.recover()
        self.assertEqual(self.tool.target(), self.initial)
        self.assertFalse(self.tool.journal.exists())

    def test_unhealthy_baseline_never_switches(self):
        artifact, sha = self.artifact()
        self.tool.checker = lambda *_: (_ for _ in ()).throw(RuntimeError("baseline unhealthy"))
        with self.assertRaisesRegex(RuntimeError, "baseline unhealthy"):
            self.tool.deploy(artifact, A, sha)
        self.assertEqual(self.tool.target(), self.initial)
        self.assertFalse(self.tool.journal.exists())

    def test_crash_recovery_restores_even_a_corrupt_candidate(self):
        candidate = self.base / A
        self.make_artifact(candidate, A)
        d.atomic_json(self.tool.journal, {"previous": "initial", "candidate": A})
        d.switch(self.base, candidate)
        (candidate / "index.html").write_text("incomplete after power loss", encoding="utf-8")
        with self.tool.lock():
            self.tool.recover()
        self.assertEqual(self.tool.target(), self.initial)

    def test_artifact_symlink_and_hidden_secret_rejected(self):
        artifact, sha = self.artifact()
        (artifact / "leak").symlink_to(self.initial / "index.html")
        with self.assertRaisesRegex(RuntimeError, "symlink"):
            d.verify(artifact, "user", A, sha)
        (artifact / "leak").unlink()
        (artifact / ".env").write_text("not-a-real-secret", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "Hidden"):
            d.verify(artifact, "user", A, sha)

    def test_path_escape_and_manifest_swap_rejected(self):
        for name in ("../backend", "/opt/alsm", "a/../../etc", "a\\b", "./index.html"):
            with self.assertRaises(RuntimeError):
                d.safe_name(name)
        artifact, sha = self.artifact()
        with self.assertRaisesRegex(RuntimeError, "digest mismatch"):
            d.verify(artifact, "user", A, "0" * 64)
        with self.assertRaisesRegex(RuntimeError, "identity"):
            d.verify(artifact, "staff", A, sha)

    def test_lock_serializes_portal_and_recovery_skips_busy(self):
        with self.tool.lock():
            with self.assertRaises(BlockingIOError):
                with self.tool.lock(blocking=False):
                    self.fail("lock must be exclusive")

    def test_other_portals_and_initial_survive_retention(self):
        staff = self.root / "staff"
        staff.mkdir()
        (staff / "index.html").write_text("staff unchanged", encoding="utf-8")
        for n in range(6):
            revision = format(n + 1, "040x")
            artifact, sha = self.artifact(revision)
            self.tool.deploy(artifact, revision, sha)
        self.assertEqual((staff / "index.html").read_text(), "staff unchanged")
        self.assertTrue(self.initial.exists())
        self.assertEqual(len([p for p in self.base.iterdir() if d.SHA.fullmatch(p.name)]), 2)
        self.tool.rollback("initial")
        self.assertEqual(self.tool.target(), self.initial)

    def test_https_checks_manifest_index_assets_and_backend(self):
        artifact, _ = self.artifact()
        responses = {"/" + name: (artifact / name).read_bytes()
                     for name in [d.MARKER, "index.html", "assets/app.js"]}
        responses["/"] = responses["/index.html"]
        responses["/api/v1/health"] = b'{"status":"ok"}'
        original = d.fetch
        try:
            d.fetch = lambda url: responses[d.urlsplit(url).path]
            d.check_https("https://user.example.org", artifact)
            responses["/assets/app.js"] = b"old asset"
            with self.assertRaisesRegex(RuntimeError, "asset"):
                d.check_https("https://user.example.org", artifact)
        finally:
            d.fetch = original


if __name__ == "__main__":
    unittest.main(verbosity=2)
