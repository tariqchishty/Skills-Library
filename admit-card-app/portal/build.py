import sys, re
src_path, main_path, out_path = sys.argv[1:4]
src = open(src_path).read()
main = open(main_path).read()

def between(a, b):
    i = src.index(a); j = src.index(b, i)
    return src[i:j]

css = between(':root {', '/* ---------- Student lookup mode')
card_css = between('/* ---------- The admit card (paper) ---------- */', '/* ---------- Print:')
portal_css = '''
/* ---------- Portal ---------- */
.portal { max-width: 880px; margin: 0 auto; display: grid; gap: 18px; }
.p-head { display: flex; align-items: center; gap: 14px; }
.p-logo .c-logo { width: 52px; height: 52px; display: block; }
.p-titles { min-width: 0; }
.p-inst { color: var(--muted); font-size: 14px; }
.p-head h1 { font-size: clamp(22px, 4vw, 30px); font-weight: 700; letter-spacing: -0.01em; }
.lookup h2, .admin h2 { font-size: 18px; font-weight: 600; }
.lookup-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
.lookup-row .grow { flex: 1 1 240px; min-width: 0; }
.lookup-row input { font-family: var(--font-data); font-size: 16px; letter-spacing: 0.03em; padding: 10px 12px; }
.lookup-row .btn { padding: 10px 18px; font-size: 15px; }
.msg { margin: 0; font-size: 14px; }
.msg:empty { display: none; }
.msg.warn { color: var(--warn); }
.msg.ok { color: var(--ok); }
.admin { border-color: var(--accent); }
.admin-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px; }
.tag { font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-soft); border-radius: 99px; padding: 2px 10px; }
.admin-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
@media (max-width: 720px) { .admin-grid { grid-template-columns: minmax(0, 1fr); } }
.admin-col { display: grid; gap: 10px; align-content: start; min-width: 0; }
.publish-row { display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--line); padding-top: 12px; }
.confirm { display: grid; gap: 8px; border: 1px solid var(--warn); background: var(--warn-soft); border-radius: 6px; padding: 10px 12px; }
.confirm p { margin: 0; }
.result { display: grid; gap: 10px; min-width: 0; }
.result-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; font-weight: 600; }
.result .hint { margin: 0; }
.p-foot { color: var(--muted); font-size: 13px; text-align: center; margin: 0; }
.p-foot:empty { display: none; }
'''
full_css = css + portal_css
for chunk in (full_css, card_css):
    assert '`' not in chunk and '${' not in chunk and '\\' not in chunk

shared = '\n'.join([
    between('const DEFAULT_INSTRUCTIONS = [', 'const SETTINGS_FIELDS'),
    between('const ALIASES = {', 'let settings = loadSettings();'),
    between('const norm = ', 'function loadSettings()'),
    between('// ---------- Date & time parsing ----------', 'async function handleFile(file)'),
    between('const SAMPLE_CSV = `', 'function loadSample()'),
    between('function logoHTML() {', 'const PREVIEW_LIMIT'),
])
# Published page uses neutral defaults; the exam office types the institution's details.
for a, b in [('institution: "COMSATS University Islamabad",', 'institution: "Your University Name",'),
             ('campus: "Wah Campus",', 'campus: "Main Campus",'),
             (' (https://cuiwah.edu.pk/downloads.aspx)', '')]:
    assert shared.count(a) == 1, a
    shared = shared.replace(a, b)

main = main.replace('/*@@CSS@@*/', full_css).replace('/*@@CARD_CSS@@*/', card_css).replace('/*@@SHARED@@*/', shared)
assert '@@' not in main and '</script' not in main
page = ('<title>Admit Card Portal</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap">\n'
        '<script id="records" type="application/json">null</script>\n'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n'
        '<script>\n' + main + '\napp();\n</script>\n')
open(out_path, 'w').write(page)
print(len(page), 'bytes')
