// Lucide-ikoner (bara de som används, för liten bundle).
import {
  createElement,
  Drama, Bot, Image, WandSparkles, Glasses, AudioWaveform, Drum, PartyPopper, Layers, RadioTower, Settings, Circle,
  Camera, ExternalLink, EyeOff, Eye, Volume2, VolumeX, CircleQuestionMark, Mic, MicOff, Video, VideoOff, Sparkles, User,
  Save, Trash, Upload, Play, Square, X, Check, Keyboard, Lock, Info, Zap, SlidersHorizontal, Palette, Music, Headphones,
  Cast, Maximize, RefreshCcw, Heart, Flame, Tv, ScanFace, Mountain, Film, MessageSquare, Clock, Radio, MonitorUp, Hand,
  Wand, Download, Gauge, Shuffle, Plus, CircleDot, Rocket, Gamepad2, Crown, Cpu, Activity, Ghost, ChevronRight,
  ChevronLeft, Captions, Frame, ScanEye, Wifi, WifiOff, Theater, Send, Signal, ImagePlus, Box, Sun, Contrast, Droplets,
  Thermometer, Crosshair, MousePointerClick, BookOpen,
} from 'lucide';

const ICONS = {
  drama: Drama, bot: Bot, image: Image, 'wand-sparkles': WandSparkles, glasses: Glasses, waveform: AudioWaveform, drum: Drum,
  party: PartyPopper, layers: Layers, tower: RadioTower, settings: Settings, circle: Circle, camera: Camera, external: ExternalLink,
  'eye-off': EyeOff, eye: Eye, volume: Volume2, mute: VolumeX, help: CircleQuestionMark, mic: Mic, 'mic-off': MicOff, video: Video,
  'video-off': VideoOff, sparkles: Sparkles, user: User, save: Save, trash: Trash, upload: Upload, play: Play, stop: Square, x: X,
  check: Check, keyboard: Keyboard, lock: Lock, info: Info, zap: Zap, sliders: SlidersHorizontal, palette: Palette, music: Music,
  headphones: Headphones, cast: Cast, maximize: Maximize, reset: RefreshCcw, heart: Heart, flame: Flame, tv: Tv, face: ScanFace,
  mountain: Mountain, film: Film, chat: MessageSquare, clock: Clock, radio: Radio, monitor: MonitorUp, hand: Hand, wand: Wand,
  download: Download, gauge: Gauge, shuffle: Shuffle, plus: Plus, rec: CircleDot, rocket: Rocket, gamepad: Gamepad2, crown: Crown,
  cpu: Cpu, activity: Activity, ghost: Ghost, next: ChevronRight, prev: ChevronLeft, captions: Captions, frame: Frame,
  'scan-eye': ScanEye, wifi: Wifi, 'wifi-off': WifiOff, theater: Theater, send: Send, signal: Signal, 'image-plus': ImagePlus,
  box: Box, sun: Sun, contrast: Contrast, droplets: Droplets, thermometer: Thermometer, crosshair: Crosshair,
  pointer: MousePointerClick, book: BookOpen,
};

const cache = new Map();

/** SVG-markup för en ikon. */
export function icon(name, size = 18) {
  const key = `${name}:${size}`;
  if (!cache.has(key)) {
    const node = ICONS[name];
    if (!node) return '';
    const el = createElement(node, { width: size, height: size, 'stroke-width': 1.9, class: 'ico', 'aria-hidden': 'true' });
    cache.set(key, el.outerHTML);
  }
  return cache.get(key);
}
