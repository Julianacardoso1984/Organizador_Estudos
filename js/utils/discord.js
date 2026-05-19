'use strict';

/**
 * DiscordService — Gerencia configurações do Webhook do Discord e envio de notificações em formato Embed.
 */
class DiscordService {
  constructor() {
    this.config = Storage.get('discord_config') || {
      webhookUrl: '',
      username: 'EstudaAí Bot',
      notifyPomodoro: true,
      notifyTask: true,
      notifyNotes: true,
      notifyMindMap: true,
      chatServerId: '',
      chatChannelId: ''
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    Storage.set('discord_config', this.config);
  }

  isEnabled(eventKey) {
    if (!this.config.webhookUrl) return false;
    if (eventKey === 'pomodoro') return !!this.config.notifyPomodoro;
    if (eventKey === 'task') return !!this.config.notifyTask;
    if (eventKey === 'notes') return !!this.config.notifyNotes;
    if (eventKey === 'mindmap') return !!this.config.notifyMindMap;
    return false;
  }

  async sendTestMessage() {
    return this.sendEmbed({
      title: '🔌 Teste de Conexão com o Discord',
      description: 'Parabéns! Sua integração com o **EstudaAí** foi configurada e está funcionando perfeitamente. 🚀',
      color: 9133302, // #8B5CF6 (Purple) em decimal
      fields: [
        { name: 'Status', value: '🟢 Ativo e Conectado', inline: true },
        { name: 'Data de Teste', value: new Date().toLocaleString('pt-BR'), inline: true }
      ],
      footer: { text: 'EstudaAí — Seu companheiro de estudos' }
    });
  }

  async sendEmbed(embed) {
    if (!this.config.webhookUrl) {
      throw new Error('URL da Webhook do Discord não configurada.');
    }

    // Adiciona timestamp padrão no embed
    embed.timestamp = new Date().toISOString();

    const payload = {
      username: this.config.username || 'EstudaAí Bot',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/906/906361.png', // Ícone bonito de graduação
      embeds: [embed]
    };

    const res = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Falha no Discord Webhook: HTTP ${res.status} ${err}`);
    }

    return true;
  }

  // Helper para converter cor hexadecimal para decimal (ex: "#8B5CF6" -> 9133302)
  hexToDecimal(hex) {
    if (!hex) return 9133302; // Cor roxa default
    const cleanHex = hex.replace('#', '');
    return parseInt(cleanHex, 16);
  }
}

window.Discord = new DiscordService();
