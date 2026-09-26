// Hjälpfönster och guidad tur.
import { openModal } from './fx.js';
import { uiSounds } from '../audio/uiSounds.js';

export const HOTKEYS = [
  ['Mikrofon av/på', 'M'],
  ['Röstförvrängning av/på', 'V'],
  ['Växla kamera/avatar', 'A'],
  ['Nästa/föregående bakgrund', 'B / ⇧B'],
  ['Nästa/föregående filter', 'F / ⇧F'],
  ['Konfetti', 'C'],
  ['Hjärtan', 'L'],
  ['Fyrverkeri', 'Y'],
  ['Kasta sak (bonk)', 'T'],
  ['Ljudbord', '1 – 9'],
  ['Byt skepnad', '⇧1 – ⇧9'],
  ['Ren vy (dölj gränssnittet)', 'H'],
  ['Starta/stoppa inspelning', 'R'],
  ['Skärmdump', 'P'],
  ['Hjälp', '?'],
  ['Stäng / lämna ren vy', 'Esc'],
];

export function openHelp(startTab = 0) {
  const keys = `<div class="keys">${HOTKEYS.map(([n, k]) => `<div><span>${n}</span><kbd>${k}</kbd></div>`).join('')}</div>`;
  const tabs = [
    {
      label: 'Kom igång',
      html: `
        <h4>1. Välj en skepnad</h4><p>Under <b>Skepnader</b> finns färdiga looks – klicka så byts avatar, bakgrund, filter och röst på en gång.</p>
        <h4>2. Finputsa</h4><p>Gå igenom flikarna till vänster: <b>Avatar</b>, <b>Bakgrund</b>, <b>Filter</b>, <b>Ansikte</b> och <b>Röst</b>. Håll musen över vad som helst för en förklaring.</p>
        <h4>3. Ha kul live</h4><p>Använd <b>Ljudbord</b> och <b>Effekter</b> – eller visa en handgest i kameran (👍 ✌️ 🤟 ☝️) och gapa stort för att spruta eld!</p>
        <h4>4. Sänd</h4><p>Under <b>Sändning</b> får du bilden till OBS och ljudet till Discord. Spara din egen look som skepnad och byt med <kbd>Shift</kbd>+<kbd>1</kbd>–<kbd>9</kbd>.</p>`,
    },
    {
      label: 'Streama',
      html: `
        <h4>Bild till OBS</h4><p>Sändning → <b>Sändningsfönster</b>. I OBS: lägg till <b>Fönsterinspelning</b> och välj fönstret <b>Skepnad – Sändning</b>. Du kan också använda <b>Ren vy</b> (<kbd>H</kbd>) och fånga huvudfönstret.</p>
        <h4>Bild till Discord, Zoom, Teams</h4><p>Starta <b>Virtuell kamera</b> i OBS och välj <b>OBS Virtual Camera</b> som kamera i Discord/Zoom.</p>
        <h4>Rösten till Discord/OBS</h4><p>Installera gratisprogrammet <b>VB-Audio Virtual Cable</b>. Välj <b>CABLE Input</b> under Sändning → Ljud. Välj sedan <b>CABLE Output</b> som mikrofon i Discord/OBS.</p>
        <h4>Greenscreen</h4><p>Välj bakgrunden <b>Greenscreen</b> och lägg filtret <b>Chroma Key</b> på källan i OBS för att sitta ovanpå ett spel.</p>
        <h4>Twitch-chatt</h4><p>Skriv ditt kanalnamn under Sändning och slå på chatten. Tittare kan skriva <kbd>!konfetti</kbd>, <kbd>!bonk</kbd>, <kbd>!robot</kbd> m.fl.</p>`,
    },
    { label: 'Snabbtangenter', html: keys },
    {
      label: 'Integritet & tips',
      html: `
        <h4>🔒 Allt är lokalt</h4><p>Kamerabild, ansiktsspårning och röstförvrängning körs helt i din dator. Inget laddas upp. Undantag: <b>live-textning</b> använder webbläsarens taligenkänning (Google) och <b>Twitch-chatten</b> läses från Twitch.</p>
        <h4>Bästa resultat</h4><p>Bra, jämnt ljus framifrån ger bäst spårning och urklipp. Använd hörlurar om du slår på medhörning. Stäng andra appar som använder kameran.</p>
        <h4>Om det går segt</h4><p>Välj <b>540p</b> under Inställningar, stäng av gestigenkänning och välj en enklare bakgrund.</p>
        <h4>Egna avatarer</h4><p>Skapa en gratis VRM-avatar i <b>VRoid Studio</b> och ladda in den under Avatar. GLB-filer med ARKit-blendshapes (t.ex. Ready Player Me) fungerar också.</p>`,
    },
  ];
  const close = openModal({ title: 'Hjälp', iconName: 'help', tabs });
  if (startTab) setTimeout(() => document.querySelector(`.modal [data-tab="${startTab}"]`)?.click(), 0);
  return close;
}

const TOUR = [
  { sel: '#stage', title: 'Din sändning', text: 'Det här är exakt vad tittarna ser. Allt uppdateras live.' },
  { sel: '#rail', title: 'Flikarna', text: 'Avatar, bakgrund, filter, röst, ljudbord och effekter. Håll musen över vad som helst för en förklaring.' },
  { sel: '#dock', title: 'Skepnader', text: 'Färdiga looks. Klicka för att förvandlas – eller tryck Shift + 1–9.' },
  { sel: '#quickbar', title: 'Snabbfältet', text: 'Mikrofonnivå, kamera/avatar-läge och effektknappar när det ska gå fort.' },
  { sel: '#actions', title: 'Spela in & sänd', text: 'Spela in, ta skärmdump, öppna sändningsfönstret för OBS eller dölj gränssnittet.' },
];

export function startTour(onDone) {
  let i = 0;
  const spot = document.createElement('div');
  spot.className = 'tour-spot';
  const cardEl = document.createElement('div');
  cardEl.className = 'tour-card';
  document.body.append(spot, cardEl);
  const end = () => {
    spot.remove();
    cardEl.remove();
    document.removeEventListener('keydown', onKey, true);
    onDone?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      end();
    }
    if (e.key === 'ArrowRight' || e.key === 'Enter') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  };
  const go = (n) => {
    if (n >= TOUR.length) return end();
    i = Math.max(0, n);
    const step = TOUR[i];
    const el = document.querySelector(step.sel);
    if (!el) return go(i + 1);
    const r = el.getBoundingClientRect();
    const pad = 8;
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    cardEl.innerHTML = `<h4>${step.title}</h4><p>${step.text}</p><div class="row"><span class="count">${i + 1} / ${TOUR.length}</span><div class="row" style="gap:6px"><button class="btn sm" data-t="skip">Hoppa över</button><button class="btn sm btn-primary" data-t="next">${i === TOUR.length - 1 ? 'Klart!' : 'Nästa'}</button></div></div>`;
    const cw = 320;
    let x = r.right + 18;
    let y = r.top;
    if (x + cw > innerWidth - 10) x = Math.max(10, r.left - cw - 18);
    if (x < 10 || r.width > innerWidth * 0.5) {
      x = Math.min(Math.max(10, r.left + r.width / 2 - cw / 2), innerWidth - cw - 10);
      y = r.bottom + 18 > innerHeight - 180 ? r.top - 170 : r.bottom + 18;
    }
    Object.assign(cardEl.style, { left: `${x}px`, top: `${Math.max(10, y)}px` });
    uiSounds.play('tab');
  };
  cardEl.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (t === 'skip') end();
    if (t === 'next') go(i + 1);
  });
  document.addEventListener('keydown', onKey, true);
  go(0);
}
