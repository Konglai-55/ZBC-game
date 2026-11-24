"""Aggregate ZBC's Nginx access logs without keeping individual request records."""

import argparse
from collections import Counter
from datetime import datetime, timedelta, timezone
from functools import lru_cache
import gzip
import json
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import urlsplit

TZ = timezone(timedelta(hours=8))
HOSTS = {"zbcyx.com", "www.zbcyx.com"}
LINE = re.compile(
    r'^\S+ \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d{3}) (\d+) "([^"]*)" "([^"]*)" '
    r'host="([^"]+)" rt="([\d.]+)"'
)
FILE = re.compile(r"access\.log(?:\.\d+(?:\.gz)?)?")
PAGE = re.compile(
    r"^/(?:about|copyright|infringement|search|games/[a-zA-Z0-9_-]+|"
    r"(?:category|resources|help)(?:/[a-zA-Z0-9_%-]+){0,2})$"
)
VIEW = re.compile(r"^/api/games/[a-zA-Z0-9_-]+/view$")
BOT = re.compile(
    r"bot\b|crawler|spider|slurp|headless|phantomjs|lighthouse|preview|curl/|wget/|"
    r"uptime|monitor|python|node-fetch|go-http-client|facebookexternalhit|bytespider|"
    r"semrush|ahrefs|yandex|petal|scrapy|httpclient|chatgpt-user|zgrab|censys",
    re.I,
)
MOBILE = re.compile(r"Mobile|Android|iPhone|iPad", re.I)
TABLES = ("pages", "sources", "devices", "statuses")


@lru_cache(maxsize=1024)
def local_time(hour_stamp):
    return datetime.strptime(hour_stamp, "%d/%b/%Y:%H %z").astimezone(TZ)


def add(counter, key):
    # Keep memory bounded when arbitrary paths or referrers are sent to the site.
    if key in counter or len(counter) < 4000:
        counter[key] += 1
    else:
        counter["(other)"] += 1


def new_day():
    return {
        "requests": 0, "bytes": 0, "pageViews": 0, "viewReports": 0,
        "botRequests": 0, "clientErrors": 0, "serverErrors": 0,
        "requestSeconds": 0, "hours": [0] * 24,
        **{name: Counter() for name in TABLES},
    }


def source_domain(referer):
    try:
        host = urlsplit(referer).hostname
    except ValueError:
        return "(unknown)"
    if not host:
        return "(none)"
    if host in HOSTS:
        return "(internal)"
    return host if len(host) <= 253 and re.fullmatch(r"[a-z0-9.-]+", host) else "(unknown)"


def collect(log_directory):
    now = datetime.now(TZ)
    start = now.date() - timedelta(days=14)
    days = {}
    candidates = []
    for path in log_directory.iterdir():
        if FILE.fullmatch(path.name) and path.is_file():
            stat = path.stat()
            if datetime.fromtimestamp(stat.st_mtime, TZ).date() >= start:
                candidates.append((path, stat.st_dev, stat.st_ino))

    for path, device, inode in candidates:
        opener = gzip.open if path.suffix == ".gz" else open
        with opener(path, "rt", encoding="utf-8", errors="replace") as stream:
            actual = os.fstat(stream.fileno())
            if (actual.st_dev, actual.st_ino) != (device, inode):
                raise RuntimeError("Nginx logs rotated during collection")
            for line in stream:
                if 'host="zbcyx.com"' not in line and 'host="www.zbcyx.com"' not in line:
                    continue
                match = LINE.match(line)
                if not match:
                    continue
                stamp, request, raw_status, size, referer, agent, host, seconds = match.groups()
                if host not in HOSTS:
                    continue
                when = local_time(stamp[:14] + stamp[-6:])
                if not start <= when.date() <= now.date():
                    continue
                key = when.date().isoformat()
                if key not in days:
                    days[key] = new_day()
                day = days[key]
                status = int(raw_status)
                automated = bool(BOT.search(agent))
                day["requests"] += 1
                day["bytes"] += int(size)
                day["requestSeconds"] += float(seconds)
                day["clientErrors"] += 400 <= status < 500
                day["serverErrors"] += 500 <= status < 600
                day["botRequests"] += automated
                day["statuses"][raw_status] += 1
                parts = request.split()
                if len(parts) != 3 or not 200 <= status < 300:
                    continue
                method, target, _ = parts
                target_path, _, query = target.partition("?")
                target_path = target_path.rstrip("/") or "/"
                if method == "POST" and VIEW.fullmatch(target_path):
                    day["viewReports"] += 1
                if method != "GET" or automated or not agent.startswith("Mozilla/5.0"):
                    continue
                if len(target_path) > 250 or (target_path != "/" and not PAGE.fullmatch(target_path)):
                    continue
                if any(field.partition("=")[0] == "_rsc" for field in query.split("&")):
                    continue
                day["pageViews"] += 1
                day["hours"][when.hour] += 1
                add(day["pages"], target_path)
                add(day["sources"], source_domain(referer))
                day["devices"]["mobile" if MOBILE.search(agent) else "desktop"] += 1

    if not days:
        raise RuntimeError("No ZBC records found in the selected Nginx logs")
    return {"version": 1, "updatedAt": now.isoformat(), "days": days}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--logs", type=Path, default=Path("/var/log/nginx"))
    parser.add_argument("--output", type=Path, required=True)
    options = parser.parse_args()
    snapshot = collect(options.logs)
    output = options.output
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent, delete=False) as file:
        temporary = Path(file.name)
        try:
            json.dump(snapshot, file, separators=(",", ":"), ensure_ascii=False)
            file.flush()
            os.fchmod(file.fileno(), 0o640)
            os.chown(temporary, -1, output.parent.stat().st_gid)
            os.replace(temporary, output)
        finally:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
