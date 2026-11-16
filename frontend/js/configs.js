const PRI = ['low', 'medium', 'high', 'critical'];
const T = (k, l, extra = {}) => ({ k, l, t: 'text', ...extra });
export const SECTIONS = {
  projects: { res: 'projects', title: 'Project', search: true, archive: true,
    filters: [{ k: 'status', l: 'Status', o: ['idea', 'planning', 'building', 'testing', 'deployed', 'completed', 'paused'] }, { k: 'category', l: 'Category', o: ['AI Development', 'Software Development', 'Health Technology', 'Research', 'Business'] }],
    cols: [{ k: 'name', l: 'Name' }, { k: 'category', l: 'Category', f: 'tag' }, { k: 'status', l: 'Status', f: 'tag' }, { k: 'priority', l: 'Priority' }, { k: 'progress', l: 'Progress', f: 'progress' }, { k: 'deadline', l: 'Deadline', f: 'date' }, { k: 'next_milestone', l: 'Next milestone' }],
    fields: [T('name', 'Name', { req: 1 }), { k: 'category', l: 'Category', t: 'select', req: 1, o: ['AI Development', 'Software Development', 'Health Technology', 'Research', 'Business'] },
      { k: 'status', l: 'Status', t: 'select', o: ['idea', 'planning', 'building', 'testing', 'deployed', 'completed', 'paused'] }, { k: 'priority', l: 'Priority', t: 'select', o: PRI },
      { k: 'start_date', l: 'Start date', t: 'date' }, { k: 'deadline', l: 'Deadline', t: 'date' }, { k: 'progress', l: 'Progress %', t: 'number', min: 0, max: 100 },
      T('next_milestone', 'Next milestone'), T('github_url', 'GitHub repository', { t: 'url' }), T('live_url', 'Live application URL', { t: 'url' }),
      { k: 'description', l: 'Description', t: 'textarea' }, { k: 'notes', l: 'Notes', t: 'textarea', max: 20000 }] },
  milestones: { res: 'project_milestones', title: 'Milestone',
    cols: [{ k: 'done', l: 'Done', toggle: 1 }, { k: 'title', l: 'Milestone' }, { k: 'project_id', l: 'Project' }, { k: 'due_date', l: 'Due', f: 'date' }],
    fields: [{ k: 'project_id', l: 'Project', t: 'ref', res: 'projects', label: 'name', req: 1 }, T('title', 'Milestone', { req: 1 }), { k: 'due_date', l: 'Due date', t: 'date' }, { k: 'done', l: 'Done', t: 'checkbox' }] },
  tasks: { res: 'tasks', title: 'Task', search: true, filters: [{ k: 'done', l: 'Done', o: ['true', 'false'] }],
    cols: [{ k: 'done', l: 'Done', toggle: 1 }, { k: 'title', l: 'Task' }, { k: 'priority', l: 'Priority' }, { k: 'due_date', l: 'Due', f: 'date' }, { k: 'project_id', l: 'Project' }],
    fields: [T('title', 'Task', { req: 1 }), { k: 'priority', l: 'Priority', t: 'select', o: PRI }, { k: 'due_date', l: 'Due date', t: 'date' }, { k: 'project_id', l: 'Project', t: 'ref', res: 'projects', label: 'name' }, { k: 'notes', l: 'Notes', t: 'textarea' }, { k: 'done', l: 'Done', t: 'checkbox' }] },
  courses: { res: 'courses', title: 'Course', search: true,
    cols: [{ k: 'code', l: 'Code' }, { k: 'title', l: 'Title' }, { k: 'semester', l: 'Semester' }, { k: 'revision_progress', l: 'Revision', f: 'progress' }],
    fields: [T('code', 'Course code', { req: 1 }), T('title', 'Title', { req: 1 }), T('semester', 'Semester'), { k: 'credit_units', l: 'Credit units', t: 'number', min: 0, max: 30 }, { k: 'revision_progress', l: 'Revision progress %', t: 'number', min: 0, max: 100 },
      { k: 'reading_plan', l: 'Reading schedule', t: 'textarea' }, { k: 'notes', l: 'Academic notes', t: 'textarea', max: 20000 }] },
  assignments: { res: 'assignments', title: 'Assignment', filters: [{ k: 'status', l: 'Status', o: ['pending', 'in_progress', 'submitted', 'graded'] }],
    cols: [{ k: 'title', l: 'Assignment' }, { k: 'course_id', l: 'Course' }, { k: 'due_date', l: 'Due', f: 'date' }, { k: 'status', l: 'Status', f: 'tag' }, { k: 'score', l: 'Score' }],
    fields: [{ k: 'course_id', l: 'Course', t: 'ref', res: 'courses', label: 'code', req: 1 }, T('title', 'Title', { req: 1 }), { k: 'due_date', l: 'Due date', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: ['pending', 'in_progress', 'submitted', 'graded'] }, { k: 'score', l: 'Score', t: 'number', min: 0, max: 100, step: 0.01 }, { k: 'notes', l: 'Notes', t: 'textarea' }] },
  exams: { res: 'exams', title: 'Exam',
    cols: [{ k: 'course_id', l: 'Course' }, { k: 'exam_date', l: 'Date & time', f: 'dt' }, { k: 'venue', l: 'Venue' }, { k: 'revision_plan', l: 'Revision plan' }],
    fields: [{ k: 'course_id', l: 'Course', t: 'ref', res: 'courses', label: 'code', req: 1 }, { k: 'exam_date', l: 'Exam date & time', t: 'datetime', req: 1 }, T('venue', 'Venue'), { k: 'revision_plan', l: 'Revision plan', t: 'textarea', max: 10000 }, { k: 'notes', l: 'Notes', t: 'textarea' }] },
  research: { res: 'research_records', title: 'Research', search: true,
    filters: [{ k: 'category', l: 'Category', o: ['Public Health', 'Artificial Intelligence', 'Software Engineering', 'Business', 'Innovation'] }, { k: 'status', l: 'Status', o: ['idea', 'active', 'writing', 'review', 'completed', 'paused'] }],
    cols: [{ k: 'topic', l: 'Topic' }, { k: 'category', l: 'Category', f: 'tag' }, { k: 'status', l: 'Status', f: 'tag' }, { k: 'date_started', l: 'Started', f: 'date' }, { k: 'next_action', l: 'Next action' }],
    fields: [T('topic', 'Topic', { req: 1 }), { k: 'category', l: 'Category', t: 'select', req: 1, o: ['Public Health', 'Artificial Intelligence', 'Software Engineering', 'Business', 'Innovation'] }, { k: 'status', l: 'Status', t: 'select', o: ['idea', 'active', 'writing', 'review', 'completed', 'paused'] },
      { k: 'date_started', l: 'Date started', t: 'date' }, T('next_action', 'Next action'), { k: 'description', l: 'Description', t: 'textarea', max: 10000 }, { k: 'sources', l: 'Sources', t: 'textarea', max: 20000 }, { k: 'key_findings', l: 'Key findings', t: 'textarea', max: 20000 }, { k: 'notes', l: 'Notes', t: 'textarea', max: 20000 }] },
  business: { res: 'business_activities', title: 'Business record', search: true, filters: [{ k: 'kind', l: 'Type', o: ['client', 'opportunity', 'outreach', 'activity'] }],
    cols: [{ k: 'title', l: 'Title' }, { k: 'kind', l: 'Type', f: 'tag' }, { k: 'contact', l: 'Contact' }, { k: 'status', l: 'Status' }, { k: 'follow_up_date', l: 'Follow-up', f: 'date' }],
    fields: [{ k: 'kind', l: 'Type', t: 'select', req: 1, o: ['client', 'opportunity', 'outreach', 'activity'] }, T('title', 'Title', { req: 1 }), T('contact', 'Contact'), T('status', 'Status'), { k: 'follow_up_date', l: 'Follow-up date', t: 'date' }, { k: 'notes', l: 'Notes', t: 'textarea', max: 10000 }] },
  finance: { res: 'financial_records', title: 'Financial record', filters: [{ k: 'type', l: 'Type', o: ['revenue_received', 'revenue_projected', 'expense'] }],
    cols: [{ k: 'entry_date', l: 'Date', f: 'date' }, { k: 'type', l: 'Type', f: 'tag' }, { k: 'amount', l: 'Amount', f: 'money' }, { k: 'description', l: 'Description' }],
    fields: [{ k: 'entry_date', l: 'Date', t: 'date', req: 1 }, { k: 'type', l: 'Type', t: 'select', req: 1, o: ['revenue_received', 'revenue_projected', 'expense'] }, { k: 'amount', l: 'Amount', t: 'number', min: 0, step: 0.01, req: 1 }, T('currency', 'Currency (e.g. NGN)'), T('description', 'Description'), { k: 'notes', l: 'Financial notes', t: 'textarea' }],
    defaults: { currency: 'NGN' },
    // Actual revenue and projected revenue are never mixed.
    onDraw(rows, el) {
      const by = {};
      for (const r of rows) { const c = (by[r.currency] ??= { received: 0, projected: 0, expense: 0 }); c[r.type === 'revenue_received' ? 'received' : r.type === 'revenue_projected' ? 'projected' : 'expense'] += Number(r.amount); }
      const f = (n, c) => new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(n);
      el.innerHTML = Object.entries(by).map(([c, v]) => `<div class="stats"><div class="stat"><span>Revenue received (${c})</span><b>${f(v.received, c)}</b></div><div class="stat"><span>Projected (not received)</span><b>${f(v.projected, c)}</b></div><div class="stat"><span>Expenses</span><b>${f(v.expense, c)}</b></div><div class="stat"><span>Net actual</span><b>${f(v.received - v.expense, c)}</b></div></div>`).join('');
    } },
  goals: { res: 'monthly_goals', title: 'Monthly goal',
    cols: [{ k: 'achieved', l: 'Achieved', toggle: 1 }, { k: 'title', l: 'Goal' }, { k: 'month', l: 'Month' }, { k: 'current_value', l: 'Current' }, { k: 'target_value', l: 'Target' }],
    fields: [{ k: 'month', l: 'Month (pick the 1st)', t: 'date', req: 1 }, T('title', 'Goal', { req: 1 }), { k: 'target_value', l: 'Target', t: 'number', step: 0.01 }, { k: 'current_value', l: 'Current', t: 'number', step: 0.01 }, { k: 'achieved', l: 'Achieved', t: 'checkbox' }] },
};
