# 🎭 Skepnad – bli vem du vill, live

**Se ut och låt som vem du vill – i datorn och i mobilen.**

## 📱 Öppna i mobilen (eller vilken dator som helst)

**👉 https://rebelyouthz.github.io/skepnad/**

1. Öppna länken i **Chrome** på telefonen.
2. Tryck **Starta kamera & mikrofon** och tillåt.
3. Menyn ⋮ → **Lägg till på startskärmen** – nu har du en egen Skepnad-ikon.

I mobilen funkar: 41+ figurer (anka, kung, president, drake, zombie …), ~70 färdiga skepnader, röster,
levande platser, emojis du drar runt i bilden, filterlager, 3-2-1-nedräkning, inspelning, foto, fotobås –
och **Dela** direkt till Messenger, TikTok, YouTube och WhatsApp. Klippen sparas i appen under *Mina klipp*.

*Livesändning till YouTube/Twitch och samtalskameran (Messenger/Meet/Discord i webbläsaren) görs från
datorn med Skepnad-motorn nedan – en webbsida kan inte skicka RTMP själv.*

Kändisar, kungligheter och presidenter i appen är påhittade roller – inga riktiga personer.

Skepnad är en streamingstudio som körs helt lokalt i webbläsaren. Du kan bli en 3D-avatar som härmar dina miner, byta röst i realtid, sitta på levande, mysiga platser, lägga på filter och AR-tillbehör och spela ljudeffekter. Bilden går till OBS, Discord, Zoom eller Twitch.

## Starta

1. Dubbelklicka på **`Starta Skepnad.cmd`**. Appen öppnas i ett eget fönster (Chrome eller Edge).
2. Klicka **Starta kamera & mikrofon** och tillåt åtkomst.
3. Vill du ha en genväg med appikonen? Högerklicka på **`Skapa skrivbordsgenvag.ps1`** och välj *Kör med PowerShell*.

> Chrome/Edge kan även installera Skepnad som app (ikonen i adressfältet). Då får den en egen ikon i aktivitetsfältet.

Kräver Node.js på Windows (finns redan) och Chrome eller Edge.

## Funktioner

| Område | Innehåll |
|---|---|
| **Skepnader** | 10 färdiga looks (Mysig streamer, Robotkompis, Noir-detektiv, Midsommar …) + egna. Byt med `Shift+1–9`, med förvandlingseffekt. |
| **Avatarer** | 7 procedurella 3D-figurer (Robo, Mjau, Boo, Zorp, Slemmis, Nalle, Pumpa) som följer huvud, ögon, blink, mun, ögonbryn och leende. Dessutom **egna VRM/GLB-modeller** (VRoid Studio, Ready Player Me) och **PNG-tuber** med egna bilder. |
| **Levande bakgrunder** | 11 animerade platser: mysig stuga med brasa, regnigt fönster, norrsken, neonstad, rymden, förtrollad skog, undervattensvärld, lo-fi-solnedgång, aura, digitalt regn och gamingrum. Plus oskärpa, egen bild/video och greenscreen. |
| **Smart urklipp** | AI-segmentering med kantförfining, **ljusomslag** och **smart ljussättning** som ger dig platsens färgton. **3D-parallax**: bakgrunden rör sig med huvudet. |
| **Filter** | 19 stilar: film, noir, vintage, cyberpunk, VHS, glitch (reagerar på rösten), serietidning, oljemålning, blyerts, värmekamera, mörkerseende, pixelkonst, ASCII, hologram, drömsk, popkonst, duoton, kalejdoskop, spegelvärld. Justeringar och skönhetsfilter. |
| **AR-tillbehör** | 20 3D-föremål som sitter fast på huvudet, även på avatarer: krona, solglasögon, kattöron, kaninöron med fysik, midsommarkrans, vikingahjälm, tomteluva, rymdhjälm, headset m.fl. |
| **Ansiktsförvrängning** | Animéögon, bubbelhuvud, pyttehuvud, utomjording, jättemun, potatisnäsa, hamsterkinder, smalt ansikte. |
| **Röst** | 21 röster i realtid: robot, ekorre, helium, jätte, filmtrailer, demon, utomjording, spöke, radio, telefon, walkie-talkie (med brusklick), megafon, grotta, katedral, undervatten, gamling, bebis, **autotune**, **kör (harmonier)** och **vocoder**. Finjustera 20 parametrar. |
| **Ljudbord** | 16 syntetiserade ljud (tuta, applåder, ba-dum-tss, sorgtrombon, trumvirvel …) + egna ljudfiler. Tangent `1–9`. |
| **Effekter** | Konfetti, hjärtan, fyrverkeri, eldsprutare, pengaregn m.m. **Handgester** (👍 ✌️ ✋ 🤟 ☝️ ✊ 👎) och **uttrycksmagi**: gapa → eld, le → gnistor, blinka → stjärna, pussmun → puss. **Kasta saker** på huvudet (BONK!). **Trollstav** med pekfingret. |
| **Stämningsljud** | Brasa, regn, skog, bubblor och mer, syntetiserat live och matchat till bakgrunden. |
| **Overlay** | Namnskylt (4 stilar), **live-textning** på svenska, LIVE-märke, klocka, neon-/biografram och chattnotiser. |
| **Sändning** | Sändningsfönster för OBS, ren vy, virtuell ljudkabel (VB-Cable), inspelning till WebM, skärmdump, **Twitch-chattkommandon** (`!konfetti`, `!bonk`, `!robot` …) utan inloggning. |
| **Gränssnitt** | 3D-logga, tiltkort med ljusreflexer, förklaring när du hovrar över allt, diskreta gränssnittsljud (bara för dig), guidad tur, snabbtangenter. |

## Streama

- **Bild till OBS:** Sändning → *Sändningsfönster*. I OBS lägger du till *Fönsterinspelning* och väljer *Skepnad – Sändning*.
- **Discord/Zoom/Teams:** starta *Virtuell kamera* i OBS och välj *OBS Virtual Camera* som kamera.
- **Rösten:** installera [VB-Audio Virtual Cable](https://vb-audio.com/Cable/), välj *CABLE Input* under Sändning → Ljud och välj sedan *CABLE Output* som mikrofon i Discord/OBS.
- **Greenscreen:** välj bakgrunden *Green* och lägg filtret *Chroma Key* på källan i OBS.

## Snabbtangenter

| Tangent | Funktion | Tangent | Funktion |
|---|---|---|---|
| `M` | Mikrofon av/på | `V` | Röstförvrängning av/på |
| `A` | Kamera/avatar | `B` / `⇧B` | Nästa/föregående bakgrund |
| `F` / `⇧F` | Nästa/föregående filter | `C` | Konfetti |
| `L` | Hjärtan | `Y` | Fyrverkeri |
| `T` | Kasta sak | `1–9` | Ljudbord |
| `⇧1–9` | Byt skepnad | `H` | Ren vy |
| `R` | Spela in | `P` | Skärmdump |
| `?` | Hjälp | `Esc` | Stäng / lämna ren vy |

## Integritet

Kamera, ansiktsspårning, urklipp och röstförvrängning körs **helt lokalt**. Inget laddas upp. Undantag som du själv slår på: *live-textning* använder webbläsarens taligenkänning, och *Twitch-chatten* läses från Twitch. Egna filer (modeller, bilder, ljud) sparas i webbläsarens IndexedDB.

## Teknik

- **Rendering:** three.js (WebGL2) i en pipeline: bakgrundsshader → person/avatar + AR + partiklar (MSAA, linjärt ljus, premultiplicerad alfa) → filter → overlay.
- **Spårning:** MediaPipe Tasks Vision: Face Landmarker (478 punkter + 52 blendshapes + huvudets pose), Selfie Segmenter och Gesture Recognizer. Modellerna laddas lokalt från `public/models`.
- **Ljud:** Web Audio + AudioWorklet (`public/worklets/voice-processor.js`) med pitch-shift via fördröjningslinje, YIN-tonhöjd för autotune, harmonier, ringmodulering och brusspärr. Allt ljud är syntetiserat, så inga ljudfiler behövs.
- **Gränssnitt:** Vanilla JS, deklarativ bindning mot en liten store med persistens (localStorage) och lucide-ikoner.

## Utveckling

Projektet ligger i WSL (`~/projects/skepnad`). Node finns i `~/.local/node`.

```bash
export PATH=$HOME/.local/node/bin:$PATH
npm install        # hämtar också AI-modellerna till public/
npm run dev        # http://127.0.0.1:5173
npm test           # enhetstester (DSP, store, dataintegritet)
npm run build      # bygger dist/ som Starta Skepnad.cmd serverar
```

## Felsökning

- **Kameran startar inte:** stäng andra appar som använder kameran (Teams, Zoom, OBS-källa).
- **Segt:** välj 540p under Inställningar och stäng av gestigenkänning.
- **Tjut/rundgång:** använd hörlurar när *Medhörning* är på.
- **Inget ljud i Discord:** kontrollera att *CABLE Input* är vald i Skepnad och *CABLE Output* i Discord.
