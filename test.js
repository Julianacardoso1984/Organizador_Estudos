const fs = require('fs');

// Mock DOM & Globals
global.document = {
  addEventListener: (event, cb) => {
    if (event === 'DOMContentLoaded') setTimeout(cb, 10);
  },
  getElementById: () => ({ classList: { toggle: () => {} } }),
  querySelectorAll: () => []
};
global.window = { location: { search: '' } };
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.indexedDB = { open: () => ({}) };
global.console.warn = () => {};

const code = [
  'js/utils/eventBus.js',
  'js/utils/storage.js',
  'js/utils/ambientSound.js',
  'js/utils/googleCalendar.js',
  'js/utils/discord.js',
  'js/utils/spotify.js',
  'js/models/SubjectModel.js',
  'js/models/PageModel.js',
  'js/models/TaskModel.js',
  'js/models/TimerModel.js',
  'js/models/CalendarModel.js',
  'js/models/MaterialModel.js',
  'js/models/TopicModel.js',
  'js/models/MindMapModel.js',
  'js/models/CourseModel.js',
  'js/models/FlashcardModel.js',
  'js/models/QuizModel.js',
  'js/models/UsefulLinksModel.js',
  'js/views/SidebarView.js',
  'js/views/DashboardView.js',
  'js/views/ResourcesView.js',
  'js/views/NotesView.js',
  'js/views/EditorView.js',
  'js/views/TaskView.js',
  'js/views/TimerView.js',
  'js/views/CalendarView.js',
  'js/views/MaterialView.js',
  'js/views/TopicView.js',
  'js/views/MindMapView.js',
  'js/views/PlatformBrowserView.js',
  'js/views/FlashcardView.js',
  'js/views/QuizView.js',
  'js/views/IntegrationsView.js',
  'js/views/DiscordChatView.js',
  'js/controllers/AppController.js',
  'js/app.js'
].map(f => fs.readFileSync(f, 'utf8')).join('\n');

try {
  eval(code);
  console.log("No syntax or initialization errors.");
} catch (e) {
  console.error("Error during execution:", e);
}
