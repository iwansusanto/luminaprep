from pathlib import Path

from app.agents.parsers import ParserAgent


def test_parser_reads_txt_file(tmp_path: Path):
    file_path = tmp_path / "material.txt"
    file_path.write_text("Materi QA untuk pengujian parser.", encoding="utf-8")

    pages = ParserAgent().parse(str(file_path), "txt")

    assert pages == ["Materi QA untuk pengujian parser."]
