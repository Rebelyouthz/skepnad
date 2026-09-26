# Skepnad – design

*Live-avatar, röstförvandlare och kamerafilter för streaming. 2026-09-26.*

## Vad användaren bad om (sammanfattat)

- En app där man kan streama live och **se ut som någon annan** (avatar, filter, AR) och **låta som någon annan** (röstförvandlare).
- Ta det bästa från de populäraste apparna, plocka guldkorn från mindre kända, och lägg till egna idéer som gör appen roligare och mer avancerad.
- Premium-UI med 3D-effekter, ljudeffekter i gränssnittet, **förklarande text när man hovrar**, ikoner, logga.
- **Levande bakgrunder** så man ser ut att sitta på en cool, mysig plats.

## Antaganden (kan ändras)

| Antagande | Varför |
|---|---|
| Webbapp (Vite + three.js + MediaPipe) som körs lokalt i Chrome/Edge, startas med en `.cmd`-fil i app-fönsterläge | Kamera, GPU-shaders, AudioWorklet och ML-modeller finns i webbläsaren; ingen installation av drivrutiner behövs |
| Gränssnitt på svenska | Användaren skriver svenska |
| Bild till OBS/Discord via **Sändningsfönster** (fönsterinspelning) + OBS virtuell kamera; ljud via **virtuell ljudkabel** (t.ex. VB-Cable) vald i appen | En webbläsare kan inte skapa en egen virtuell kamera/mikrofon |
| All bearbetning sker lokalt, inget skickas ut (utom valfri live-textning som använder webbläsarens taligenkänning och valfri Twitch-chatt-läsning) | Integritet |
| Alla ljud, bakgrunder, avatarer och tillbehör genereras procedurellt i kod | Inga licensproblem, liten app, allt är "levande" |

## Research – vad de bästa gör

| App | Styrka vi tar med |
|---|---|
| VTube Studio / VSeeFace | Ansiktsspårning som styr avatar: huvudvridning, blink, ögon, mun, ögonbryn; VRM-modeller |
| Voicemod | Röstpresets, soundboard med snabbtangenter, virtuell mikrofon |
| NVIDIA Broadcast / XSplit VCam | Bakgrundsoskärpa/-byte, auto-inramning, brusreducering |
| Snap Camera / ManyCam / Streamfog | AR-masker och tillbehör, filter, effekter |
| **Mindre kända guldkorn** | Streamfog: chatten triggar effekter · Warudo: tittare kastar saker på avataren · veadotube: PNG-tuber (prata/tyst-bilder) · Webcamoid: konstnärliga filter (ASCII, serie) |

## Egna idéer

- **Parallax-djup**: levande bakgrunder rör sig med huvudet → 3D-känsla.
- **Smart ljussättning / ljusomslag**: personen får kantljus och färgton från bakgrunden så att urklippet smälter in.
- **Ljudreaktivt**: bakgrunder, glitch och avatar reagerar på rösten.
- **Stämningsljud** som matchar bakgrunden (brasa, regn, skog, hav…), syntetiserat live.
- **Uttrycksmagi**: gapa → eldsprutare, blinka → gnistra, pussmun → kyss-hjärtan, höj ögonbrynen → "!".
- **Gester**: 👍 ✌️ ✋ 🤟 ☝️ ✊ triggar effekter.
- **Autotune + Kör (harmonier) + Vocoder** – musikaliska röster.
- **Live-textning** på svenska som overlay.
- **Skepnader (personas)**: sparade kombinationer av utseende + röst, byts med ett klick/snabbtangent med övergångseffekt.
- **Twitch-chattkommandon** (`!konfetti`, `!bonk`, `!robot` …) utan inloggning.
- **Svenska specialare**: midsommarkrans, tomteluva, vikingahjälm.

## Arkitektur

```
src/
  app/        store (tillstånd + persistens), defaults, personas, hotkeys, recorder
  media/      devices (kamera/mik), tracker (MediaPipe face/segment/gesture), oneEuro
  render/     compositor (three.js-pipeline), backgrounds/, filters, person, faceWarp,
              ar/ (tillbehör), fx/ (partiklar, kastföremål), overlays (2D-canvas)
  avatar/     avatarLayer, rig, builtin/*, vrm, pngtuber
  audio/      engine, voices, dsp + worklets/voice-processor, vocoder, reverb,
              soundboard, ambience, uiSounds, speech
  integrations/ twitch
  ui/         shell, panels/*, components, tooltip, tilt, logo3d, toast, help, tour
  styles/
```

### Renderingspipeline (en WebGL2-kontext, three.js)

1. **Bakgrund → bgRT** (HalfFloat): ingen / oskärpa / procedurell scen / egen bild·video / greenscreen.
2. **Förgrund → fgRT** (MSAA, transparent, premultiplicerad): personlager (video + mask + warp + beauty + ljusomslag) *eller* avatar; AR-tillbehör med huvud-ockluderare; partiklar och kastföremål.
3. **Post → skärm**: komposition bg+fg, filter + justeringar, linjär→sRGB.
4. **Overlay**: 2D-canvas (namnskylt, textning, klocka, LIVE, chattnotiser) ovanpå, ofiltrerat.

Allt mellanlager är linjärt ljus; egna shaders konverterar sRGB→linjärt vid indata.

### Ljudgraf

`mik → gain → highpass → VoiceProcessor (worklet: gate, pitch, harmonier, autotune, ringmod) → klang-EQ → hp/lp → distorsion → chorus → tremolo → vocoder (parallell) → eko → rumsklang → kompressor → röstut`

Två bussar: **streamBus** (det tittarna hör → inspelning + vald utgång t.ex. virtuell kabel) och **localBus** (det du hör). UI-ljud går bara lokalt, aldrig ut i sändningen.

Presets är parametervärden i en statisk kedja → inga klick vid byte.

## Felhantering

- Ingen kamera/nekad behörighet → avatarläge med ljudstyrd mun, eller demoläge.
- Modeller kan inte laddas lokalt → CDN; annars stängs spårningsberoende funktioner av med tydligt meddelande.
- GPU-delegat misslyckas → CPU-delegat.
- `setSinkId`/AudioWorklet saknas → funktionen döljs med förklaring.

## Test

- Vitest: store, oneEuro, YIN-tonhöjd, pitch-shift-DSP, presets/personas-integritet.
- E2E (Playwright + Chrome med fejkad kamera från en porträttbild och syntetisk röst): starta, vänta på spårning, skärmdumpa bakgrunder/filter/avatarer/tillbehör/paneler, 0 konsolfel. Skärmdumparna granskas visuellt.
