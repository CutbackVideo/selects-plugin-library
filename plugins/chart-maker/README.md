# Chart Maker

Turn numbers into an editable chart in your Draft. Paste cells from Excel or Google Sheets, or load a CSV, pick a chart type, style it, and add it as a graphic clip you can update later.

## Make a chart

Open **Chart Maker** with a Project open.

1. **Data:** paste cells from Excel, Numbers, Google Sheets or a CSV, or load a `.csv`, `.tsv` or `.txt` file (comma, tab or semicolon separated, up to 1 MB). For `.xlsx`, copy the cells and paste them. The first column is the labels; each other column is a series. Numbers like `$12,400`, `12.5k`, `(3,200)`, `45%` and European formats such as `1.234,50` are read as numbers. Up to 60 rows and 6 series are charted; if a file has more, the app says which rows and series were left out.
2. **Chart type:** Bar, Horizontal bar, Line, Pie or Donut.
3. **AI design (optional):** add up to 4 reference images (a brand guide, a screenshot, a chart you like) and/or write instructions, then press **Design with AI**. The AI changes only the look (colors, fonts, layout, highlight, animation), never your data. For charts with Korean text it can also pick Korean fonts installed on the computer. **Undo AI changes** puts the previous look back. This may use Selects credits, or you can use the model selected in your chat.
4. **Design, Text, Motion:** saved styles, colors, a highlight for one bar or slice, background, gridlines, axes, bar width, corner radius, line and point style, donut hole, title, value labels (prefix, suffix, decimals, thousands separator), legend, an optional source line under the chart, and an animate-in style (Draw, One by one, Bounce, Fade up) with its length.
5. **Place:** choose **Over video** (from the playhead), **Start**, **End** or **New draft**, a canvas (16:9, 9:16, 1:1), where it sits on screen (full screen, a half, a corner or centered), the duration, and whether it has a background (full frame, card or none).
6. Press **Add chart**.

The preview at the top plays the animation as it will appear in the Draft.

## Saved styles

At the top of **Design**, name the current look and press **Save style**. A style keeps the colors, fonts, sizes, background and animation, not the data, title or position. Pick a saved style to apply it to any chart; **Undo** puts the previous look back. Styles are saved on this computer.

## Highlight one bar or slice

In **Design > Colors**, choose a label under **Highlight**. With one series or a pie, that bar or slice takes the highlight color and the rest take the second color. With several series, the highlighted group keeps its colors and the rest fade. Works on bar, horizontal bar, pie and donut charts.

## Edit a chart that is already in the Draft

Switch **Chart** to **Edit existing**, pick the chart, change the data or design, then press **Update chart**. **Add as new** adds a copy instead. To change a chart's length, trim it on the timeline.

The chart is also an ordinary graphic clip, so you can adjust it in **Adjust** and export it with **Export > Video**.

## Language

The app follows the Selects language (English or Korean). Change it under **Text > Language**.

## Notes

- Colors are set per series. A single-series bar chart can use **Color each bar**.
- Charts stay inside Selects. They are not carried over in a handoff to another editor.
