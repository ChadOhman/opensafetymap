#!/usr/bin/env python3
"""Lightweight HTML checks that avoid external dependencies.

Validates baseline structure and labeling to catch regressions
when npm-based linters are unavailable in restricted networks.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Iterable, List, Optional


def fail(message: str) -> None:
    print(f"- {message}")


def exit_with_status(issues: List[str]) -> None:
    if issues:
        print("HTML checks found issues:")
        for item in issues:
            fail(item)
        sys.exit(1)
    print("HTML checks passed.")


@dataclass
class Node:
    tag: str
    attrs: Dict[str, str]
    text: str = ""
    children: List["Node"] = field(default_factory=list)
    parent: Optional["Node"] = None

    def add_child(self, child: "Node") -> None:
        self.children.append(child)
        child.parent = self


def walk(node: Node) -> Iterable[Node]:
    yield node
    for child in node.children:
        yield from walk(child)


def find_first(nodes: Iterable[Node], tag: str) -> Optional[Node]:
    return next((n for n in nodes if n.tag == tag), None)


def find_by_id(nodes: Iterable[Node], node_id: str) -> Optional[Node]:
    return next((n for n in nodes if n.attrs.get("id") == node_id), None)


class TreeBuilder(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.root = Node("root", {})
        self.stack: List[Node] = [self.root]
        self.doctype_seen = False

    def handle_decl(self, decl: str) -> None:
        if decl.lower().strip() == "doctype html":
            self.doctype_seen = True

    def handle_starttag(self, tag: str, attrs: List[tuple[str, str]]) -> None:
        node = Node(tag, dict(attrs))
        self.stack[-1].add_child(node)
        self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: List[tuple[str, str]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        while len(self.stack) > 1 and self.stack[-1].tag != tag:
            self.stack.pop()
        if len(self.stack) > 1:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.stack[-1].text += data.strip()


def check_document(path: Path) -> List[str]:
    parser = TreeBuilder()
    parser.feed(path.read_text(encoding="utf-8"))

    issues: List[str] = []
    nodes = list(walk(parser.root))

    html_el = find_first(nodes, "html")
    if not parser.doctype_seen:
        issues.append("Missing <!DOCTYPE html> declaration.")
    if not html_el:
        issues.append("Missing <html> element.")
    elif not html_el.attrs.get("lang"):
        issues.append("<html> element should declare a lang attribute.")

    head = find_first(nodes, "head")
    if not head:
        issues.append("Missing <head> element.")
    else:
        charset = next((n for n in walk(head) if n.tag == "meta" and n.attrs.get("charset")), None)
        viewport = next(
            (
                n
                for n in walk(head)
                if n.tag == "meta" and n.attrs.get("name") == "viewport"
            ),
            None,
        )
        if not charset:
            issues.append("Add a <meta charset> declaration for proper encoding.")
        if not viewport:
            issues.append("Add a responsive <meta name=\"viewport\"> tag.")

    label_for = {n.attrs["for"] for n in nodes if n.tag == "label" and "for" in n.attrs}
    form_controls = [n for n in nodes if n.tag in {"input", "select", "textarea"}]

    for control in form_controls:
        input_type = control.attrs.get("type", "").lower()
        if input_type == "hidden":
            continue
        control_id = control.attrs.get("id")
        if not control_id:
            issues.append(f"<{control.tag}> elements should include an id for labeling.")
            continue
        has_label = control_id in label_for or "aria-label" in control.attrs or "aria-labelledby" in control.attrs
        if not has_label:
            issues.append(f"Form control with id '{control_id}' is missing an associated label or aria-label.")

    live_regions = [n for n in nodes if n.attrs.get("aria-live")]
    if not live_regions:
        issues.append("Include at least one aria-live region to surface status updates.")

    return issues


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python tools/html_checks.py <html file> [<html file> ...]")
        sys.exit(1)

    collected_issues: List[str] = []
    for file_arg in sys.argv[1:]:
        path = Path(file_arg)
        if not path.exists():
            collected_issues.append(f"File not found: {file_arg}")
            continue
        issues = check_document(path)
        if issues:
            print(f"Issues in {file_arg}:")
            collected_issues.extend([f"{file_arg}: {issue}" for issue in issues])
    exit_with_status(collected_issues)


if __name__ == "__main__":
    main()
