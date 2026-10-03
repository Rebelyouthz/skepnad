// Nybörjarguider: korta steg med knappar som gör jobbet åt en.
import { openModal } from './fx.js';
import { icon } from './icons.js';
import { bindAll } from './bind.js';

const step = (n, title, text, extra = '') => `<div class="wz-step"><span class="wz-n">${n}</span><div><b>${title}</b><small>${text}</small>${extra}</div></div>`;

const GUIDES = {
  record: (ctx) => ({
    title: 'Spela in ett klipp',
    icon: 'clapper',
    html: `<div class="wizard">
      ${step(1, 'Välj utseende', 'Välj en skepnad, avatar eller bakgrund – eller behåll den du har.', `<button class="btn sm" data-g="tab:personas">${icon('drama', 15)}<span>Välj skepnad</span></button>`)}
      ${step(
        2,
        'Välj format',
        'Stående för TikTok, YouTube Shorts och Instagram Reels. Liggande för vanliga YouTube-videor.',
        `<div class="seg" data-seg="video.aspect" style="margin-top:6px"><button data-value="portrait">${icon('portrait', 15)}<span>Stående 9:16</span></button><button data-value="landscape">${icon('landscape', 15)}<span>Liggande 16:9</span></button></div>`,
      )}
      ${step(3, 'Spela in', 'Tryck på knappen – eller tangenten <kbd>R</kbd>. Tryck igen för att stoppa.', `<button class="btn btn-primary" data-g="record">${icon('rec', 16)}<span>${ctx.recording() ? 'Stoppa inspelningen' : 'Börja spela in nu'}</span></button>`)}
      ${step(4, 'Dela!', 'När du stoppar får du knappar för att dela, kopiera till chatten eller lägga upp på YouTube. Allt finns sedan i <b>Mina klipp</b>.', `<button class="btn sm" data-g="tab:clips">${icon('clapper', 15)}<span>Mina klipp</span></button>`)}
    </div>`,
  }),
  youtube: () => ({
    title: 'Lägg upp på YouTube',
    icon: 'upload',
    html: `<div class="wizard">
      ${step(1, 'Spela in ett klipp', 'Stående klipp under 3 minuter blir automatiskt <b>YouTube Shorts</b>.', `<button class="btn sm" data-g="guide:record">${icon('clapper', 15)}<span>Så spelar du in</span></button>`)}
      ${step(2, 'Gå till Mina klipp', 'Klicka på <b>YouTube</b> vid klippet du vill lägga upp.', `<button class="btn sm" data-g="tab:clips">${icon('clapper', 15)}<span>Mina klipp</span></button>`)}
      ${step(3, 'Dra in filen', 'YouTube öppnas och mappen med klippet visas. Dra filen in i YouTube-fönstret (eller klicka <b>Välj filer</b>).')}
      ${step(4, 'Fyll i och publicera', 'Skriv en titel, välj om videon är för barn (oftast <b>Nej</b>) och klicka <b>Publicera</b>. Klart!')}
    </div>
    <div class="note" style="margin-top:12px">${icon('info', 15)}<span>Vill du sända live på YouTube istället? Gå till fliken <b>Live</b>.</span></div>`,
  }),
};

export function openGuide(id, ctx) {
  const g = GUIDES[id]?.(ctx);
  if (!g) return;
  openModal({
    title: g.title,
    iconName: g.icon,
    content: g.html,
    onMount(root, close) {
      const unbind = bindAll(root, ctx.store);
      new MutationObserver(() => !root.isConnected && unbind()).observe(document.body, { childList: true });
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-g]');
        if (!b) return;
        const [cmd, arg] = b.dataset.g.split(':');
        if (cmd === 'tab') {
          close();
          ctx.showTab(arg);
        } else if (cmd === 'record') {
          close();
          ctx.record();
        } else if (cmd === 'guide') {
          close();
          openGuide(arg, ctx);
        }
      });
    },
  });
}
