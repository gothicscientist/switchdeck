# Switch sound recordings

The site uses real switch recordings through the original creators' YouTube
players. It does not generate switch audio, rip or redistribute video soundtracks,
or pitch-shift another switch's recording to stand in for a missing model.
The `SOUND_TESTS` registry in `index.html` records each source, creator, setup,
treatment and any published chapter offsets. Sources checked October 19, 2026.

| Catalog switch | Original recording | Creator | Preview chapter |
| --- | --- | --- | --- |
| Gateron Milky Yellow Pro | https://www.youtube.com/watch?v=rAw8qIYDc5A | Jur1cek | Full sound test; GMK67, factory prelubed, tape and case foam |
| Gateron Yellow KS-3 | https://www.youtube.com/watch?v=hXtLZ3WEX_0&t=46s | issey83 | 0:46–1:11, stock typing |
| Gateron Oil King | https://www.youtube.com/watch?v=-A_M_hvjVNY&t=92s | Click and Thock | 1:32–2:07, stock switches, GMK keycaps |
| Gateron Black Ink V2 | https://www.youtube.com/watch?v=2fe37TLjI5E&t=67s | KeebNews | 1:07–2:04, stock typing |
| Akko V3 Cream Yellow Pro | https://www.youtube.com/watch?v=teUx36lySu0&t=103s | Click and Thock | 1:43–2:18, GMK typing |
| NovelKeys Cream | https://www.youtube.com/watch?v=eir-tb4EHyI&t=48s | eyedin | 0:48–2:35, stock typing, NK65 Entry Edition |
| Cherry MX2A Red | https://www.youtube.com/watch?v=FIKLvH-pibc&t=255s | SeungupKBD | 4:15–4:52, MX2A Red, Cherry MX 3.1 RGB |
| Alpaca V2 | https://www.youtube.com/watch?v=PjSutgLURl8 | Turboards | Full sound test; stock switches, YC66, SA keycaps |
| Gazzew Boba U4T | https://www.youtube.com/watch?v=FuugCJ-V0Ng&t=98s | Click and Thock | 1:38–2:13, 62g black housing, GMK typing |
| Glorious Panda | https://www.youtube.com/watch?v=wRFG6-EZg7I&t=412s | The Dredgen Project | 6:52–7:33, acrylic Tofu60, unlubed; possible recording peaks |
| Gateron Baby Kangaroo | https://www.youtube.com/watch?v=P6jZkog_FoU | Click and Thock | Full sound test; GMK, MT3 and SA comparisons |
| Akko V3 Lavender Purple Pro | https://www.youtube.com/watch?v=Smyxu_ZY-zI&t=146s | Rx003 | 2:26–3:24, factory-lubed V3 Pro, Vega65 |
| Keychron K Pro Banana | https://www.youtube.com/watch?v=yMyFXpRABF0&t=59s | Keychron | 0:59–1:12, regular-height K Pro Banana |
| Gazzew Boba U4 Silent | https://www.youtube.com/watch?v=V-iNdStuYMc&t=98s | Click and Thock | 1:38–2:13, 62g black housing, GMK typing |
| Cherry MX Silent Red | https://www.youtube.com/watch?v=6bY1sH9G83Q&t=44s | Keychron | 0:44–0:59, original MX Silent Red |
| Cherry MX2A Blue | https://www.youtube.com/watch?v=fKsVrUJyfrQ | Mechanical Keyboards | Full MX1A/MX2A comparison; generation labels visible in video |
| Kailh BOX Jade | https://www.youtube.com/watch?v=5LxLPOp0alI&t=243s | Click and Thock | 4:03–4:14, GMK typing |
| Kailh BOX White | https://www.youtube.com/watch?v=5LxLPOp0alI&t=210s | Click and Thock | 3:30–3:41, original BOX White, GMK typing |

## Quiz examples

Linear uses Milky Yellow Pro; tactile uses Boba U4T; clicky uses BOX Jade;
silent uses MX Silent Red. Deep thock uses Boba U4T, creamy uses Oil King,
crisp clack uses stock NK Cream, and quiet uses MX Silent Red. These are named
examples of subjective sound descriptions, not a claim that every linear or
tactile switch sounds the same. The clicky illustration uses the same BOX Jade
as its recording.

## Interpretation and maintenance

- A switch recording is not a prediction of a complete custom build. The player
  displays the actual recorded case, plate, keycaps, lubrication and mods when
  documented. Cross-source recordings are not matched for loudness or microphone
  setup and cannot establish an absolute volume ranking.
- Keep Glorious Panda distinct from Holy Panda, silent U4 from U4T, original
  BOX White from V2, original MX from MX2A, and Akko CS from V3 Pro. The U4T
  recording explicitly identifies its 62g black-housing variant. The MX2A Blue
  source explicitly compares both generations rather than claiming both are MX2A.
- Use chapter times only when published by the creator or directly verified.
  Leave unverified offsets unset instead of guessing. Full recordings remain
  available through the original-source link, even for bounded previews.
- Load the privacy-enhanced video player only after a preview click. Keep video
  controls and creator attribution visible. Closing the dialog, changing views,
  or hiding the page removes the iframe to stop playback.
- Every results page, switch row, picker, builder and copied parts list provides
  an exact-model YouTube search URL ending in `switches sound test`. These links
  remain useful if a source video becomes unavailable or cannot be embedded.
- Add future recordings to `SOUND_TESTS` under the product's exact catalog ID.
  Until one is curated, the preview shows the exact-model search and explains
  that no recording is available. Never fall back to a different switch.

Run `node --test tests/sound-previews.test.cjs` before changing these mappings.
