(() => {
  const INSTRUMENT_ICONS = {
    click: '🥁', voz: '🎤', violao: '🎸', guitarra: '🎸',
    baixo: '🎸', teclado: '🎹', bateria: '🥁', metronomo: '⏱️', outro: '🎵'
  };

  const params = new URLSearchParams(location.search);
  const vsId = params.get('vs');
  const musicaId = params.get('musica');
  const scheduleId = params.get('schedule');
  const instrumento = params.get('instrumento');

  const state = {
    tracks: [],
    buffers: [],
    sources: [],
    gainNodes: [],
    context: null,
    isPlaying: false,
    startedAt: 0,
    pausedAt: 0,
    duration: 0,
    tempo: 1.0,
    masterVolume: 1.0,
    mutedTracks: new Set(),
    soloTracks: new Set()
  };

  const prefKey = `louva.mt.${vsId || 'default'}`;
  const savedPrefs = JSON.parse(localStorage.getItem(prefKey) || '{}');
  if (instrumento) state.mutedTracks.add(instrumento.toLowerCase());

  function showToast(msg, type = 'info') {
    const t = document.getElementById('mt-toast');
    t.textContent = msg;
    t.className = `mt-toast show ${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  async function init() {
    if (!vsId) {
      showError('ID do multitrack nao fornecido. Use ?vs=ID');
      return;
    }
    try {
      const tracks = await API.get(`/multitracks?vs_id=${vsId}`);
      if (!tracks || tracks.length === 0) {
        showError('Este VS nao tem faixas cadastradas.');
        return;
      }
      state.tracks = tracks;
      state.mutedTracks = new Set(savedPrefs.muted || []);
      state.soloTracks = new Set(savedPrefs.solo || []);

      const vs = await API.get(`/vs/${vsId}`).catch(() => null);
      const titulo = vs?.nome || 'Multitrack';
      document.getElementById('mt-title').textContent = titulo;
      document.getElementById('mt-subtitle').textContent = `${tracks.length} faixas sincronizadas`;

      await loadAllTracks();
      renderTracks();
      document.getElementById('mt-loading').classList.add('hidden');
      document.getElementById('mt-player').classList.remove('hidden');
      wireEvents();
    } catch (e) {
      showError(e.message);
    }
  }

  function showError(msg) {
    document.getElementById('mt-loading').classList.add('hidden');
    document.getElementById('mt-error').classList.remove('hidden');
    document.getElementById('mt-error-msg').textContent = msg;
  }

  async function loadAllTracks() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.context = new AudioCtx();

    const promises = state.tracks.map(async (track) => {
      try {
        const res = await fetch(track.url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = await state.context.decodeAudioData(arrayBuffer);
        return { track, buffer, ok: true };
      } catch (e) {
        console.error('Erro ao carregar', track.label, e);
        return { track, buffer: null, ok: false, error: e.message };
      }
    });

    const results = await Promise.all(promises);
    state.buffers = results.map(r => r.buffer);
    state.tracks = results.map(r => ({ ...r.track, _error: r.error, _ok: r.ok }));

    const valid = state.buffers.filter(b => b);
    if (valid.length === 0) throw new Error('Nenhuma faixa pode ser carregada. Verifique as URLs.');
    state.duration = Math.max(...valid.map(b => b.duration));
  }

  function renderTracks() {
    const container = document.getElementById('mt-tracks');
    container.innerHTML = '';
    state.tracks.forEach((track, i) => {
      const div = document.createElement('div');
      div.className = 'mt-track';
      div.dataset.idx = i;
      if (state.mutedTracks.has(track.instrumento)) div.classList.add('muted');
      if (state.soloTracks.has(track.instrumento)) div.classList.add('solo');
      if (!track._ok) div.classList.add('loading');
      const isMuted = state.mutedTracks.has(track.instrumento);
      const isSolo = state.soloTracks.has(track.instrumento);
      const vol = savedPrefs.volumes?.[i] ?? track.volume_padrao ?? 80;
      div.innerHTML = `
        <div class="mt-track-icon">${INSTRUMENT_ICONS[track.instrumento] || '🎵'}</div>
        <div class="mt-track-info">
          <div class="mt-track-label">${escapeHtml(track.label || track.instrumento)}</div>
          <div class="mt-track-status">
            <span>${track._ok ? '<span class="level">pronto</span>' : `<span style="color:var(--danger)">erro: ${escapeHtml(track._error || 'desconhecido')}</span>`}</span>
            <span>·</span>
            <span>${track.instrumento}</span>
          </div>
        </div>
        <div class="mt-track-controls">
          <input type="range" class="mt-track-vol" min="0" max="100" value="${vol}" data-idx="${i}">
          <button class="mt-btn-toggle mt-mute ${isMuted ? 'muted' : ''}" data-idx="${i}" title="Mutar">${isMuted ? '🔇' : '🔊'}</button>
          <button class="mt-btn-toggle mt-solo ${isSolo ? 'solo' : ''}" data-idx="${i}" title="Solo">S</button>
        </div>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll('.mt-mute').forEach(btn => {
      btn.onclick = () => toggleMute(parseInt(btn.dataset.idx));
    });
    container.querySelectorAll('.mt-solo').forEach(btn => {
      btn.onclick = () => toggleSolo(parseInt(btn.dataset.idx));
    });
    container.querySelectorAll('.mt-track-vol').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(input.dataset.idx);
        const v = parseInt(e.target.value) / 100;
        if (state.gainNodes[idx]) state.gainNodes[idx].gain.value = v;
        savedPrefs.volumes = savedPrefs.volumes || {};
        savedPrefs.volumes[idx] = parseInt(e.target.value);
        savePrefs();
      };
    });
  }

  function toggleMute(idx) {
    const instr = state.tracks[idx].instrumento;
    if (state.mutedTracks.has(instr)) state.mutedTracks.delete(instr);
    else state.mutedTracks.add(instr);
    applyGains();
    savePrefs();
    updateTrackUI(idx);
  }

  function toggleSolo(idx) {
    const instr = state.tracks[idx].instrumento;
    if (state.soloTracks.has(instr)) state.soloTracks.delete(instr);
    else state.soloTracks.add(instr);
    applyGains();
    savePrefs();
    updateTrackUI(idx);
  }

  function updateTrackUI(idx) {
    const track = state.tracks[idx];
    const div = document.querySelector(`.mt-track[data-idx="${idx}"]`);
    if (!div) return;
    const isMuted = state.mutedTracks.has(track.instrumento);
    const isSolo = state.soloTracks.has(track.instrumento);
    div.classList.toggle('muted', isMuted);
    div.classList.toggle('solo', isSolo);
    const muteBtn = div.querySelector('.mt-mute');
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    const soloBtn = div.querySelector('.mt-solo');
    soloBtn.classList.toggle('solo', isSolo);
  }

  function applyGains() {
    state.gainNodes.forEach((g, i) => {
      if (!g) return;
      const track = state.tracks[i];
      const vol = (savedPrefs.volumes?.[i] ?? track.volume_padrao ?? 80) / 100;
      const isMuted = state.mutedTracks.has(track.instrumento);
      const hasSolo = state.soloTracks.size > 0;
      const isSolo = state.soloTracks.has(track.instrumento);
      let gain = vol * state.masterVolume;
      if (isMuted) gain = 0;
      else if (hasSolo && !isSolo) gain = 0;
      g.gain.value = gain;
    });
  }

  function savePrefs() {
    savedPrefs.muted = Array.from(state.mutedTracks);
    savedPrefs.solo = Array.from(state.soloTracks);
    localStorage.setItem(prefKey, JSON.stringify(savedPrefs));
  }

  function play() {
    if (state.context.state === 'suspended') state.context.resume();
    stop(false);

    const startOffset = state.pausedAt;
    state.startedAt = state.context.currentTime - startOffset;
    state.sources = [];
    state.gainNodes = [];

    state.tracks.forEach((track, i) => {
      if (!state.buffers[i]) return;
      const source = state.context.createBufferSource();
      source.buffer = state.buffers[i];
      source.playbackRate.value = state.tempo;
      const gain = state.context.createGain();
      gain.gain.value = 0;
      source.connect(gain).connect(state.context.destination);
      source.start(0, startOffset);
      state.sources.push(source);
      state.gainNodes.push(gain);
    });

    applyGains();
    state.isPlaying = true;
    document.getElementById('mt-play').innerHTML = '&#10073;&#10073;';
    document.getElementById('mt-play').classList.add('playing');
    requestAnimationFrame(updateProgress);
    if (state.sources[0]) {
      state.sources[0].onended = () => {
        if (state.isPlaying) stop(true);
      };
    }
  }

  function pause() {
    if (!state.isPlaying) return;
    state.pausedAt = state.context.currentTime - state.startedAt;
    stop(false);
  }

  function stop(natural = false) {
    state.sources.forEach(s => { try { s.stop(); } catch (e) {} });
    state.sources = [];
    state.gainNodes = [];
    if (natural) {
      state.pausedAt = 0;
      state.isPlaying = false;
      document.getElementById('mt-play').innerHTML = '&#9654;';
      document.getElementById('mt-play').classList.remove('playing');
    } else {
      state.isPlaying = false;
      document.getElementById('mt-play').innerHTML = '&#9654;';
      document.getElementById('mt-play').classList.remove('playing');
    }
  }

  function updateProgress() {
    if (!state.isPlaying) return;
    const elapsed = state.context.currentTime - state.startedAt;
    const progress = Math.min(elapsed / state.duration, 1);
    document.getElementById('mt-progress-fill').style.width = (progress * 100) + '%';
    document.getElementById('mt-progress-handle').style.left = (progress * 100) + '%';
    document.getElementById('mt-time').textContent = `${fmtTime(elapsed)} / ${fmtTime(state.duration)}`;
    if (elapsed >= state.duration) {
      stop(true);
      document.getElementById('mt-progress-fill').style.width = '0%';
      return;
    }
    requestAnimationFrame(updateProgress);
  }

  function seek(percent) {
    const wasPlaying = state.isPlaying;
    if (wasPlaying) stop(false);
    state.pausedAt = Math.max(0, Math.min(percent * state.duration, state.duration - 0.1));
    if (wasPlaying) play();
    else {
      document.getElementById('mt-progress-fill').style.width = (percent * 100) + '%';
      document.getElementById('mt-time').textContent = `${fmtTime(state.pausedAt)} / ${fmtTime(state.duration)}`;
    }
  }

  function wireEvents() {
    document.getElementById('mt-play').onclick = () => state.isPlaying ? pause() : play();
    document.getElementById('mt-stop').onclick = () => { stop(true); state.pausedAt = 0; document.getElementById('mt-progress-fill').style.width = '0%'; document.getElementById('mt-time').textContent = `0:00 / ${fmtTime(state.duration)}`; };

    document.getElementById('mt-tempo').oninput = (e) => {
      state.tempo = parseInt(e.target.value) / 100;
      document.getElementById('mt-tempo-val').textContent = e.target.value;
      state.sources.forEach(s => s.playbackRate.value = state.tempo);
    };

    document.getElementById('mt-master-vol').oninput = (e) => {
      state.masterVolume = parseInt(e.target.value) / 100;
      applyGains();
    };

    const progress = document.getElementById('mt-progress');
    let dragging = false;
    const onSeek = (e) => {
      const rect = progress.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      seek(percent);
    };
    progress.addEventListener('mousedown', (e) => { dragging = true; onSeek(e); });
    document.addEventListener('mousemove', (e) => dragging && onSeek(e));
    document.addEventListener('mouseup', () => dragging = false);
    progress.addEventListener('touchstart', (e) => { dragging = true; onSeek(e); e.preventDefault(); }, { passive: false });
    progress.addEventListener('touchmove', (e) => dragging && onSeek(e), { passive: false });
    progress.addEventListener('touchend', () => dragging = false);

    document.getElementById('mt-mute-all').onclick = () => {
      state.tracks.forEach((_, i) => state.mutedTracks.add(state.tracks[i].instrumento));
      applyGains(); savePrefs();
      state.tracks.forEach((_, i) => updateTrackUI(i));
      showToast('Todas as faixas mutadas', 'info');
    };
    document.getElementById('mt-unmute-all').onclick = () => {
      state.mutedTracks.clear(); state.soloTracks.clear();
      applyGains(); savePrefs();
      state.tracks.forEach((_, i) => updateTrackUI(i));
      showToast('Tudo desmutado', 'success');
    };
    document.getElementById('mt-reset').onclick = () => {
      savedPrefs.volumes = {};
      state.mutedTracks.clear(); state.soloTracks.clear();
      savePrefs();
      document.querySelectorAll('.mt-track-vol').forEach((inp, i) => {
        inp.value = state.tracks[i].volume_padrao || 80;
        if (state.gainNodes[i]) state.gainNodes[i].gain.value = (state.tracks[i].volume_padrao || 80) / 100;
      });
      applyGains();
      state.tracks.forEach((_, i) => updateTrackUI(i));
      showToast('Mix resetado', 'info');
    };

    document.getElementById('mt-fullscreen').onclick = () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
      } else {
        document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      }
    };

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); state.isPlaying ? pause() : play(); }
      if (e.code === 'KeyR') { document.getElementById('mt-reset').click(); }
      if (e.code === 'KeyM') { document.getElementById('mt-mute-all').click(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
