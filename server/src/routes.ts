import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/users/user.routes';
import { clientRouter } from './modules/clients/client.routes';
import { projectRouter } from './modules/projects/project.routes';
import { taskRouter } from './modules/tasks/task.routes';
import { activityRouter } from './modules/activity/activity.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/clients', clientRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/activity', activityRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/dashboard', dashboardRouter);
