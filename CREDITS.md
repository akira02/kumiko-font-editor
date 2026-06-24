========================================================================
Third-Party Software Licenses
========================================================================
This project contains code from the following open-source projects:

1. PUAExt-Regular font (`public/fonts/PUAExt-Regular.woff2`)

萃取自 WFG 的全宋體，其字型主要收錄自全字庫宋體等。
適用政府資料開放授權條款－第1版。

2. [GlyphWiki](https://glyphwiki.org/)

`public/glyphwiki/composition.txt` is derived from the GlyphWiki dump
(`https://glyphwiki.org/dump.tar.gz`) by `scripts/build-glyphwiki-data.mjs`.
Per the GlyphWiki license, the data may be freely used, modified, and
redistributed by anyone, including commercial use, with no attribution
required (https://glyphwiki.org/wiki/GlyphWiki:License).

3. [BabelStone IDS Database](https://www.babelstone.co.uk/CJK/IDS.HTML)

`public/ids/ids_babelstone.txt` is derived from IDS.TXT maintained by
Andrew West (BabelStone), converted by `scripts/build-ids-data.mjs`.
The author states that the IDS data is a collection of facts not eligible
for copyright protection, and explicitly permits unrestricted personal and
commercial use.

4. [Public Sans](https://github.com/uswds/public-sans) (`test/fixtures/otf/PublicSans-Regular.otf`)

Used only as a fixture for the OTF import/export round-trip test.
Licensed under the SIL Open Font License 1.1 (see `test/fixtures/otf/OFL.txt`).

5. [Open Source Font (these characteristics)](https://github.com/eliheuer/open-source-font-with-these-characteristics) (`test/fixtures/ufo/OpenSourceFont-Light.ufo`)

A minimal demonstration UFO used only as a fixture for the UFO round-trip test.
Licensed under the SIL Open Font License 1.1 (see `test/fixtures/ufo/OFL.txt`).

6. [Noto Sans CJK](https://github.com/notofonts/noto-cjk)

`public/quality-reference/noto-sans-cjk-tc-regular-radar-residuals.json`
contains geometric residual data derived from Noto Sans CJK TC Regular by
`scripts/build-quality-reference-data.mjs`. The Noto Sans CJK fonts are
licensed under the SIL Open Font License 1.1.
