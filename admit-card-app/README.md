# Admit Card Builder

A single-file web app that turns an exam schedule spreadsheet (CSV or Excel) into printable
"Card and Seating Information" admit cards, one A4 page per student. It runs entirely in the
browser: no server, no install, and the data never leaves the computer.

## Using it (exam office)

1. Open `index.html` in Chrome, Edge or Firefox (internet needed once, to load the spreadsheet
   and QR code libraries).
2. Drop your `.xlsx` or `.csv` file on **Exam data file**, or click **Load sample data** to try it.
3. Fill in **Exam details**: institution, campus, exam title. Under *Logo, photos and card
   wording* you can upload a logo, upload student photos (file named after the registration
   number, e.g. `FA23-BCS-014.jpg`), and edit the notice, seating note and the instructions.
   These settings are remembered in the browser.
4. **Print all cards** (or pick one student and **Print selected card**). Choose *Save as PDF* in
   the print dialog to get a PDF.

## Sharing with students

Click **Build student copy**. It downloads one HTML file with the schedule built in. Share it
(WhatsApp, email, LMS). A student opens it, types their registration number and prints their
own card. Students see only the card matching the number they enter, but the file does contain
everyone's schedule, so don't put anything in it that students shouldn't have.

## Data file format

One row per student per paper. Start from `admit-card-template.csv`.

| Column | Notes |
| --- | --- |
| Registration No | Required. Rows are grouped into students by this. |
| Name, Father Name, Program | Taken from the student's first row that has them. |
| Course Code, Course Title | |
| Date | Excel date, `04 Jun 2026`, `2026-06-04` or `04/06/2026` (day first). Printed as `04 Jun 2026 (Thu)`. |
| Time | Excel time, `01:15 PM` or `13:15`. |
| Room, Seat No | |
| Photo | Optional image URL. |

Header names are matched loosely (`Reg No`, `Roll No`, `Venue`, `Subject`, `Exam Date`, … all
work) and title rows above the header are skipped. Papers are sorted by date and time, and two
papers at the same date and time are highlighted as a clash.

An Excel workbook may include a sheet named **Settings** with `Key | Value` rows (`Institution`,
`Campus`, `Exam Title`, `Subtitle`, `Notice`, `Seating Note`, and one `Instruction` row per
instruction) so the whole exam setup travels in one file.
