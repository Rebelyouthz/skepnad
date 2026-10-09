// Paneler för att dela Skepnad med världen: Hem, Mina klipp, Gå live, Samtal, Mobil.
import { icon } from './icons.js';
import { SERVICES } from '../app/live.js';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tipAttr = (tip) => (tip ? ` data-tip="${esc(tip)}"` : '');
const section = (title, body, tip) => `<div class="section"><div class="section-title"${tipAttr(tip)}>${title}</div>${body}</div>`;
const note = (text, kind = '', ic = 'info') => `<div class="note ${kind}">${icon(ic, 15)}<span>${text}</span></div>`;
const btn = (action, label, ic, tip, cls = '', arg = '') =>
  `<button class="btn ${cls}" data-action="${action}"${arg !== '' ? ` data-arg="${esc(arg)}"` : ''}${tipAttr(tip)}>${ic ? icon(ic, 16) : ''}<span>${label}</span></button>`;
const toggle = (path, label, tip, small = '') =>
  `<label class="switch"${tipAttr(tip)}><span>${label}${small ? `<small>${small}</small>` : ''}</span><input type="checkbox" data-bind="${path}"><span class="knob"></span></label>`;
const seg = (path, options) =>
  `<div class="seg" data-seg="${path}">${options.map((o) => `<button data-value="${o.value}"${tipAttr(o.tip)}>${o.icon ? icon(o.icon, 15) : ''}<span>${o.label}</span></button>`).join('')}</div>`;
const statusRow = (ok, label, detail, action = '') =>
  `<div class="status-row ${ok === true ? 'ok' : ok === 'warn' ? 'warn' : 'bad'}">${icon(ok === true ? 'ok' : 'alert', 16)}<div><b>${label}</b><small>${detail}</small></div>${action}</div>`;

const formatSeg = () =>
  seg('video.aspect', [
    { value: 'landscape', label: 'Liggande 16:9', icon: 'landscape', tip: 'Liggande|För YouTube, Twitch och samtal.' },
    { value: 'portrait', label: 'Stående 9:16', icon: 'portrait', tip: 'Stående|För TikTok, YouTube Shorts, Instagram Reels och mobilen.' },
  ]);

export const SHARE_TABS = {
  home: { icon: 'home', label: 'Hem', tip: 'Hem|Börja här! Välj vad du vill göra så guidar vi dig steg för steg.' },
  clips: { icon: 'clapper', label: 'Klipp', tip: 'Mina klipp|Spela in videor, se dem, dela dem och lägg upp på YouTube.' },
  live: { icon: 'live', label: 'Live', tip: 'Gå live|Sänd direkt till YouTube, Twitch, TikTok, Kick eller Facebook – inget annat program behövs.' },
  calls: { icon: 'call', label: 'Samtal', tip: 'Samtal|Använd din avatar och röst i Messenger, Discord, Zoom, Meet och Teams.' },
  phone: { icon: 'smartphone', label: 'Mobil', tip: 'Mobilen|Styr Skepnad från telefonen – effekter, ljud och avatarer i handen.' },
};

export const SHARE_PANELS = {
  home: {
    title: 'Hem',
    sub: 'Vad vill du göra idag? Välj – så guidar vi dig.',
    render: (s, ctx) => {
      const tiles = [
        ['tab', 'personas', '🎭', 'Bli någon annan', 'Anka, kung, president, drake, zombie … med röst och plats.'],
        ['tab', 'stickers', '😎', 'Emojis i bilden', 'Sätt emojis och pratbubblor på dig och dra runt dem.'],
        ['guide', 'record', '🎬', 'Spela in ett klipp', 'Till TikTok, YouTube eller för att skicka till kompisar.'],
        ['booth', '', '📸', 'Fotobås', 'Fyra foton med nedräkning → en fotoremsa.'],
        ...(ctx.mobile ? [] : [['tab', 'calls', '📞', 'Ring med Skepnad', 'Messenger, Discord, Zoom, Meet, Teams – som din figur.']]),
        ['tab', 'live', '🔴', 'Gå live', 'YouTube, Twitch, TikTok, Kick eller Facebook.'],
        ['guide', 'youtube', '▶️', 'Lägg upp på YouTube', 'Från inspelning till uppladdat på en minut.'],
        ['tab', 'phone', '📱', 'Skepnad i mobilen', 'Öppna appen i telefonen med en länk eller QR-kod.'],
      ];
      const h = ctx.host;
      const ff = h.info?.ffmpeg?.state;
      return `
        <div class="hub-hero"><div class="hub-wave">👋</div><div><h3>Hej! Vad vill du göra?</h3><p>Allt körs i din egen enhet. ${ctx.mobile ? 'Håll inne en knapp för att se vad den gör.' : 'Håll musen över saker för att få förklaringar.'}</p></div></div>
        <div class="hub-grid">${tiles
          .map(([a, arg, e, t, d]) => `<button class="card hub-tile" data-action="${a}" data-arg="${arg}" data-tip="${esc(t)}|${esc(d)}"><span class="emoji">${e}</span><span class="name">${t}</span><span class="desc">${d}</span></button>`)
          .join('')}</div>
        ${section(
          'Status',
          `<div class="status-list">
            ${statusRow(ctx.runtime.hasCamera ? true : 'warn', 'Kamera', ctx.runtime.hasCamera ? 'Igång' : 'Ingen kamera – avatarläget fungerar ändå')}
            ${statusRow(ctx.runtime.hasMic ? true : 'warn', 'Mikrofon', ctx.runtime.hasMic ? 'Igång' : 'Ingen mikrofon')}
            ${statusRow(true, 'Klipp & foton', h.available ? `Sparas i ${esc(h.info?.videosDir || 'Videor\\Skepnad')}` : 'Sparas i appen under Mina klipp – dela eller spara dem i enheten')}
            ${ctx.mobile ? '' : statusRow(h.available ? true : 'warn', 'Skepnad-motorn (datorn)', h.available ? 'Igång – live, samtal och mobilkontroll fungerar' : 'Starta Skepnad med ikonen på datorn för att gå live och ringa')}
            ${ctx.mobile ? '' : statusRow(ctx.calls.extPresent ? true : 'warn', 'Samtalstillägget', ctx.calls.extPresent ? 'Installerat – redo för samtal' : 'Inte installerat ännu', ctx.calls.extPresent ? '' : `<button class="btn sm" data-action="tab" data-arg="calls">Fixa</button>`)}
            ${h.available ? statusRow(ff === 'ready' ? true : 'warn', 'Sändningsmotorn', ff === 'ready' ? 'Redo att gå live' : ff === 'downloading' ? 'Laddas ner…' : 'Hämtas automatiskt första gången du går live') : ''}
          </div>`,
        )}`;
    },
  },

  clips: {
    title: 'Mina klipp',
    sub: 'Spela in, titta, dela och lägg upp. Klippen sparas som MP4 – funkar överallt.',
    render: (s, ctx) => `
      ${section(
        'Spela in',
        `<div class="rec-card">
          <button class="rec-big ${ctx.recording ? 'on' : ''}" data-action="record" data-tip="Spela in|Starta eller stoppa inspelningen (tangent R).">${ctx.recording ? '<span class="sq"></span>Stoppa' : '<span class="dot"></span>Spela in'}</button>
          <div class="rec-info">${ctx.recording ? `<b class="rec-time" data-rec-time>00:00</b><small>Spelar in…</small>` : '<b>Redo</b><small>Tryck för att börja – eller tangenten R</small>'}</div>
        </div>
        <div class="row" style="margin-top:10px">${btn('photo', 'Ta foto', 'camera', 'Foto|Med nedräkning – sparas i Mina klipp.', 'sm')}${btn('booth', 'Fotobås', 'booth', 'Fotobås|Fyra foton i rad → en fotoremsa.', 'sm')}</div>
        <div class="field" style="margin-top:12px"><label>Format</label>${formatSeg()}</div>
        ${ctx.host.available ? note(`Klippen sparas automatiskt i <b>${esc(ctx.host.info?.videosDir || 'Videor\\Skepnad')}</b>.`, '', 'folder') : note('Klippen sparas här i appen. Tryck <b>Dela</b> för Messenger, TikTok, YouTube m.fl. – eller <b>Spara</b> för att lägga dem i enheten.', '', 'clapper')}`,
      )}
      ${section(
        'Mina klipp',
        `<div class="row" style="margin-bottom:10px">${ctx.host.available ? btn('openClipsFolder', 'Öppna mappen', 'folder', 'Öppna mappen|Visa alla klipp i Utforskaren.', 'sm') : ''}${btn('refreshClips', 'Uppdatera', 'reset', 'Uppdatera|Hämta listan igen.', 'sm')}</div>
         <div class="clip-list" id="clip-list"><p class="muted">Laddar…</p></div>
         <div style="margin-top:12px"><label class="dropzone" data-drop="importClip" data-arg="" data-tip="Lägg till|Lägg till en video eller bild från galleriet/datorn i Mina klipp.">${icon('upload', 20)}<b>Lägg till video eller bild</b><span>Från galleriet eller datorn</span><input type="file" accept="video/*,image/*" hidden data-file="importClip" data-arg=""></label></div>`,
      )}`,
  },

  live: {
    title: 'Gå live',
    sub: 'Sänd direkt från Skepnad – till en eller flera tjänster samtidigt.',
    render: (s, ctx) => {
      const L = ctx.live;
      const cards = SERVICES.map((sv) => {
        const cfg = s.live.services[sv.id] || {};
        return `<div class="svc ${cfg.enabled ? 'on' : ''}" style="--svc:${sv.color}">
          <label class="switch"><span><span class="svc-icon">${sv.icon}</span> ${sv.name}</span><input type="checkbox" data-bind="live.services.${sv.id}.enabled"><span class="knob"></span></label>
          <div class="svc-body">
            ${sv.editableUrl ? `<div class="field"><label>Serveradress (URL)</label><input type="text" data-bind="live.services.${sv.id}.url" placeholder="rtmp://… eller rtmps://…" spellcheck="false"></div>` : ''}
            <div class="field"><label>Streamnyckel</label><div class="row"><input type="password" data-bind="live.services.${sv.id}.key" placeholder="Klistra in nyckeln här" spellcheck="false" autocomplete="off">${sv.keyUrl ? `<button class="btn sm" style="flex:none" data-action="openKeyPage" data-arg="${sv.id}" data-tip="Hitta nyckeln|${esc(sv.keyHelp)}">${icon('key', 15)}<span>Hitta</span></button>` : ''}</div></div>
            <small class="muted">${esc(sv.keyHelp)}</small>${sv.note ? `<small class="muted" style="display:block;margin-top:4px">⚠️ ${esc(sv.note)}</small>` : ''}
          </div>
        </div>`;
      }).join('');
      const st = L.state;
      const statusCard =
        st === 'live'
          ? `<div class="live-card on"><div class="live-badge"><span class="dot"></span>LIVE <b data-live-time>00:00</b></div><div class="live-stats" data-live-stats>Ansluter…</div><div class="live-targets">${L.targets.map((t) => esc(t.name)).join(' · ')}</div>${btn('liveStop', 'Avsluta sändningen', 'stop', 'Avsluta|Stoppar livesändningen.', 'btn-danger')}</div>`
          : st === 'preparing' || st === 'stopping'
            ? `<div class="live-card"><div class="live-badge wait">${icon('loader', 16)} ${st === 'stopping' ? 'Avslutar…' : esc(L.text || 'Förbereder…')}</div>${ctx.ffProgress != null ? `<div class="loadbar"><div class="track"><div class="fill" style="width:${Math.round(ctx.ffProgress * 100)}%"></div></div><p>Laddar ner sändningsmotorn (engångs, 30 MB)…</p></div>` : ''}</div>`
            : `<div class="live-card">${st === 'error' ? note(esc(L.error || 'Något gick fel.'), 'warn', 'alert') : ''}<button class="btn btn-primary big go-live" data-action="liveStart" data-tip="Gå live|Startar sändningen till alla tjänster du har slagit på nedan.">🔴 Gå live</button><small class="muted">Slå på en tjänst nedan och klistra in din streamnyckel först.</small></div>`;
      if (!ctx.host.available) {
        return `
          <div class="hub-hero"><div class="hub-wave">🔴</div><div><h3>Gå live</h3><p>Direktsändning till YouTube, Twitch, TikTok, Kick och Facebook görs från datorn – där finns sändningsmotorn.</p></div></div>
          ${section('Från datorn (rekommenderas)', `<ol class="steps"><li>Starta Skepnad på datorn med ikonen <b>Skepnad</b>.</li><li>Gå till fliken <b>Live</b>, slå på tjänsten och klistra in din streamnyckel.</li><li>Tryck <b>Gå live</b> – 3, 2, 1 och du sänder!</li></ol>`)}
          ${section(ctx.mobile ? 'Från mobilen' : 'Utan motorn', `<ol class="steps"><li><b>Spela in</b> här i Skepnad och lägg upp klippet med <b>Dela</b> → TikTok, YouTube eller Instagram.</li><li>Vill du sända live direkt från telefonen: starta live i <b>TikTok-</b> eller <b>YouTube-appen</b> och välj <b>skärmdelning</b>. Öppna sedan Skepnad – tittarna ser din skepnad.</li></ol>${note('En webbsida kan inte skicka video direkt till YouTube/Twitch (de kräver RTMP). Därför sköter datorns sändningsmotor det.', '', 'info')}`)}
          ${section('Format', formatSeg())}`;
      }
      return `
        ${statusCard}
        ${section('Vart vill du sända?', `<div class="svc-list">${cards}</div>`)}
        ${section(
          'Inställningar',
          `${toggle('live.saveCopy', 'Spara en kopia på datorn', 'Spara kopia|Sändningen sparas också i Mina klipp så att du kan lägga upp den senare.')}
           <div class="field" style="margin-top:8px"><label>Kvalitet</label>${seg('live.quality', [
             { value: 'auto', label: 'Auto', tip: 'Auto|Väljer efter din bildkvalitet.' },
             { value: '720', label: '720p', tip: '720p|Säkrast på vanlig uppkoppling (3,5 Mbit/s).' },
             { value: '1080', label: '1080p', tip: '1080p|Skarpast – kräver bra uppkoppling (6 Mbit/s).' },
           ])}</div>
           <div class="field" style="margin-top:8px"><label>Format</label>${formatSeg()}</div>
           ${note('Stående 9:16 passar TikTok LIVE. Liggande 16:9 passar YouTube, Twitch och Kick.')}`,
        )}
        ${section(
          'Twitch-chatt',
          `<div class="field"><label>Kanalnamn</label><input type="text" data-bind="twitch.channel" placeholder="t.ex. dittnamn" maxlength="30"></div>
          ${toggle('twitch.enabled', 'Låt chatten styra effekter', 'Twitch-chatt|Tittare skriver !konfetti, !bonk, !robot … och det händer i bild. Ingen inloggning behövs.')}
          <div class="row" style="margin:6px 0 12px"><span class="chip" data-twitch-status><span class="dot"></span><span>Inte ansluten</span></span></div>
          <div class="row"><input type="text" id="cmd-test" placeholder="!konfetti" maxlength="40">${btn('testCommand', 'Testa', 'send', 'Testa kommando|Simulera ett chattmeddelande lokalt.', 'sm')}</div>`,
        )}
        ${section(
          'Med OBS istället (avancerat)',
          `<div class="row" style="margin-bottom:10px">${btn('outputWindow', 'Sändningsfönster', 'external', 'Sändningsfönster|Ett rent fönster med bara bilden – fånga det i OBS med Fönsterinspelning.')}${btn('cleanView', 'Ren vy', 'eye-off', 'Ren vy|Döljer gränssnittet (H eller Esc för att komma tillbaka).')}</div>
           <ol class="steps"><li>Klicka <b>Sändningsfönster</b>.</li><li>I OBS: Källor → + → <b>Fönsterinspelning</b> → välj <b>Skepnad – Sändning</b>.</li><li>Välj <b>Green</b> som bakgrund och Chroma Key i OBS för att lägga dig ovanpå spel.</li></ol>`,
        )}`;
    },
  },

  calls: {
    title: 'Samtal',
    sub: 'Ring som din avatar – med din Skepnad-röst.',
    render: (s, ctx) => {
      const installed = ctx.calls.extPresent;
      const browserName = ctx.browser === 'edge' ? 'Edge' : 'Chrome';
      const active = ctx.calls.activeCalls;
      const setup = `
        <div class="wizard">
          <div class="wz-step"><span class="wz-n">1</span><div><b>Öppna tilläggsmappen</b><small>Sökvägen kopieras automatiskt.</small>${btn('extOpenFolder', 'Öppna mappen', 'folder', 'Öppna mappen|Öppnar mappen med Skepnad-tillägget och kopierar sökvägen.', 'sm')}</div></div>
          <div class="wz-step"><span class="wz-n">2</span><div><b>Öppna tilläggssidan i ${browserName}</b><small>Eller skriv <kbd>${ctx.browser === 'edge' ? 'edge' : 'chrome'}://extensions</kbd> i adressfältet.</small>${btn('extOpenPage', `Öppna ${browserName}-tillägg`, 'puzzle', 'Tilläggssidan|Öppnar sidan där man lägger till tillägg.', 'sm')}</div></div>
          <div class="wz-step"><span class="wz-n">3</span><div><b>Slå på "Utvecklarläge"</b><small>${ctx.browser === 'edge' ? 'Till vänster på sidan.' : 'Knappen uppe till höger.'}</small><div class="mock"><span>Utvecklarläge</span><span class="mock-switch"></span></div></div></div>
          <div class="wz-step"><span class="wz-n">4</span><div><b>Klicka "Läs in okomprimerat tillägg"</b><small>Välj mappen <b>tillägg</b> (klistra in sökvägen med Ctrl+V) och klicka <b>Välj mapp</b>.</small><div class="mock"><span>📂 Läs in okomprimerat tillägg</span></div></div></div>
          <div class="wz-step"><span class="wz-n">5</span><div><b>Klart!</b><small>Den här sidan märker det av sig själv – vänta några sekunder.</small></div></div>
        </div>`;
      const how = `
        <div class="status-row ok">${icon('ok', 18)}<div><b>Samtalstillägget är installerat</b><small>${active ? `📞 ${active} samtal använder Skepnad just nu` : 'Redo – ring när du vill!'}</small></div></div>
        <ol class="steps" style="margin-top:12px">
          <li>Låt <b>Skepnad vara öppet</b> (det får ligga bakom andra fönster).</li>
          <li>Öppna samtalet i <b>${browserName}</b> – t.ex. Messenger på webben – och ring.</li>
          <li>Kameran och mikrofonen blir <b>automatiskt Skepnad</b>. Byt avatar, röst och bakgrund här medan du pratar!</li>
        </ol>
        <div class="row" style="flex-wrap:wrap;margin-top:12px">${btn('openCallSite', 'Messenger', 'chat', 'Messenger|Öppnar Messenger i webbläsaren.', 'sm', 'messenger')}${btn('openCallSite', 'Google Meet', 'video', 'Google Meet|Öppnar Meet.', 'sm', 'meet')}${btn('openCallSite', 'Discord', 'gamepad', 'Discord|Öppnar Discord i webbläsaren.', 'sm', 'discord')}</div>
        ${note('Syns inte Skepnad? Välj <b>Skepnad Kamera</b> och <b>Skepnad Mikrofon</b> i samtalsappens kamera-/ljudinställningar. Klicka på pusselbiten i webbläsaren för att stänga av eller på.')}`;
      return `
        <div class="hub-hero"><div class="hub-wave">📞</div><div><h3>Ring som din avatar</h3><p>Fungerar i Messenger, Google Meet, Discord, Zoom, Teams och YouTube Live i webbläsaren.</p></div></div>
        ${section(installed ? 'Så ringer du' : 'Engångsinstallation (2 minuter)', installed ? how : setup)}
        ${section(
          'Program på datorn (Discord-appen, Zoom-appen …)',
          `<ol class="steps"><li>Installera gratisprogrammen <b>OBS Studio</b> och <b>VB-Audio Virtual Cable</b>.</li><li>I OBS: lägg till <b>Fönsterinspelning</b> av Skepnads <b>Sändningsfönster</b> och klicka <b>Starta virtuell kamera</b>.</li><li>Här i Skepnad: välj <b>CABLE Input</b> som utgång nedan.</li><li>I appen: välj <b>OBS Virtual Camera</b> och <b>CABLE Output</b>.</li></ol>
           <div class="field" style="margin-top:10px"><label>Skicka rösten till (virtuell kabel)</label><select data-bind="voice.outputDevice"><option value="">Ingen extra utgång</option></select></div>
           <div class="row">${btn('outputWindow', 'Sändningsfönster', 'external', 'Sändningsfönster|Ett rent fönster för OBS.', 'sm')}${btn('testOutput', 'Testa ljudet', 'volume', 'Testa|Spelar ett pling i utgången.', 'sm')}</div>`,
        )}
        ${section('I mobilen', note('Messenger-appen i en telefon kan tyvärr inte använda andra kameror (Android tillåter det inte). Ring från datorn med Skepnad – eller spela in roliga klipp och skicka dem från <b>Mina klipp</b>.', '', 'smartphone'))}`;
    },
  },

  phone: {
    title: 'Mobilen',
    sub: 'Använd telefonen som fjärrkontroll för Skepnad.',
    render: (s, ctx) => {
      const r = ctx.host.info?.remote;
      const app = `
        <div class="qr-card"><div class="qr" id="pages-qr"></div><div><b>Skanna med mobilkameran</b><ol class="steps"><li>Öppna länken i <b>Chrome</b>.</li><li>Tryck <b>Starta kamera &amp; mikrofon</b> och tillåt.</li><li>Menyn ⋮ → <b>Lägg till på startskärmen</b> – nu har du en egen Skepnad-ikon!</li></ol></div></div>
        <div class="urlbox">${esc(ctx.pagesUrl)}</div>
        <div class="row" style="margin-top:10px">${btn('copyPages', 'Kopiera länken', 'link', 'Kopiera|Skicka länken till mobilen via Messenger, sms eller mejl.', 'sm')}${btn('openPages', 'Öppna', 'external', 'Öppna|Öppna webbadressen.', 'sm')}</div>`;
      const remote = !ctx.host.available
        ? note('Fjärrkontrollen (styr datorns Skepnad från mobilen) kräver att Skepnad startas med ikonen på datorn.', '', 'info')
        : `${
          r?.running
            ? `<div class="qr-card"><div class="qr" id="remote-qr"></div><div><b>Skanna med mobilkameran</b><ol class="steps"><li>Mobilen ska vara på <b>samma WiFi</b> som datorn.</li><li>Öppna kameran och rikta den mot koden.</li><li>Tryck på länken som dyker upp.</li></ol><small class="muted" data-remote-count>${ctx.host.remoteCount ? `📱 ${ctx.host.remoteCount} mobil ansluten` : 'Ingen mobil ansluten ännu'}</small></div></div>
               <div class="field" style="margin-top:12px"><label>Eller skriv in adressen i mobilens webbläsare</label><input type="text" readonly value="${esc(r.urls[0] || '')}" onclick="this.select()"></div>
               ${note('Om Windows frågar om nätverksåtkomst: klicka <b>Tillåt</b>. Annars når inte mobilen datorn.', 'warn')}
               <div class="row">${btn('remoteStop', 'Stäng av fjärrkontrollen', 'x', 'Stäng av|Mobilen kopplas bort.', 'sm')}</div>`
            : `<button class="btn btn-primary" data-action="remoteStart" data-tip="Starta|Visar en QR-kod som du skannar med mobilen.">${icon('qr', 18)}<span>Visa QR-kod för fjärrkontrollen</span></button>`
        }`;
      return `
        <div class="hub-hero"><div class="hub-wave">📱</div><div><h3>Skepnad i mobilen</h3><p>Hela appen i telefonen: kameran, figurerna, rösterna, emojis och inspelning – dela direkt till Messenger, TikTok och YouTube.</p></div></div>
        ${section('Öppna Skepnad i mobilen', app)}
        ${section('Fjärrkontroll till datorn', `<p class="muted" style="margin:0 0 10px">Tryck på effekter, ljud och röster i mobilen medan datorn streamar.</p>${remote}`)}
        ${section('Tips', `<ul class="steps"><li>Dela ett klipp till mobilen: <b>Mina klipp</b> → <b>Dela</b>.</li><li>Messenger-appen i telefonen kan inte använda Skepnad som kamera – ring från datorn eller skicka klipp.</li></ul>`)}`;
    },
  },
};
