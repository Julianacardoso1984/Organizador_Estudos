'use strict';

/**
 * CourseModel — Gerencia as plataformas de cursos registradas pelo usuário.
 */
class CourseModel {
  constructor() {
    const raw = localStorage.getItem('courses');
    if (raw === null) {
      this.courses = [];
      this._seed();
    } else {
      try {
        this.courses = JSON.parse(raw) || [];
      } catch (e) {
        this.courses = [];
      }
    }
  }

  getAll() { return [...this.courses]; }

  getById(id) { return this.courses.find(c => c.id === id) || null; }

  create(name, url, emoji = '💻') {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const course = {
      id: _uuid(),
      name: name.trim(),
      url: formattedUrl,
      emoji,
      createdAt: new Date().toISOString()
    };
    this.courses.push(course);
    this._save();
    EventBus.emit('courses:updated', this.getAll());
    return course;
  }

  delete(id) {
    this.courses = this.courses.filter(c => c.id !== id);
    this._save();
    EventBus.emit('courses:updated', this.getAll());
  }

  _seed() {
    this.courses = [
      { id: 'c1', name: 'Khan Academy', url: 'https://pt.khanacademy.org', emoji: '🎓', createdAt: new Date().toISOString() },
      { id: 'c2', name: 'Wikipedia', url: 'https://pt.wikipedia.org', emoji: '🌐', createdAt: new Date().toISOString() }
    ];
    this._save();
  }

  _save() { Storage.set('courses', this.courses); }
}
