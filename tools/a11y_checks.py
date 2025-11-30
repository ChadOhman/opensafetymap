#!/usr/bin/env python3
"""Accessibility smoke checks without external dependencies."""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Iterable, List, Optional


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

    def text_content(self) -> str:
        return " ".join(filter(None, [self.text] + [child.text_content() for child in self.children])).strip()


def walk(node: Node) -> Iterable[Node]:
    yield node
    for child in node.children:
        yield from walk(child)


def find_by_id(nodes: Iterable[Node], node_id: str) -> Optional[Node]:
    return next((n for n in nodes if n.attrs.get("id") == node_id), None)


def find_all(nodes: Iterable[Node], tag: str) -> List[Node]:
    return [n for n in nodes if n.tag == tag]


class TreeBuilder(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.root = Node("root", {})
        self.stack: List[Node] = [self.root]

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


def check_accessibility(path: Path) -> List[str]:
    parser = TreeBuilder()
    parser.feed(path.read_text(encoding="utf-8"))
    nodes = list(walk(parser.root))

    issues: List[str] = []

    main_region = next((n for n in nodes if n.tag == "main"), None)
    if not main_region:
        issues.append("Add a <main> landmark for primary content.")

    map_frame = find_by_id(nodes, "map")
    if not map_frame:
        issues.append("Map container with id 'map' is missing.")
    else:
        if not map_frame.attrs.get("aria-label"):
            issues.append("Map container should include an aria-label describing its purpose.")
        if not map_frame.attrs.get("role"):
            issues.append("Map container should declare a role for assistive tech.")

    location_status = find_by_id(nodes, "locationStatus")
    if not location_status:
        issues.append("Location status message element is missing.")
    else:
        if not location_status.attrs.get("aria-live"):
            issues.append("Location status should be announced via aria-live.")

    feedback = find_by_id(nodes, "formFeedback")
    if not feedback:
        issues.append("Form feedback region is missing.")
    else:
        if feedback.attrs.get("role") != "status":
            issues.append("Form feedback should use role='status'.")
        if not feedback.attrs.get("aria-live"):
            issues.append("Form feedback should set aria-live for announcements.")

    buttons = find_all(nodes, "button")
    for button in buttons:
        label = button.text_content() or button.attrs.get("aria-label", "")
        if not label:
            issues.append("Buttons must have discernible text or aria-label.")

    return issues


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python tools/a11y_checks.py <html file> [<html file> ...]")
        sys.exit(1)

    collected: List[str] = []
    for file_arg in sys.argv[1:]:
        path = Path(file_arg)
        if not path.exists():
            collected.append(f"File not found: {file_arg}")
            continue
        issues = check_accessibility(path)
        if issues:
            collected.extend([f"{file_arg}: {issue}" for issue in issues])
    if collected:
        print("Accessibility checks found issues:")
        for issue in collected:
            print(f"- {issue}")
        sys.exit(1)
    print("Accessibility checks passed.")


if __name__ == "__main__":
    main()
