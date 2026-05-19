'use strict';

/**
 * SpotifyService — Gerencia autenticação OAuth 2.0 PKCE com o Spotify
 * e busca as playlists do usuário conectado.
 */
class SpotifyService {
  constructor() {
    this.SCOPES = 'playlist-read-private playlist-read-collaborative user-read-private user-read-email';
    // Always use the exact origin root — must match Spotify Dashboard Redirect URI exactly
    this.REDIRECT_URI = window.location.origin + '/';

    this._config = Storage.get('spotify_config') || {
      clientId: '',
      selectedPlaylistId: '',
      selectedPlaylistName: '',
      selectedPlaylistEmbed: ''
    };

    this._token = Storage.get('spotify_token') || null;
    this._tokenExpiry = Storage.get('spotify_token_expiry') || 0;
    this._user = Storage.get('spotify_user') || null;
  }

  // ── Config ────────────────────────────────────────────────────────────────

  getClientId() { return this._config.clientId || ''; }
  getSelectedPlaylist() { return this._config; }

  saveClientId(clientId) {
    this._config.clientId = clientId;
    Storage.set('spotify_config', this._config);
  }

  saveSelectedPlaylist(id, name, embedUrl) {
    this._config.selectedPlaylistId = id;
    this._config.selectedPlaylistName = name;
    this._config.selectedPlaylistEmbed = embedUrl;
    Storage.set('spotify_config', this._config);
    // Also update the generic spotify_playlist key used by TimerView
    Storage.set('spotify_playlist', `https://open.spotify.com/playlist/${id}`);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  isAuthenticated() {
    return !!this._token && Date.now() < this._tokenExpiry;
  }

  getUser() { return this._user; }

  async login() {
    const clientId = this._config.clientId;
    if (!clientId) throw new Error('Client ID do Spotify não configurado.');

    const codeVerifier = this._generateCodeVerifier();
    const codeChallenge = await this._generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: this.REDIRECT_URI,
      scope: this.SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state: 'spotify_auth'
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      console.error('Spotify auth error:', error);
      return false;
    }

    if (!code || state !== 'spotify_auth') return false;

    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) return false;

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      const body = new URLSearchParams({
        client_id: this._config.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.REDIRECT_URI,
        code_verifier: codeVerifier
      });

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);

      const data = await res.json();
      this._token = data.access_token;
      this._tokenExpiry = Date.now() + data.expires_in * 1000;

      Storage.set('spotify_token', this._token);
      Storage.set('spotify_token_expiry', this._tokenExpiry);

      sessionStorage.removeItem('spotify_code_verifier');

      // Fetch user profile
      await this._fetchUser();
      return true;
    } catch (e) {
      console.error('Spotify callback error:', e);
      return false;
    }
  }

  logout() {
    this._token = null;
    this._tokenExpiry = 0;
    this._user = null;
    Storage.set('spotify_token', null);
    Storage.set('spotify_token_expiry', 0);
    Storage.set('spotify_user', null);
  }

  // ── API ───────────────────────────────────────────────────────────────────

  async getUserPlaylists(limit = 50) {
    if (!this.isAuthenticated()) throw new Error('Não autenticado no Spotify.');

    const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${this._token}` }
    });

    if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
    const data = await res.json();
    return data.items || [];
  }

  async _fetchUser() {
    if (!this._token) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${this._token}` }
      });
      if (!res.ok) return;
      this._user = await res.json();
      Storage.set('spotify_user', this._user);
    } catch (e) {
      console.error('Spotify user fetch error:', e);
    }
  }

  // ── PKCE Helpers ──────────────────────────────────────────────────────────

  _generateCodeVerifier() {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async _generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

window.Spotify = new SpotifyService();
