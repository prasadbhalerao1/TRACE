"""Issuer Lookup Agent — doc 06 §4, "rules + httpx". FR-1.

The `certifications` table (Module 01) has no `verification_url` column, so a small
curated map of known issuers -> verification-URL templates is used to construct one from
`credential_id` where the issuer is recognized. Unrecognized issuers or a missing
credential_id fall through to the Visual Forensics branch (`nodes/cert_verdict.py`'s
conditional edge) — this is exactly doc 06 §4's "no API/URL" path, not an error.
"""

import httpx

# Tunable, hand-maintained — a 48-hour build can't integrate every issuer's real
# verification API, so this covers a few common ones by URL-template pattern. Extending
# this dict is the only code change needed to support a new issuer.
_ISSUER_VERIFY_URL_TEMPLATES: dict[str, str] = {
    "coursera": "https://www.coursera.org/verify/{credential_id}",
    "freecodecamp": "https://www.freecodecamp.org/certification/{credential_id}",
    "aws": "https://cp.certmetrics.com/amazon/en/public/verify/credential/{credential_id}",
    "credly": "https://www.credly.com/badges/{credential_id}",
    "udemy": "https://www.udemy.com/certificate/{credential_id}",
    "hackerrank": "https://www.hackerrank.com/certificates/{credential_id}",
}


def resolve_verification_url(issuer: str | None, credential_id: str | None) -> str | None:
    if not issuer or not credential_id:
        return None
    key = issuer.strip().lower()
    template = next((tmpl for name, tmpl in _ISSUER_VERIFY_URL_TEMPLATES.items() if name in key), None)
    if template is None:
        return None
    return template.format(credential_id=credential_id)


async def lookup_issuer(issuer: str | None, credential_id: str | None) -> dict:
    """Returns {resolvable: bool, verification_url, http_status, evidence}. Never raises
    — a network failure degrades to `resolvable: False` (routes to Visual Forensics)
    rather than blocking the check, matching every other module's "typed unavailable,
    never fabricate" pattern applied here as "never silently treat a network hiccup as
    a positive verification"."""
    url = resolve_verification_url(issuer, credential_id)
    if url is None:
        return {
            "resolvable": False,
            "verification_url": None,
            "http_status": None,
            "evidence": f"No known verification URL template for issuer '{issuer}' (or missing credential ID).",
        }

    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            response = await client.get(url)
        return {
            "resolvable": True,
            "verification_url": url,
            "http_status": response.status_code,
            "evidence": f"Fetched {url} -> HTTP {response.status_code}.",
            "page_text_sample": response.text[:2000] if response.status_code == 200 else "",
        }
    except httpx.HTTPError as exc:
        return {
            "resolvable": False,
            "verification_url": url,
            "http_status": None,
            "evidence": f"Could not reach issuer verification page ({url}): {exc}.",
        }
