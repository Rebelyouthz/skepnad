// node hfgen.mjs <utfil> "<prompt>" [space]
import { Client } from '@gradio/client';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const token = execSync(`powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('HF_TOKEN','User')"`).toString().trim();
const [out, prompt, space = 'black-forest-labs/FLUX.1-Krea-dev'] = process.argv.slice(2);
const app = await Client.connect(space, { token });
const api = await app.view_api();
const ep = Object.keys(api.named_endpoints)[0];
const params = api.named_endpoints[ep].parameters.map((p) => p.parameter_name);
const all = { prompt, seed: Math.floor(Math.random() * 1e6), randomize_seed: true, width: 832, height: 1024, guidance_scale: 4.5, num_inference_steps: space.includes('schnell') ? 4 : 28 };
const res = await app.predict(ep, Object.fromEntries(params.filter((p) => p in all).map((p) => [p, all[p]])));
const img = res.data.find((d) => d?.url) ?? res.data[0];
const buf = Buffer.from(await (await fetch(img.url, { headers: { Authorization: `Bearer ${token}` } })).arrayBuffer());
writeFileSync(out, buf);
console.log('ok', ep, out, buf.length);
process.exit(0);
