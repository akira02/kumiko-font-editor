export const FONTTOOLS_COMPILER_PYTHON = `
import traceback
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString


def kumiko_compile_fea(input_path, fea_path, output_path, affected_tables=None, *unused_args):
    try:
        font = TTFont(input_path)
        for table_tag in affected_tables or []:
            if table_tag in font:
                del font[table_tag]

        with open(fea_path, "r", encoding="utf-8") as feature_file:
            feature_text = feature_file.read()

        addOpenTypeFeaturesFromString(font, feature_text)
        font.save(output_path)

        return {
            "ok": True,
            "message": "fontTools compiled OpenType features.",
            "rawCompilerOutput": "fontTools compiled OpenType features.",
        }
    except Exception as error:
        raw_output = traceback.format_exc()
        return {
            "ok": False,
            "message": str(error),
            "rawCompilerOutput": raw_output,
        }
`
