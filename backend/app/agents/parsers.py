from typing import Literal
from pypdf import PdfReader


class ParserAgent:
    def parse_pdf(self, file_path: str) -> list[str]:
        reader = PdfReader(file_path)
        return [page.extract_text() for page in reader.pages if page.extract_text()]

    def parse_txt(self, file_path: str) -> list[str]:
        with open(file_path, "r", encoding="utf-8") as file:
            return [file.read()]

    def parse(self, file_path: str, file_type: Literal["pdf", "txt"]) -> list[str]:
        if file_type == "pdf":
            return self.parse_pdf(file_path)
        return self.parse_txt(file_path)
