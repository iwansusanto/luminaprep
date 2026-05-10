from pypdf import PdfReader


def pdf_parser(file_path: str) -> list[str]:
    reader = PdfReader(file_path)
    return [page.extract_text() for page in reader.pages if page.extract_text()]


def txt_parser(file_path: str) -> list[str]:
    with open(file_path, "r", encoding="utf-8") as file:
        return [file.read()]
