"""Export the inspected slide renders as a portable PDF. Editable source is PPTX."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

root = Path(__file__).resolve().parents[2]
slides = root / "output/pitch-v2"
destination = slides / "plainsign-pitch-v2.pdf"
if destination.exists():
    raise SystemExit("Preserve the existing PDF. Choose a new revision filename first.")
pdf = canvas.Canvas(str(destination), pagesize=(960, 540))
pdf.setTitle("PlainSign - Mohamed Adib")
pdf.setAuthor("Mohamed Adib")
for index in range(1, 9):
    pdf.drawImage(ImageReader(slides / f"slide-{index:02}.png"), 0, 0, 960, 540)
    pdf.showPage()
pdf.save()
print(destination)
