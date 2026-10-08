import { incidentView } from '../domain/incidents.js';
/** Register response-dashboard routes; authentication and workspace policy run in app.js. */
export function installResponseDashboardRoutes(app, db, appOrigin) {
  /** Aggregate all workspace records so dashboard totals never depend on a list page. */
  app.get('/api/response-dashboard', async (req, res) => {
    const workspaceId = req.workspaceId,
      today = new Date().toISOString().slice(0, 10);
    const active = { workspaceId, status: { $in: ['open', 'acknowledged'] } };
    const outstanding = { workspaceId, status: { $in: ['todo', 'in_progress', 'blocked'] } };
    const [
      severity,
      services,
      tasks,
      unassigned,
      overdue,
      incidents,
      urgentTasks,
      incidentStatus,
      taskPriority,
    ] = await Promise.all([
      db
        .collection('incidents')
        .aggregate([{ $match: active }, { $group: { _id: '$severity', count: { $sum: 1 } } }])
        .toArray(),
      db
        .collection('incidents')
        .aggregate([
          { $match: active },
          {
            $group: {
              _id: '$serviceId',
              name: { $first: '$serviceName' },
              count: { $sum: 1 },
              critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
            },
          },
          { $sort: { critical: -1, count: -1, name: 1 } },
        ])
        .toArray(),
      db
        .collection('tasks')
        .aggregate([{ $match: outstanding }, { $group: { _id: '$status', count: { $sum: 1 } } }])
        .toArray(),
      db.collection('incidents').countDocuments({ ...active, assigneeId: null }),
      db
        .collection('tasks')
        .countDocuments({ ...outstanding, dueDate: { $type: 'string', $gt: '', $lt: today } }),
      db
        .collection('incidents')
        .aggregate([
          { $match: active },
          {
            $addFields: {
              rank: { $indexOfArray: [['critical', 'high', 'medium', 'low'], '$severity'] },
            },
          },
          { $sort: { rank: 1, createdAt: 1, _id: 1 } },
          { $limit: 10 },
          { $project: { title: 1, severity: 1, status: 1, serviceName: 1, createdAt: 1 } },
        ])
        .toArray(),
      db
        .collection('tasks')
        .aggregate([
          { $match: outstanding },
          { $addFields: { rank: { $indexOfArray: [['high', 'medium', 'low'], '$priority'] } } },
          { $sort: { rank: 1, createdAt: 1, _id: 1 } },
          { $limit: 10 },
          { $project: { title: 1, priority: 1, status: 1, dueDate: 1 } },
        ])
        .toArray(),
      db
        .collection('incidents')
        .aggregate([{ $match: active }, { $group: { _id: '$status', count: { $sum: 1 } } }])
        .toArray(),
      db
        .collection('tasks')
        .aggregate([{ $match: outstanding }, { $group: { _id: '$priority', count: { $sum: 1 } } }])
        .toArray(),
    ]);
    res.json({
      incidentStatus: Object.fromEntries(incidentStatus.map((row) => [row._id, row.count])),
      taskPriority: Object.fromEntries(taskPriority.map((row) => [row._id, row.count])),
      severity: Object.fromEntries(severity.map((row) => [row._id, row.count])),
      taskStatus: Object.fromEntries(tasks.map((row) => [row._id, row.count])),
      services: services.map(({ _id, ...row }) => ({ id: _id, ...row })),
      unassigned,
      overdue,
      incidents: incidents.map(incidentView),
      tasks: urgentTasks.map(incidentView),
      generatedAt: new Date(),
    });
  });
}
