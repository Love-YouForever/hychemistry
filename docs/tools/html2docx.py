"""把技术文档 HTML 转换为排版规范的 Word 文档。

用法::

    python docs/tools/html2docx.py
    python docs/tools/html2docx.py 源.html 目标.docx

依赖：python-docx、beautifulsoup4、lxml
"""

import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "技术文档.html"
TARGET = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "docs" / "技术文档.docx"

INK = RGBColor(0x1C, 0x27, 0x33)
DEEP = RGBColor(0x0B, 0x3A, 0x52)
ACCENT = RGBColor(0x2E, 0xA8, 0xC4)
MUTED = RGBColor(0x6B, 0x8E, 0x9F)
CODE = RGBColor(0x0F, 0x5A, 0x72)

FONT_CN = "等线"
FONT_HEI = "微软雅黑"
FONT_MONO = "Consolas"


# ---------------------------------------------------------------- 底层工具
def set_run_font(run, name=FONT_CN, size=10.5, bold=False, color=INK, mono=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = color
    rpr = run._element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.append(fonts)
    actual = FONT_MONO if mono else name
    for key in ("w:eastAsia", "w:ascii", "w:hAnsi"):
        fonts.set(qn(key), actual)


def shade(paragraph, hex_color):
    pr = paragraph._element.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hex_color)
    pr.append(shd)


def shade_cell(cell, hex_color):
    pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hex_color)
    pr.append(shd)


def paragraph_border(paragraph, side, hex_color, size):
    pr = paragraph._element.get_or_add_pPr()
    borders = pr.find(qn("w:pBdr"))
    if borders is None:
        borders = OxmlElement("w:pBdr")
        pr.append(borders)
    node = OxmlElement(f"w:{side}")
    node.set(qn("w:val"), "single")
    node.set(qn("w:sz"), str(size))
    node.set(qn("w:space"), "6")
    node.set(qn("w:color"), hex_color)
    borders.append(node)


def add_field(paragraph, field_code):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = field_code
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for node in (begin, instr, separate, text, end):
        run._r.append(node)


# ---------------------------------------------------------------- 文档初始化
def init_document():
    doc = Document()

    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.4)
    section.bottom_margin = Cm(2.2)
    section.left_margin = Cm(2.6)
    section.right_margin = Cm(2.6)

    normal = doc.styles["Normal"]
    normal.font.name = FONT_CN
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    normal.paragraph_format.line_spacing = 1.55
    normal.paragraph_format.space_after = Pt(5)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_CN)

    hp = section.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    set_run_font(hp.add_run("元素幻语 · 技术文档"), size=8.5, color=MUTED)

    fp = section.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_run_font(fp.add_run("— "), size=9, color=MUTED)
    add_field(fp, "PAGE")
    set_run_font(fp.add_run(" —"), size=9, color=MUTED)

    return doc


# ---------------------------------------------------------------- 封面与目录
def build_cover(doc):
    for _ in range(4):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_run_font(p.add_run("2026 传智杯 · 参赛作品技术文档"), size=10, color=ACCENT)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(26)
    set_run_font(p.add_run("元素幻语"), FONT_HEI, 40, bold=True, color=DEEP)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_run_font(p.add_run("3D 沉浸式化学学习平台 · AI 化学助教 Agent"), size=13, color=MUTED)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    set_run_font(p.add_run("ELEMENT WHISPER"), size=9, color=ACCENT, mono=True)

    for _ in range(5):
        doc.add_paragraph()

    rows = [
        ("作品名称", "元素幻语（Element Whisper）"),
        ("作品类型", "AI 原生 Web 应用 / 教育科技"),
        ("技术栈", "HTML5 · CSS3 · JavaScript · Three.js · MediaPipe · Python Flask · 大模型 Agent"),
        ("文档版本", "v1.2"),
    ]
    table = doc.add_table(rows=len(rows), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for index, (label, value) in enumerate(rows):
        cells = table.rows[index].cells
        cells[0].width = Cm(3.2)
        cells[1].width = Cm(11)
        set_run_font(cells[0].paragraphs[0].add_run(label), size=10, color=MUTED)
        set_run_font(cells[1].paragraphs[0].add_run(value), size=10, bold=True, color=DEEP)

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_run_font(p.add_run("ELEMENT WHISPER · TECHNICAL DOCUMENT"), size=8, color=MUTED, mono=True)
    doc.add_page_break()


def build_toc(doc, chapters):
    p = doc.add_paragraph()
    set_run_font(p.add_run("目录"), FONT_HEI, 18, bold=True, color=DEEP)
    paragraph_border(p, "bottom", "2EA8C4", 12)

    for index, title in enumerate(chapters, start=1):
        item = doc.add_paragraph()
        item.paragraph_format.space_before = Pt(7)
        set_run_font(item.add_run(f"{index:02d}   "), size=10, bold=True, color=ACCENT, mono=True)
        set_run_font(item.add_run(title), size=11, color=DEEP)

    doc.add_page_break()


# ---------------------------------------------------------------- 内容渲染
def add_heading(doc, text, level):
    p = doc.add_paragraph(style=f"Heading {min(level, 3)}")
    p.paragraph_format.first_line_indent = Pt(0)

    if level == 1:
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(12)
        set_run_font(p.add_run(text), FONT_HEI, 17, bold=True, color=DEEP)
        paragraph_border(p, "bottom", "2EA8C4", 12)
    elif level == 2:
        p.paragraph_format.space_before = Pt(13)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.left_indent = Cm(0.15)
        paragraph_border(p, "left", "2EA8C4", 14)
        set_run_font(p.add_run(text), FONT_HEI, 12.5, bold=True, color=RGBColor(0x12, 0x61, 0x7D))
    else:
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(3)
        set_run_font(p.add_run(text), FONT_HEI, 10.5, bold=True, color=RGBColor(0x1C, 0x4F, 0x66))
    return p


def add_rich_text(paragraph, node, size=10.5):
    for child in node.children:
        if isinstance(child, NavigableString):
            text = str(child)
            if text.strip():
                set_run_font(paragraph.add_run(text), size=size)
        elif isinstance(child, Tag):
            if child.name == "b":
                set_run_font(paragraph.add_run(child.get_text()), size=size, bold=True, color=DEEP)
            elif child.name == "code":
                set_run_font(paragraph.add_run(child.get_text()), size=size - 0.5, color=CODE, mono=True)
            elif child.name == "br":
                paragraph.add_run().add_break()
            else:
                add_rich_text(paragraph, child, size)


def add_paragraph(doc, node):
    p = doc.add_paragraph()
    add_rich_text(p, node)
    return p


def add_list(doc, node, ordered=False):
    for index, li in enumerate(node.find_all("li", recursive=False), start=1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.75)
        p.paragraph_format.space_after = Pt(3)
        marker = f"{index}. " if ordered else "• "
        set_run_font(p.add_run(marker), size=10.5, bold=ordered, color=ACCENT)
        add_rich_text(p, li)


def add_table(doc, node):
    headers = [th.get_text(strip=True) for th in node.select("thead th")]
    rows = node.select("tbody tr")
    if not headers:
        return

    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    for col, text in enumerate(headers):
        cell = table.rows[0].cells[col]
        shade_cell(cell, "EAF6FA")
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_after = Pt(1)
        set_run_font(paragraph.add_run(text), FONT_HEI, 9, bold=True, color=DEEP)

    for row_index, tr in enumerate(rows, start=1):
        for col_index, td in enumerate(tr.find_all("td")):
            if col_index >= len(headers):
                break
            paragraph = table.rows[row_index].cells[col_index].paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(1)
            add_rich_text(paragraph, td, size=8.8)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_code_block(doc, node):
    for line in node.get_text().split("\n"):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.4)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        shade(p, "0D1F2B")
        set_run_font(
            p.add_run(line if line else " "),
            size=8,
            color=RGBColor(0xCF, 0xE9, 0xF5),
            mono=True,
        )
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_note(doc, node, warn=False):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.3)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    shade(p, "FFFAF0" if warn else "F0F9FC")
    paragraph_border(p, "left", "E0A63C" if warn else "2EA8C4", 18)
    add_rich_text(p, node, size=9.5)


def add_arch(doc, node):
    rows = node.select(".arch-row")
    labels = node.select(".arch-label")
    if not rows:
        return

    table = doc.add_table(rows=len(rows) + len(labels), cols=1)
    table.style = "Table Grid"
    cursor = 0
    for index, label in enumerate(labels):
        cell = table.rows[cursor].cells[0]
        shade_cell(cell, "F4FAFC")
        set_run_font(cell.paragraphs[0].add_run(label.get_text(strip=True)), size=7.5, color=MUTED, mono=True)
        cursor += 1
        if index < len(rows):
            boxes = rows[index].select(".arch-box")
            text = "　│　".join(box.get_text(" ", strip=True) for box in boxes)
            cell = table.rows[cursor].cells[0]
            set_run_font(cell.paragraphs[0].add_run(text), size=8.2, color=DEEP)
            cursor += 1

    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_metrics(doc, node):
    items = node.select(".metric")
    if not items:
        return

    table = doc.add_table(rows=2, cols=len(items))
    table.style = "Table Grid"
    for index, item in enumerate(items):
        value = item.find("b")
        label = item.find("span")
        shade_cell(table.rows[0].cells[index], "F0F9FC")
        top = table.rows[0].cells[index].paragraphs[0]
        top.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_run_font(top.add_run(value.get_text(strip=True) if value else ""), FONT_HEI, 13, bold=True, color=RGBColor(0x0B, 0x5D, 0x78))
        bottom = table.rows[1].cells[index].paragraphs[0]
        bottom.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_run_font(bottom.add_run(label.get_text(strip=True) if label else ""), size=8, color=MUTED)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_figure(doc, node, width_cm=9.5):
    img = node.find("img")
    if img is None:
        return

    src = img.get("src", "")
    path = (SOURCE.parent / src).resolve()
    if not path.is_file():
        print(f"警告: 找不到图片 {path}")
        return

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(path), width=Cm(width_cm))

    caption = node.find("figcaption")
    if caption:
        cp = doc.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_after = Pt(8)
        set_run_font(cp.add_run(caption.get_text(" ", strip=True)), size=8.5, color=MUTED)


def render_section(doc, section):
    for child in section.children:
        if not isinstance(child, Tag):
            continue

        classes = child.get("class") or []

        if child.name == "h2":
            add_heading(doc, child.get_text(" ", strip=True), 1)
        elif child.name == "h3":
            add_heading(doc, child.get_text(strip=True), 2)
        elif child.name == "h4":
            add_heading(doc, child.get_text(strip=True), 3)
        elif child.name == "p":
            add_paragraph(doc, child)
        elif child.name in ("ul", "ol"):
            add_list(doc, child, ordered=(child.name == "ol"))
        elif child.name == "table":
            add_table(doc, child)
        elif child.name == "pre":
            add_code_block(doc, child)
        elif child.name == "figure":
            add_figure(doc, child, 11 if "wide" in classes else 7.2)
        elif child.name == "div":
            if "arch" in classes:
                add_arch(doc, child)
            elif "metrics" in classes:
                add_metrics(doc, child)
            elif "figure-row" in classes:
                for figure in child.find_all("figure", recursive=False):
                    add_figure(doc, figure, 6.8)
            elif "note" in classes:
                add_note(doc, child)
            elif "warn" in classes:
                add_note(doc, child, warn=True)
            elif "sign" in classes:
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(20)
                set_run_font(p.add_run(child.get_text(strip=True)), size=9, color=MUTED)
            else:
                render_section(doc, child)


def main():
    soup = BeautifulSoup(SOURCE.read_text(encoding="utf-8"), "lxml")
    sections = soup.find_all("section")

    chapters = []
    for section in sections:
        h2 = section.find("h2")
        if h2:
            raw = h2.get_text(" ", strip=True)
            chapters.append(raw.split(" ", 1)[1] if raw[:2].isdigit() else raw)

    doc = init_document()
    build_cover(doc)
    build_toc(doc, chapters)

    for index, section in enumerate(sections):
        if index > 0:
            doc.add_page_break()
        render_section(doc, section)

    doc.save(TARGET)
    print(f"已生成: {TARGET}")
    print(f"章节 {len(chapters)} | 段落 {len(doc.paragraphs)} | 表格 {len(doc.tables)}")


if __name__ == "__main__":
    main()

