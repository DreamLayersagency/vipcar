<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>VIPCAR Sitemap</title>
        <style>
          :root { color-scheme: light; font-family: Manrope, Arial, sans-serif; background: #f4f1e8; color: #18201b; }
          body { margin: 0; }
          main { max-width: 1180px; margin: 0 auto; padding: 48px 24px 64px; }
          .eyebrow { margin: 0 0 10px; color: #66816d; font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
          h1 { margin: 0; font: 400 clamp(36px, 5vw, 64px)/1.05 Georgia, serif; }
          .intro { max-width: 680px; margin: 18px 0 30px; color: #5f6a61; line-height: 1.6; }
          .summary { display: inline-flex; gap: 8px; align-items: center; margin-bottom: 22px; padding: 9px 13px; border: 1px solid #d8d5c9; border-radius: 999px; background: #fffdf8; font-size: 13px; }
          .summary strong { color: #b35d3e; }
          .table-wrap { overflow-x: auto; border: 1px solid #d8d5c9; border-radius: 14px; background: #fffdf8; box-shadow: 0 14px 38px #27382b12; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th, td { padding: 15px 18px; border-bottom: 1px solid #ebe8df; vertical-align: top; }
          th { background: #eff2e9; color: #526557; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
          tr:last-child td { border-bottom: 0; }
          td { font-size: 14px; }
          a { color: #315d45; text-decoration: none; }
          a:hover { color: #b35d3e; text-decoration: underline; }
          .url { min-width: 310px; word-break: break-word; }
          .alternate { display: inline-block; margin: 0 12px 5px 0; font-size: 13px; }
          .alternate span { color: #879189; font-size: 11px; text-transform: uppercase; }
          footer { margin-top: 20px; color: #7b837c; font-size: 12px; }
        </style>
      </head>
      <body>
        <main>
          <p class="eyebrow">VIPCAR Tunisia</p>
          <h1>XML Sitemap</h1>
          <p class="intro">This sitemap lists the public pages available to search engines, including their language alternatives.</p>
          <div class="summary"><strong><xsl:value-of select="count(sm:urlset/sm:url)"/></strong> public URLs</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Page URL</th><th>Language alternatives</th></tr>
              </thead>
              <tbody>
                <xsl:for-each select="sm:urlset/sm:url">
                  <tr>
                    <td class="url"><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
                    <td>
                      <xsl:for-each select="xhtml:link">
                        <a class="alternate" href="{@href}"><span><xsl:value-of select="@hreflang"/></span> <xsl:value-of select="@href"/></a>
                      </xsl:for-each>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          <footer>The underlying document remains standards-compliant XML for crawlers.</footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
