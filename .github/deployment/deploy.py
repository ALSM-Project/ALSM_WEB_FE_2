#!/usr/bin/env python3
"""Static frontend releases. Install this file as root; never execute artifact code."""
import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
import uuid
from urllib.parse import quote, urlsplit

MARKER = "_alsm/release.json"
SHA = re.compile(r"^[0-9a-f]{40}$")
PORTALS = {"user": "ALSM_WEB_FE_1", "staff": "ALSM_WEB_FE_2", "web3": "ALSM_WEB_FE_3"}
MAX_BYTES = 250 * 1024 * 1024


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_name(name):
    path = PurePosixPath(name)
    require(isinstance(name, str) and bool(name) and not path.is_absolute(), "Invalid artifact path")
    require(str(path) == name and "\\" not in name, "Noncanonical artifact path")
    require(all(not part.startswith(".") for part in path.parts), "Hidden/traversing artifact path")
    require(not name.lower().endswith((".pem", ".key", ".p12", ".pfx")), "Credential-like file in artifact")
    return path


def file_map(root):
    root = Path(root)
    require(root.is_dir() and not root.is_symlink(), "Missing artifact directory")
    result = {}
    total = 0
    for item in sorted(root.rglob("*")):
        require(not item.is_symlink(), "Artifact symlink rejected")
        name = item.relative_to(root).as_posix()
        safe_name(name)
        if item.is_dir():
            continue
        require(item.is_file(), "Artifact special file rejected")
        total += item.stat().st_size
        require(total <= MAX_BYTES and len(result) < 10000, "Artifact exceeds deployment limits")
        if name != MARKER:
            result[name] = digest(item.read_bytes())
    require("index.html" in result and (root / "index.html").stat().st_size > 0, "Missing index.html")
    return result


def stamp(root, portal, revision, origins=None):
    require(portal in PORTALS and (SHA.fullmatch(revision) or revision == "initial"), "Invalid release identity")
    root = Path(root)
    require(not (root / MARKER).exists(), "Refusing to overwrite release marker")
    files = file_map(root)
    marker = root / MARKER
    marker.parent.mkdir(exist_ok=True)
    marker.write_text(json.dumps({"schema": 1, "portal": portal, "revision": revision, "files": files,
                                  "origins": origins},
                                 sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    return digest(marker.read_bytes())


def verify(root, portal, revision, expected=None):
    root = Path(root)
    require(not (root / "_alsm").is_symlink() and not (root / MARKER).is_symlink(), "Symlink marker rejected")
    raw = (root / MARKER).read_bytes()
    require(len(raw) < 2 * 1024 * 1024, "Oversized release manifest")
    require(expected is None or digest(raw) == expected, "Artifact manifest digest mismatch")
    data = json.loads(raw)
    require(data.get("schema") == 1 and data.get("portal") == portal and data.get("revision") == revision,
            "Artifact release identity mismatch")
    require(data.get("files") == file_map(root), "Artifact files/digests mismatch")
    return data


def origin(url):
    parsed = urlsplit(url)
    require(parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password,
            "Production URL must be an HTTPS origin without credentials")
    require(parsed.port in (None, 443) and parsed.path in ("", "/") and not parsed.query and not parsed.fragment,
            "Production URL must not contain a path, query, fragment or nonstandard port")
    return url.rstrip("/")


def fetch(url):
    # No redirects, TLS bypass, shell expansion, proxy credentials or localhost fallback.
    return subprocess.run(["curl", "--fail", "--silent", "--show-error", "--proto", "=https",
                           "--connect-timeout", "5", "--max-time", "20", "--retry", "1",
                           "--max-filesize", str(MAX_BYTES), "--header", "Cache-Control: no-cache", url],
                          check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def check_https(url, release):
    marker = (release / MARKER).read_bytes()
    data = json.loads(marker)
    query = "?alsm_check=" + uuid.uuid4().hex
    require(fetch(url + "/" + MARKER + query) == marker, "HTTPS is serving a different release manifest")
    require(digest(fetch(url + "/" + query)) == data["files"]["index.html"], "HTTPS index differs from release")
    # A marker alone cannot prove the asset paths in the new build are being served.
    for name, expected in data["files"].items():
        if name.endswith((".js", ".css")):
            require(digest(fetch(url + "/" + quote(name, safe="/") + query)) == expected,
                    "HTTPS asset differs from release: " + name)
    health = json.loads(fetch(url + "/api/v1/health" + query))
    require(health.get("status") == "ok", "Backend HTTPS health is not ok")


def atomic_json(path, value):
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex)
    try:
        with temporary.open("x", encoding="utf-8") as handle:
            json.dump(value, handle)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        descriptor = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
    finally:
        temporary.unlink(missing_ok=True)


def switch(base, target, name="current"):
    temporary = base / ("." + name + "." + uuid.uuid4().hex)
    try:
        temporary.symlink_to(target)
        os.replace(temporary, base / name)
    finally:
        temporary.unlink(missing_ok=True)


def make_readonly(root):
    for item in root.rglob("*"):
        item.chmod(0o555 if item.is_dir() else 0o444)
    root.chmod(0o555)


def remove_release(path):
    require(not path.is_symlink() and path.is_dir(), "Refusing to remove non-release directory")
    for item in path.rglob("*"):
        require(not item.is_symlink(), "Refusing to clean a symlink")
        if item.is_dir():
            item.chmod(0o755)
    path.chmod(0o755)
    shutil.rmtree(path)


class Deployer:
    def __init__(self, base, portal, url, checker=check_https, keep=5, expected_origins=None):
        self.base = Path(base).resolve(strict=True)
        self.portal = portal
        self.url = origin(url)
        self.checker = checker
        self.keep = keep
        self.expected_origins = expected_origins
        self.journal = self.base / ".transaction.json"

    @contextlib.contextmanager
    def lock(self, blocking=True):
        import fcntl  # Linux only; build stamping also works on other platforms.
        with (self.base / ".deploy.lock").open("a") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX | (0 if blocking else fcntl.LOCK_NB))
            yield

    def target(self, name="current"):
        link = self.base / name
        require(link.is_symlink(), "Bootstrap incomplete: missing " + name + " symlink")
        return self.checked_target(link.resolve(strict=True))

    def checked_target(self, target):
        target = Path(target)
        require(target.parent == self.base and not target.is_symlink() and target.is_dir(), "Release escapes portal root")
        require(SHA.fullmatch(target.name) or target.name == "initial", "Invalid release directory")
        verify(target, self.portal, target.name)
        return target

    def recover(self):
        if not self.journal.exists():
            return
        data = json.loads(self.journal.read_text(encoding="utf-8"))
        previous = self.checked_target(self.base / data["previous"])
        require(SHA.fullmatch(data["candidate"]) or data["candidate"] == "initial", "Invalid interrupted candidate")
        candidate = self.base / data["candidate"]
        # A power loss may have damaged the NEW release. Never require it to be healthy to restore the old one.
        current_link = self.base / "current"
        require(current_link.is_symlink(), "Missing current link during recovery")
        current = current_link.resolve()
        require(current in (candidate, previous), "Unrecognized current release; inspect transaction manually")
        if current == candidate:
            switch(self.base, previous)
        self.checker(self.url, previous)
        self.journal.unlink()
        print("Recovered prior release:", previous.name, flush=True)

    def activate(self, candidate):
        previous = self.target()
        self.checker(self.url, previous)  # Don't start a deployment on an unhealthy baseline.
        if candidate == previous:
            print("Already serving verified release:", candidate.name, flush=True)
            return
        atomic_json(self.journal, {"previous": previous.name, "candidate": candidate.name})
        try:
            switch(self.base, candidate)
            self.checker(self.url, candidate)
        except BaseException:
            # Roll back even for TERM/INT, after an atomic switch or during HTTPS verification.
            switch(self.base, previous)
            try:
                self.checker(self.url, previous)
                self.journal.unlink()
                print("ROLLBACK VERIFIED:", previous.name, flush=True)
            except BaseException:
                print("::error::Prior symlink restored; HTTPS recovery needs operator attention", flush=True)
            raise
        switch(self.base, previous, "previous")
        self.journal.unlink()
        print("DEPLOY VERIFIED:", self.portal, candidate.name, flush=True)

    def deploy(self, artifact, revision, expected):
        require(SHA.fullmatch(revision), "Expected full commit SHA")
        require(re.fullmatch(r"[0-9a-f]{64}", expected), "Expected SHA256 manifest digest")
        manifest = verify(artifact, self.portal, revision, expected)
        require(self.expected_origins is None or manifest.get("origins") == self.expected_origins,
                "Artifact production origins differ from administrator-verified config")
        with self.lock():
            self.recover()
            candidate = self.base / revision
            if candidate.exists() or candidate.is_symlink():
                self.checked_target(candidate)
                verify(candidate, self.portal, revision, expected)  # Never rewrite an existing SHA release.
            else:
                staging = Path(tempfile.mkdtemp(prefix=".staging-", dir=self.base))
                try:
                    shutil.copytree(artifact, staging, dirs_exist_ok=True)
                    verify(staging, self.portal, revision, expected)
                    make_readonly(staging)
                    os.rename(staging, candidate)
                finally:
                    if staging.exists():
                        remove_release(staging)
            self.activate(candidate)
            # Cleanup failure cannot retroactively turn a healthy deployment into a failed one.
            try:
                self.prune()
            except Exception as error:
                print("::warning::Release cleanup deferred:", type(error).__name__, flush=True)

    def rollback(self, revision):
        require(SHA.fullmatch(revision) or revision == "initial", "Invalid rollback revision")
        with self.lock():
            self.recover()
            self.activate(self.checked_target(self.base / revision))

    def prune(self):
        protected = {self.target(), self.base / "initial"}
        if (self.base / "previous").is_symlink():
            protected.add(self.target("previous"))
        releases = sorted((p for p in self.base.iterdir() if SHA.fullmatch(p.name) and p.is_dir()
                           and not p.is_symlink()), key=lambda p: p.stat().st_mtime, reverse=True)
        protected.update(releases[:self.keep])
        for item in releases:
            if item not in protected:
                remove_release(item)
        # Interrupted copies never had a current link and can be removed after one day.
        for item in self.base.glob(".staging-*"):
            if item.is_dir() and not item.is_symlink() and item.stat().st_mtime < time.time() - 86400:
                remove_release(item)


def load_config(path):
    path = Path(path)
    info = path.stat()
    require(info.st_uid == 0 and not info.st_mode & (stat.S_IWGRP | stat.S_IWOTH), "Config must be root-owned and not group/world writable")
    require(not path.is_symlink(), "Config cannot be a symlink")
    data = json.loads(path.read_text(encoding="utf-8"))
    require(set(data["urls"]) == set(PORTALS), "Config must define all three portal origins")
    for url in data["urls"].values():
        origin(url)
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["stamp", "deploy", "rollback", "recover"])
    parser.add_argument("--portal", choices=PORTALS)
    parser.add_argument("--revision")
    parser.add_argument("--artifact", type=Path)
    parser.add_argument("--manifest-sha")
    args = parser.parse_args()
    if args.command == "stamp":
        urls = {p: origin(os.environ["ALSM_" + p.upper() + "_URL"]) for p in PORTALS}
        print("manifest-sha=" + stamp(args.artifact, args.portal, args.revision, urls))
        return
    config = load_config("/etc/alsm-deploy/portals.json")
    portals = [args.portal] if args.portal else list(PORTALS)
    for portal in portals:
        tool = Deployer(Path("/var/www/alsm/releases") / portal, portal, config["urls"][portal],
                        expected_origins=config["urls"])
        if args.command == "recover":
            try:
                with tool.lock(blocking=False):
                    tool.recover()
            except BlockingIOError:
                pass  # An active deployment owns the transaction, so don't interfere.
        elif args.command == "deploy":
            require(args.portal, "A portal must be specified")
            require(os.environ.get("GITHUB_REPOSITORY") == "ALSM-Project/" + PORTALS[portal], "Unexpected repository")
            require(os.environ.get("GITHUB_REF") == "refs/heads/develop", "Only develop may deploy")
            require(os.environ.get("GITHUB_EVENT_NAME") in ("push", "workflow_dispatch"), "Untrusted deployment event")
            require(os.environ.get("GITHUB_SHA") == args.revision, "Revision differs from workflow commit")
            tool.deploy(args.artifact, args.revision, args.manifest_sha)
        else:
            require(args.portal, "A portal must be specified")
            tool.rollback(args.revision)


if __name__ == "__main__":
    def interrupted(signum, frame):
        raise RuntimeError("Deployment interrupted by signal " + str(signum))
    for number in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(number, interrupted)
    try:
        main()
    except Exception as error:
        # Do not print curl stderr, response bodies, tokens or environment variables.
        print("::error::" + str(error), file=sys.stderr)
        sys.exit(1)
