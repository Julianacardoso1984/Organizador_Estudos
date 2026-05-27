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
  // ── Models ────────────────────────────────────────────────────────────────
  const subjectModel  = new SubjectModel();
  const pageModel     = new PageModel();
  const taskModel     = new TaskModel();
  const timerModel    = new TimerModel();
  const calendarModel = new CalendarModel();
  const materialModel = new MaterialModel();
  const mindMapModel  = new MindMapModel();
  const courseModel   = new CourseModel();
  const flashcardModel = new FlashcardModel();
  const quizModel      = new QuizModel();
  const usefulLinksModel = new UsefulLinksModel();
  const topicModel    = new TopicModel();

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
});
