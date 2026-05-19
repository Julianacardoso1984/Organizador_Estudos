'use strict';

/**
 * GoogleCalendarService — Gerencia autenticação OAuth2 e comunicação com a API do Google Calendar.
 */
class GoogleCalendarService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.clientId = localStorage.getItem('googleClientId') || '223537957746-48mga3ou7vu38c88shmatllhmrog0uq9.apps.googleusercontent.com';
    this.customCalendarId = localStorage.getItem('googleCustomCalendarId') || '';
  }

  // Carrega bibliotecas de scripts do Google dinamicamente
  async loadScripts() {
    if (window.google?.accounts?.oauth2) return true;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google GSI carregado com sucesso.');
        resolve(true);
      };
      script.onerror = (e) => reject(new Error('Falha ao carregar Google Identity Services script.'));
      document.head.appendChild(script);
    });
  }

  setClientId(clientId) {
    this.clientId = clientId.trim();
    localStorage.setItem('googleClientId', this.clientId);
  }

  getClientId() {
    return this.clientId;
  }

  isAuthenticated() {
    return !!this.accessToken && this.tokenExpiry > Date.now();
  }

  // Faz login e solicita permissões
  async connect() {
    await this.loadScripts();

    if (!this.clientId) {
      throw new Error('Google Client ID não configurado.');
    }

    return new Promise((resolve, reject) => {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }

            this.accessToken = response.access_token;
            // Configurar expiração (ex: 3600 segundos)
            this.tokenExpiry = Date.now() + (parseInt(response.expires_in) || 3600) * 1000;
            
            // Buscar ou criar o calendário EstudaAí
            this.setupCustomCalendar()
              .then(() => resolve(true))
              .catch(err => reject(err));
          },
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (e) {
        reject(e);
      }
    });
  }

  disconnect() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.customCalendarId = '';
    localStorage.removeItem('googleCustomCalendarId');
  }

  // Requisição auxiliar para a API do Google Calendar
  async _request(endpoint, options = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Não autenticado com o Google Calendar.');
    }

    const url = `https://www.googleapis.com/calendar/v3${endpoint}`;
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null; // No content
    return response.json();
  }

  // Busca ou cria o calendário secundário 'EstudaAí — Cronograma'
  async setupCustomCalendar() {
    try {
      // 1. Listar calendários
      const list = await this._request('/users/me/calendarList');
      const found = list.items?.find(c => c.summary === 'EstudaAí — Cronograma');

      if (found) {
        this.customCalendarId = found.id;
        localStorage.setItem('googleCustomCalendarId', this.customCalendarId);
        return;
      }

      // 2. Criar se não existir
      const newCal = await this._request('/calendars', {
        method: 'POST',
        body: JSON.stringify({
          summary: 'EstudaAí — Cronograma',
          description: 'Calendário de estudos sincronizado automaticamente pelo app EstudaAí.'
        })
      });

      this.customCalendarId = newCal.id;
      localStorage.setItem('googleCustomCalendarId', this.customCalendarId);
    } catch (e) {
      console.error('Falha ao configurar calendário customizado:', e);
      throw e;
    }
  }

  // Busca eventos do Google Calendar
  async fetchEvents(timeMin, timeMax) {
    if (!this.customCalendarId) return [];

    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      singleEvents: 'true',
      maxResults: '250'
    });
    if (timeMax) params.append('timeMax', timeMax);

    const data = await this._request(`/calendars/${this.customCalendarId}/events?${params.toString()}`);
    return data.items || [];
  }

  // Envia um evento local para o Google Calendar
  async pushEvent(event, subjectName) {
    if (!this.customCalendarId) return null;

    const payload = this._formatEventPayload(event, subjectName);

    if (event.googleEventId) {
      // Atualizar existente
      try {
        const updated = await this._request(`/calendars/${this.customCalendarId}/events/${event.googleEventId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        return updated.id;
      } catch (e) {
        // Se o evento foi removido da agenda pelo usuário no Google, criar novamente
        if (e.message.includes('Not Found') || e.message.includes('404')) {
          const created = await this._request(`/calendars/${this.customCalendarId}/events`, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          return created.id;
        }
        throw e;
      }
    } else {
      // Criar novo
      const created = await this._request(`/calendars/${this.customCalendarId}/events`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return created.id;
    }
  }

  // Remove um evento no Google Calendar
  async deleteEvent(googleEventId) {
    if (!this.customCalendarId || !googleEventId) return;
    try {
      await this._request(`/calendars/${this.customCalendarId}/events/${googleEventId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      // Ignorar se já foi excluído no Google
      if (!e.message.includes('Not Found') && !e.message.includes('404') && !e.message.includes('gone')) {
        throw e;
      }
    }
  }

  // Cria um documento no Google Docs e insere o conteúdo dos blocos
  async exportToGoogleDocs(page) {
    if (!this.isAuthenticated()) {
      throw new Error('Não autenticado com a conta do Google.');
    }

    // 1. Criar o documento com o título da página
    const createUrl = 'https://docs.googleapis.com/v1/documents';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: page.title
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ao criar documento: ${createRes.status}`);
    }

    const doc = await createRes.json();
    const documentId = doc.documentId;

    // 2. Construir batchUpdate com os blocos em ordem
    let currentIndex = 1;
    const requests = [];

    // Título no início
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: page.title + '\n\n'
      }
    });
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + page.title.length
        },
        paragraphStyle: {
          namedStyleType: 'HEADING_1'
        },
        fields: 'namedStyleType'
      }
    });
    currentIndex += page.title.length + 2;

    // Blocos da página
    for (const block of page.blocks) {
      if (block.type === 'divider') {
        const divText = '--------------------------------------------------\n\n';
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: divText
          }
        });
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + divText.length - 2
            },
            textStyle: {
              color: {
                color: {
                  rgbColor: { red: 0.5, green: 0.5, blue: 0.5 }
                }
              }
            },
            fields: 'color'
          }
        });
        currentIndex += divText.length;
        continue;
      }

      let prefix = '';
      if (block.type === 'bullet') prefix = '• ';
      else if (block.type === 'numbered') prefix = '1. ';
      else if (block.type === 'checkbox') prefix = block.checked ? '[X] ' : '[ ] ';

      const rawContent = (block.content || '').trim();
      const textToInsert = prefix + rawContent + '\n\n';
      
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: textToInsert
        }
      });

      let namedStyle = 'NORMAL_TEXT';
      if (block.type === 'h1') namedStyle = 'HEADING_1';
      else if (block.type === 'h2') namedStyle = 'HEADING_2';
      else if (block.type === 'h3') namedStyle = 'HEADING_3';

      if (namedStyle !== 'NORMAL_TEXT') {
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + prefix.length + rawContent.length
            },
            paragraphStyle: {
              namedStyleType: namedStyle
            },
            fields: 'namedStyleType'
          }
        });
      }

      if (block.type === 'quote') {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + rawContent.length
            },
            textStyle: {
              italic: true,
              color: {
                color: {
                  rgbColor: { red: 0.3, green: 0.3, blue: 0.3 }
                }
              }
            },
            fields: 'italic,color'
          }
        });
      }

      currentIndex += textToInsert.length;
    }

    // 3. Executar o batchUpdate
    if (requests.length > 0) {
      const updateUrl = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`;
      const updateRes = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests
        })
      });

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Erro ao formatar documento: ${updateRes.status}`);
      }
    }

    return `https://docs.google.com/document/d/${documentId}/edit`;
  }

  // Formata o payload no padrão Google API
  _formatEventPayload(event, subjectName) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    const payload = {
      summary: event.title,
      description: `${event.notes || ''}\n\nMatéria: ${subjectName || 'Geral'}\nTipo: ${this._translateType(event.type)}\nCriado via EstudaAí.`,
    };

    // Eventos sem duração ou tarefas (deadlines) são tratados como All-day
    if (!event.duration || event.duration === 0) {
      payload.start = { date: event.date };
      
      // Data final no Google Calendar é exclusiva, então somamos 1 dia
      const startDate = new Date(event.date + 'T00:00:00');
      startDate.setDate(startDate.getDate() + 1);
      const nextDayStr = startDate.toISOString().slice(0, 10);
      payload.end = { date: nextDayStr };
    } else {
      // Evento com hora marcada
      const startDateTime = `${event.date}T09:00:00`; // Começa às 9h por padrão
      const startObj = new Date(startDateTime);
      const endObj = new Date(startObj.getTime() + event.duration * 60 * 1000);

      // Converte data local para formato ISO correto com timezone do browser
      const toISOStringWithTimezone = (date) => {
        const tzOffset = -date.getTimezoneOffset();
        const diff = tzOffset >= 0 ? '+' : '-';
        const pad = (num) => String(num).padStart(2, '0');
        return date.getFullYear() +
          '-' + pad(date.getMonth() + 1) +
          '-' + pad(date.getDate()) +
          'T' + pad(date.getHours()) +
          ':' + pad(date.getMinutes()) +
          ':' + pad(date.getSeconds()) +
          diff + pad(Math.abs(Math.floor(tzOffset / 60))) +
          ':' + pad(Math.abs(tzOffset % 60));
      };

      payload.start = { dateTime: toISOStringWithTimezone(startObj), timeZone };
      payload.end = { dateTime: toISOStringWithTimezone(endObj), timeZone };
    }

    return payload;
  }

  _translateType(type) {
    const names = { study: 'Estudo 📖', review: 'Revisão 🔄', exam: 'Prova 📝', deadline: 'Prazo Limite ⏰' };
    return names[type] || 'Estudo 📖';
  }
}

// Exportar instância única global
window.GoogleCalendar = new GoogleCalendarService();
