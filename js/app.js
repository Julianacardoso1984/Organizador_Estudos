'use strict';

// ── Polyfill: CanvasRenderingContext2D.roundRect (Chrome <99, Safari <15.4) ──
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const rad = typeof r === 'number' ? r : (Array.isArray(r) ? r[0] : 0);
    this.beginPath();
    this.moveTo(x + rad, y);
    this.lineTo(x + w - rad, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rad);
    this.lineTo(x + w, y + h - rad);
    this.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    this.lineTo(x + rad, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rad);
    this.lineTo(x, y + rad);
    this.quadraticCurveTo(x, y, x + rad, y);
    this.closePath();
  };
}

/**
 * app.js — Bootstrap: instancia models, views e controller após DOM pronto.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const authView = new AuthView();

  const startApp = async (user) => {
    window.currentUser = user; // Referência global para uso nos models

    // Tela de Carregamento
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'supabase-loading';
    loadingMsg.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg-body);display:flex;align-items:center;justify-content:center;z-index:9999;color:var(--text);font-size:1.5rem;font-weight:600;flex-direction:column;gap:16px;';
    loadingMsg.innerHTML = '<div class="spinner" style="width:40px;height:40px;border:4px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite;"></div><div>Carregando seus dados da nuvem...</div><style>@keyframes spin{to{transform:rotate(360deg);}}</style>';
    document.body.appendChild(loadingMsg);

    // ── Models ────────────────────────────────────────────────────────────────
    const subjectModel  = new SubjectModel();
    const pageModel     = new PageModel();
    const taskModel     = new TaskModel();
    const timerModel    = new TimerModel(); // Fica apenas localmente
    const calendarModel = new CalendarModel();
    const materialModel = new MaterialModel();
    const mindMapModel  = new MindMapModel();
    const courseModel   = new CourseModel();
    const flashcardModel = new FlashcardModel();
    const quizModel      = new QuizModel();
    const usefulLinksModel = new UsefulLinksModel();
    const topicModel    = new TopicModel();

    // Carregar dados assincronamente da nuvem
    try {
      await Promise.all([
        subjectModel.loadData(user.id),
        pageModel.loadData(user.id),
        taskModel.loadData(user.id),
        calendarModel.loadData(user.id),
        materialModel.loadData(user.id),
        mindMapModel.loadData(user.id),
        courseModel.loadData(user.id),
        flashcardModel.loadData(user.id),
        quizModel.loadData(user.id),
        usefulLinksModel.loadData(user.id),
        topicModel.loadData(user.id)
      ]);
    } catch (e) {
      console.error('Erro durante o carregamento inicial dos dados:', e);
      alert('Houve um erro ao carregar os dados. Verifique o console.');
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    const sidebarView   = new SidebarView();
    const notesView     = new NotesView();
    const editorView    = new EditorView();
    const dashboardView = new DashboardView();
    const resourcesView = new ResourcesView();
    const tasksView     = new TaskView();
    const timerView     = new TimerView();
    const calendarView  = new CalendarView();
    const materialsView = new MaterialView();
    const mindmapView   = new MindMapView();
    const platformBrowserView = new PlatformBrowserView();
    const flashcardView = new FlashcardView();
    const quizView      = new QuizView();
    const integrationsView = new IntegrationsView();
    const discordChatView = new DiscordChatView();
    const topicView     = new TopicView();

    // ── Controller ────────────────────────────────────────────────────────────
    const controller = new AppController(
      { subjectModel, pageModel, taskModel, timerModel, calendarModel, materialModel, mindMapModel, courseModel, flashcardModel, quizModel, usefulLinksModel, topicModel },
      { sidebar: sidebarView, notes: notesView, editor: editorView, dashboard: dashboardView, resources: resourcesView,
        tasks: tasksView, timer: timerView, calendar: calendarView,
        materials: materialsView, mindmap: mindmapView, platformBrowser: platformBrowserView,
        flashcard: flashcardView, quiz: quizView, integrations: integrationsView, discordChat: discordChatView, topics: topicView }
    );

    // Expose for debug
    window.__app = controller;
    
    loadingMsg.remove();
  };

  if (!window.SupabaseClient) {
    authView.render();
  } else {
    try {
      const { data: { session } } = await window.SupabaseClient.auth.getSession();
      if (session && session.user) {
        authView.hide();
        await startApp(session.user);
      } else {
        authView.render();
      }
    } catch (e) {
      console.error('Erro ao verificar sessão:', e);
      authView.render();
    }
  }

  EventBus.on('auth:success', async (user) => {
    authView.hide();
    await startApp(user);
  });
});
