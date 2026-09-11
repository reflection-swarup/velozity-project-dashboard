export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';

export type ActivityType =
  | 'PROJECT_CREATED'
  | 'TASK_CREATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_OVERDUE'
  | 'TASK_DELETED'
  | 'MEMBER_JOINED';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_IN_REVIEW'
  | 'TASK_OVERDUE'
  | 'ACCESS_REQUESTED'
  | 'ACCESS_APPROVED';

export type RequestableRole = 'PROJECT_MANAGER' | 'DEVELOPER';
export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  requestedRole: RequestableRole;
  status: AccessRequestStatus;
  note: string | null;
  decisionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  project: { id: string; name: string } | null;
  manager: { id: string; name: string; email: string } | null;
  reviewedBy: { id: string; name: string } | null;
};

export type SignupOptions = {
  managers: { id: string; name: string }[];
  projects: { id: string; name: string; managerId: string }[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type ManagedUser = User & {
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  contactEmail: string;
  createdAt: string;
  _count?: { projects: number };
};

export type StatusCounts = Record<TaskStatus, number>;
export type PriorityCounts = Record<TaskPriority, number>;

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  clientId: string;
  managerId: string;
  createdAt: string;
  client: { id: string; name: string; company: string };
  manager: { id: string; name: string; email: string };
  taskCounts: StatusCounts;
  taskTotal: number;
  overdueCount: number;
  members?: User[];
};

export type Task = {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  isOverdue: boolean;
  overdueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; managerId: string };
  assignee: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string };
};

export type Activity = {
  id: string;
  type: ActivityType;
  projectId: string;
  projectName?: string;
  taskId: string | null;
  taskNumber: number | null;
  taskTitle: string | null;
  actorId: string | null;
  actorName: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  message: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  taskId: string | null;
  projectId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AdminDashboard = {
  role: 'ADMIN';
  projectTotal: number;
  taskTotal: number;
  tasksByStatus: StatusCounts;
  tasksByPriority: PriorityCounts;
  overdueCount: number;
  userTotal: number;
  clientTotal: number;
  onlineCount: number;
  onlineUserIds: string[];
};

export type ManagerDashboard = {
  role: 'PROJECT_MANAGER';
  projectTotal: number;
  taskTotal: number;
  tasksByStatus: StatusCounts;
  tasksByPriority: PriorityCounts;
  overdueCount: number;
  projects: {
    id: string;
    name: string;
    status: ProjectStatus;
    client: { id: string; name: string };
    taskCounts: StatusCounts;
    taskTotal: number;
  }[];
  upcomingThisWeek: Task[];
};

export type DeveloperDashboard = {
  role: 'DEVELOPER';
  taskTotal: number;
  tasksByStatus: StatusCounts;
  tasksByPriority: PriorityCounts;
  overdueCount: number;
  tasks: Task[];
};

export type Dashboard = AdminDashboard | ManagerDashboard | DeveloperDashboard;

export type Paginated<T> = { items: T[]; nextCursor: string | null; total?: number };
