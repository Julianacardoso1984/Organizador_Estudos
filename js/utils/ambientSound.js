'use strict';

/**
 * AmbientSoundSynthesizer — Sintetizador de sons ambientais de foco programático (offline e em tempo real) via Web Audio API.
 */
class AmbientSoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.playing = { rain: false, wind: false, binaural: false, campfire: false, waves: false };
    
    // Nodes
    this.nodes = {
      rainSource: null, rainGain: null,
      windSource: null, windGain: null, windFilter: null, windLFO: null,
      binOscL: null, binOscR: null, binGain: null,
      campfireSource: null, campfireGain: null, campfireInterval: null,
      wavesSource: null, wavesGain: null, wavesFilter: null, wavesLFO: null
    };

    // Volumes padrão
    this.volumes = { rain: 0.3, wind: 0.3, binaural: 0.2, campfire: 0.3, waves: 0.3 };
  }

  _initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(type, val) {
    this.volumes[type] = parseFloat(val);
    if (type === 'rain' && this.nodes.rainGain) {
      this.nodes.rainGain.gain.setValueAtTime(this.volumes.rain, this.ctx.currentTime);
    }
    if (type === 'wind' && this.nodes.windGain) {
      this.nodes.windGain.gain.setValueAtTime(this.volumes.wind, this.ctx.currentTime);
    }
    if (type === 'binaural' && this.nodes.binGain) {
      this.nodes.binGain.gain.setValueAtTime(this.volumes.binaural, this.ctx.currentTime);
    }
    if (type === 'campfire' && this.nodes.campfireGain) {
      this.nodes.campfireGain.gain.setValueAtTime(this.volumes.campfire, this.ctx.currentTime);
    }
    if (type === 'waves' && this.nodes.wavesGain) {
      this.nodes.wavesGain.gain.setValueAtTime(this.volumes.waves, this.ctx.currentTime);
    }
  }

  toggle(type) {
    this._initContext();
    if (this.playing[type]) {
      this.stop(type);
    } else {
      this.start(type);
    }
    return this.playing[type];
  }

  start(type) {
    this._initContext();
    if (this.playing[type]) return;

    if (type === 'rain') {
      this._startRain();
    } else if (type === 'wind') {
      this._startWind();
    } else if (type === 'binaural') {
      this._startBinaural();
    } else if (type === 'campfire') {
      this._startCampfire();
    } else if (type === 'waves') {
      this._startWaves();
    }

    this.playing[type] = true;
  }

  stop(type) {
    if (!this.playing[type]) return;

    if (type === 'rain' && this.nodes.rainSource) {
      this.nodes.rainSource.stop();
      this.nodes.rainSource = null;
      this.nodes.rainGain = null;
    } else if (type === 'wind') {
      if (this.nodes.windSource) this.nodes.windSource.stop();
      if (this.nodes.windLFO) this.nodes.windLFO.stop();
      this.nodes.windSource = null;
      this.nodes.windLFO = null;
      this.nodes.windFilter = null;
      this.nodes.windGain = null;
    } else if (type === 'binaural') {
      if (this.nodes.binOscL) this.nodes.binOscL.stop();
      if (this.nodes.binOscR) this.nodes.binOscR.stop();
      this.nodes.binOscL = null;
      this.nodes.binOscR = null;
      this.nodes.binGain = null;
    } else if (type === 'campfire') {
      if (this.nodes.campfireSource) this.nodes.campfireSource.stop();
      if (this.nodes.campfireInterval) clearInterval(this.nodes.campfireInterval);
      this.nodes.campfireSource = null;
      this.nodes.campfireInterval = null;
      this.nodes.campfireGain = null;
    } else if (type === 'waves') {
      if (this.nodes.wavesSource) this.nodes.wavesSource.stop();
      if (this.nodes.wavesLFO) this.nodes.wavesLFO.stop();
      this.nodes.wavesSource = null;
      this.nodes.wavesLFO = null;
      this.nodes.wavesFilter = null;
      this.nodes.wavesGain = null;
    }

    this.playing[type] = false;
  }

  stopAll() {
    this.stop('rain');
    this.stop('wind');
    this.stop('binaural');
    this.stop('campfire');
    this.stop('waves');
  }

  _startRain() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumes.rain, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(0);
    this.nodes.rainSource = source;
    this.nodes.rainGain = gainNode;
  }

  _startWind() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.015 * white)) / 1.015;
      lastOut = output[i];
      output[i] *= 4.0;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 2.0;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 250;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumes.wind, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(0);
    lfo.start(0);

    this.nodes.windSource = source;
    this.nodes.windLFO = lfo;
    this.nodes.windFilter = filter;
    this.nodes.windGain = gainNode;
  }

  _startBinaural() {
    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.value = 200;

    const pannerL = this.ctx.createStereoPanner();
    pannerL.pan.value = -1;

    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.value = 210;

    const pannerR = this.ctx.createStereoPanner();
    pannerR.pan.value = 1;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumes.binaural, this.ctx.currentTime);

    oscL.connect(pannerL);
    pannerL.connect(gainNode);

    oscR.connect(pannerR);
    pannerR.connect(gainNode);

    gainNode.connect(this.ctx.destination);

    oscL.start(0);
    oscR.start(0);

    this.nodes.binOscL = oscL;
    this.nodes.binOscR = oscR;
    this.nodes.binGain = gainNode;
  }

  _startCampfire() {
    // 1. Som de rumble baixo (ruído marrom passa-baixas pesado)
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.03 * white)) / 1.03;
      lastOut = output[i];
      output[i] *= 3.0;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180; // Apenas roncado baixo

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumes.campfire * 0.6, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);

    this.nodes.campfireSource = source;
    this.nodes.campfireGain = gainNode;

    // 2. Agendador de estalos/pops periódicos de alta frequência
    this.nodes.campfireInterval = setInterval(() => {
      if (!this.playing.campfire) return;
      
      const osc = this.ctx.createOscillator();
      const popFilter = this.ctx.createBiquadFilter();
      const popGain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60 + Math.random() * 200, this.ctx.currentTime);
      
      popFilter.type = 'bandpass';
      popFilter.frequency.setValueAtTime(1400 + Math.random() * 1200, this.ctx.currentTime);
      popFilter.Q.value = 1.2;

      popGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      popGain.gain.linearRampToValueAtTime(this.volumes.campfire * (0.2 + Math.random() * 0.45), this.ctx.currentTime + 0.003);
      popGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.02 + Math.random() * 0.04);

      osc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }, 280);
  }

  _startWaves() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.018 * white)) / 1.018;
      lastOut = output[i];
      output[i] *= 3.8;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    // Filtro passa-faixa dinâmico
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    // LFO lento para ondas: 1 ciclo a cada 14 segundos
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07; 

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 350; // Sweeps from 150Hz to 850Hz

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumes.waves, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(0);
    lfo.start(0);

    this.nodes.wavesSource = source;
    this.nodes.wavesLFO = lfo;
    this.nodes.wavesFilter = filter;
    this.nodes.wavesGain = gainNode;
  }
}
