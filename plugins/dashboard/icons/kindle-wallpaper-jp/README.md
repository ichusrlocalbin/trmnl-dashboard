# Icons from kindle-wallpaper-jp

These SVGs are copied unchanged from
[ichusrlocalbin/kindle-wallpaper-jp](https://github.com/ichusrlocalbin/kindle-wallpaper-jp)
(`wallpaper-server/icons/`), which takes them from
[pjimenezmateo/kindle-wallpaper](https://github.com/pjimenezmateo/kindle-wallpaper). They are licensed
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

File names are OpenWeatherMap condition codes. The dashboard inlines them as SVG symbols in
`../../src/shared.liquid`, because TRMNL renders the markup without access to other files:

| Symbol | File | Change |
|---|---|---|
| `wx-cloudy` | 500d.svg | only the cloud outline, without the rain |
| `wx-thunder` | 211d.svg | none |

The sun, the umbrella (rain) and the snowman (snow) are drawn in `shared.liquid` itself. 800d.svg is a
filled disc, too heavy on the screen, and rain and snow follow JMA's umbrella and snowman.
