import { db, pool } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  organisations,
  employees,
  timeEntries,
  managers,
  departments,
  groups,
  projects,
  tasks,
  subtasks,
  // <-- corrected
  type Organisation,
  type InsertOrganisation,
  type Employee,
  type InsertEmployee,
  type TimeEntry,
  type InsertTimeEntry,
  type Manager,
  type InsertManager,
  type Department,
  type InsertDepartment,
  type Group,
  type InsertGroup,
  type Project,     // <-- keep type
  type Task,        // <-- keep type
  type Subtask      // <-- keep type
} from "@shared/schema";
import { getProjects as getPMSProjects, getTasks as getPMSTasks, getTasksByProject as getPMSTasksByProject, getSubtasks as getPMSSubtasks, type PMSProject, type PMSTask, type PMSSubtask } from "./pmsSupabase";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Organisations
  getOrganisations(): Promise<Organisation[]>;
  getOrganisation(id: string): Promise<Organisation | undefined>;
  createOrganisation(org: InsertOrganisation): Promise<Organisation>;
  updateOrganisation(id: string, org: Partial<InsertOrganisation>): Promise<Organisation | undefined>;
  deleteOrganisation(id: string): Promise<boolean>;

  // Departments  
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, dept: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;

  // Groups
  getGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, group: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;

  // Projects (NEW)
  getProjects(userRole?: string, userEmpCode?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: any): Promise<Project>;
  updateProject(id: string, project: Partial<any>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Tasks
  getTasks(projectId?: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksByProject(projectCode: string): Promise<Task[]>;
  createTask(task: any): Promise<Task>;
  updateTask(id: string, task: Partial<any>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Subtasks   
  getSubtasks(): Promise<Subtask[]>;
  getSubtask(id: string): Promise<Subtask | undefined>;
  getSubtasksByTask(taskId: string): Promise<Subtask[]>;
  getPMSSubtasks(taskId?: string, userDepartment?: string): Promise<PMSSubtask[]>;
  createSubtask(subtask: any): Promise<Subtask>;
  updateSubtask(id: string, subtask: Partial<any>): Promise<Subtask | undefined>;
  deleteSubtask(id: string): Promise<boolean>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByCode(code: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  validateEmployee(code: string, password: string): Promise<Employee | null>;

  // Time Entries
  getTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]>;
  // Added for grouped daily email summaries
  getTimeEntriesByEmployeeAndDate(employeeId: string, date: string): Promise<TimeEntry[]>;
  getPendingTimeEntries(): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, data: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<boolean>;
  updateTimeEntryStatus(id: string, status: string, approvedBy?: string, rejectionReason?: string): Promise<TimeEntry | undefined>;
  managerApproveTimeEntry(id: string, managerId: string): Promise<TimeEntry | undefined>;
  adminApproveTimeEntry(id: string, adminId: string): Promise<TimeEntry | undefined>;

  // Managers
  getManagers(): Promise<Manager[]>;
  createManager(manager: InsertManager): Promise<Manager>;
  seedManagers(): Promise<void>;
  seedDefaultEmployees(): Promise<void>;
}  

export class DatabaseStorage implements IStorage {
  // Organisations
  async getOrganisations(): Promise<Organisation[]> {
    return await db.select().from(organisations).orderBy(desc(organisations.createdAt));
  }

  async getOrganisation(id: string): Promise<Organisation | undefined> {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, id));
    return org;   
  }

  async createOrganisation(org: InsertOrganisation): Promise<Organisation> {
    const [newOrg] = await db.insert(organisations).values(org).returning();
    return newOrg;
  }

  async updateOrganisation(id: string, org: Partial<InsertOrganisation>): Promise<Organisation | undefined> {
    const [updated] = await db.update(organisations).set(org).where(eq(organisations.id, id)).returning();
    return updated;
  }

  async deleteOrganisation(id: string): Promise<boolean> {
    await db.delete(organisations).where(eq(organisations.id, id));
    return true;
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(desc(departments.createdAt));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [dept] = await db.select().from(departments).where(eq(departments.id, id));
    return dept;
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const [newDept] = await db.insert(departments).values(dept).returning();
    return newDept;
  }

  async updateDepartment(id: string, dept: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updated] = await db.update(departments).set(dept).where(eq(departments.id, id)).returning();
    return updated;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    await db.delete(departments).where(eq(departments.id, id));
    return true;
  }
     
  // Groups
  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups).orderBy(desc(groups.createdAt));
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }  

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async updateGroup(id: string, group: Partial<InsertGroup>): Promise<Group | undefined> {
    const [updated] = await db.update(groups).set(group).where(eq(groups.id, id)).returning();
    return updated;
  }

  async deleteGroup(id: string): Promise<boolean> {
    await db.delete(groups).where(eq(groups.id, id));
    return true;
  }

  // Projects (NEW)
  async getProjects(userRole?: string, userEmpCode?: string, userDepartment?: string): Promise<Project[]> {
    try {
      const pmsProjects = await getPMSProjects(userRole, userEmpCode, userDepartment);
      // Map PMS projects to local Project type
      return pmsProjects.map(pmsProject => ({
        project_code: pmsProject.project_code,
        project_name: pmsProject.project_name,
        description: pmsProject.description || null,
        status: pmsProject.status || null,  
        start_date: pmsProject.start_date || null,
        end_date: pmsProject.end_date || null,
      }));
    } catch (error) {
      console.error("Error fetching projects from PMS, falling back to local DB:", error);
      // Fallback to local DB if PMS fails
      return await db.select().from(projects).orderBy(desc(projects.start_date));
    }
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.project_code, id));
    return project;
  }

  async createProject(project: any): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }
         
  async updateProject(id: string, project: Partial<any>): Promise<Project | undefined> {
    const [updatedProject] = await db.update(projects).set(project).where(eq(projects.project_code, id)).returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.project_code, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Tasks
  async getTasks(projectId?: string, userDepartment?: string): Promise<Task[]> {
    try {
      const pmsTasks = await getPMSTasks(projectId, userDepartment);
      // Map PMS tasks to local Task type
      return pmsTasks.map(pmsTask => ({
        id: pmsTask.id,
        project_code: pmsTask.project_id, // Map project_id to project_code
        task_name: pmsTask.task_name,
        createdAt: pmsTask.created_at ? new Date(pmsTask.created_at) : new Date(),
      }));
    } catch (error) {
      console.error("Error fetching tasks from PMS, falling back to local DB:", error);
      // Fallback to local DB if PMS fails
      if (projectId) {
        return await db.select().from(tasks).where(eq(tasks.project_code, projectId)).orderBy(desc(tasks.createdAt));
      }
      return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    }
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: any): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, task: Partial<any>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  m
  async getTasksByProject(projectCode: string, userDepartment?: string): Promise<Task[]> {
    try {
      const pmsTasks = await getPMSTasksByProject(projectCode, userDepartment);
      // Map PMS tasks to local Task type
      return pmsTasks.map(pmsTask => ({
        id: pmsTask.id,
        project_code: pmsTask.project_id, // Map project_id to project_code
        task_name: pmsTask.task_name,
        createdAt: pmsTask.created_at ? new Date(pmsTask.created_at) : new Date(),
      }));
    } catch (error) {
      console.error("Error fetching tasks by project from PMS, falling back to local DB:", error);
      // Fallback to local DB if PMS fails
      return await db.select().from(tasks).where(eq(tasks.project_code, projectCode));
    }
  }

  // PMS Subtasks
  async getPMSSubtasks(taskId?: string, userDepartment?: string): Promise<PMSSubtask[]> {
    try {
      return await getPMSSubtasks(taskId, userDepartment);
    } catch (error) {
      console.error("Error fetching subtasks from PMS:", error);
      return [];
    }
  }
    
  // Subtasks
  async getSubtasks(): Promise<Subtask[]> {
    return await db.select().from(subtasks).orderBy(desc(subtasks.createdAt));
  }

  async getSubtask(id: string): Promise<Subtask | undefined> {
    const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, id));
    return subtask;
  }

  async createSubtask(subtask: any): Promise<Subtask> {
    const [newSubtask] = await db.insert(subtasks).values(subtask).returning();
    return newSubtask;
  }

  async updateSubtask(id: string, subtask: Partial<any>): Promise<Subtask | undefined> {
    const [updatedSubtask] = await db.update(subtasks).set(subtask).where(eq(subtasks.id, id)).returning();
    return updatedSubtask;
  }

  async deleteSubtask(id: string): Promise<boolean> {
    const result = await db.delete(subtasks).where(eq(subtasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSubtasksByTask(taskId: string): Promise<Subtask[]> {
    return await db.select().from(subtasks).where(eq(subtasks.task_id, taskId));
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  }

  async getEmployeeByCode(code: string): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees).where(eq(employees.employeeCode, code.toUpperCase()));
    return emp;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const hashedPassword = await bcrypt.hash(employee.password, 10);
    const [newEmp] = await db.insert(employees).values({
      ...employee,
      employeeCode: employee.employeeCode.toUpperCase(),
      password: hashedPassword,
    }).returning();
    return newEmp;
  }
   
  async validateEmployee(code: string, password: string): Promise<Employee | null> {
    const emp = await this.getEmployeeByCode(code);
    if (!emp) return null;

    const isValid = await bcrypt.compare(password, emp.password);
    return isValid ? emp : null;
  }

  // Time Entries
  async getTimeEntries(): Promise<TimeEntry[]> {
    try {
      return await db.select().from(timeEntries).orderBy(desc(timeEntries.submittedAt));
    } catch (err: any) {
      console.error("Get time entries error (drizzle):", err);
      // Fallback: if the pms_id column is missing in the DB, run a raw query excluding it
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const result = await pool.query(`
          SELECT id, employee_id, employee_code, employee_name, date, project_name, task_description,
                 problem_and_issues, quantify, achievements, scope_of_improvements, tools_used,
                 start_time, end_time, total_hours, percentage_complete, status,
                 approved_by, approved_at, manager_approved_by, manager_approved_at,
                 rejection_reason, approval_comment, submitted_at
          FROM time_entries
          ORDER BY submitted_at DESC
        `);
        return result.rows as TimeEntry[];
      }
      throw err;
    }
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  }

  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    try {
      return await db.select().from(timeEntries)
        .where(eq(timeEntries.employeeId, employeeId))
        .orderBy(desc(timeEntries.submittedAt));
    } catch (err: any) {
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const result = await pool.query(
          `SELECT id, employee_id, employee_code, employee_name, date, project_name, task_description,
                  problem_and_issues, quantify, achievements, scope_of_improvements, tools_used,
                  start_time, end_time, total_hours, percentage_complete, status,
                  approved_by, approved_at, manager_approved_by, manager_approved_at,
                  rejection_reason, approval_comment, submitted_at
           FROM time_entries
           WHERE employee_id = $1
           ORDER BY submitted_at DESC`,
          [employeeId]
        );
        return result.rows as TimeEntry[];
      }
      throw err;
    }
  }

  // fetch all entries for a specific employee on a given date, ordered by start time
  async getTimeEntriesByEmployeeAndDate(employeeId: string, date: string): Promise<TimeEntry[]> {
    try {
      return await db.select().from(timeEntries)
        .where(
          and(
            eq(timeEntries.employeeId, employeeId),
            eq(timeEntries.date, date)
          )
        )
        .orderBy(timeEntries.startTime);
    } catch (err: any) {
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const result = await pool.query(
          `SELECT id, employee_id, employee_code, employee_name, date, project_name, task_description,
                  problem_and_issues, quantify, achievements, scope_of_improvements, tools_used,
                  start_time, end_time, total_hours, percentage_complete, status,
                  approved_by, approved_at, manager_approved_by, manager_approved_at,
                  rejection_reason, approval_comment, submitted_at
           FROM time_entries
           WHERE employee_id = $1 AND date = $2
           ORDER BY start_time ASC`,
          [employeeId, date]
        );
        return result.rows as TimeEntry[];
      }
      throw err;
    }
  }

  async getPendingTimeEntries(): Promise<TimeEntry[]> {                     
    try {
      return await db.select().from(timeEntries)
        .where(eq(timeEntries.status, "pending"))
        .orderBy(desc(timeEntries.submittedAt));
    } catch (err: any) {
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const result = await pool.query(
          `SELECT id, employee_id, employee_code, employee_name, date, project_name, task_description,
                  problem_and_issues, quantify, achievements, scope_of_improvements, tools_used,
                  start_time, end_time, total_hours, percentage_complete, status,
                  approved_by, approved_at, manager_approved_by, manager_approved_at,
                  rejection_reason, approval_comment, submitted_at
           FROM time_entries
           WHERE status = 'pending'
           ORDER BY submitted_at DESC`
        );
        return result.rows as TimeEntry[];
      }
      throw err;
    }
  }                       

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    try {
      const [existing] = await db.select().from(timeEntries).where(
        and(
          eq(timeEntries.employeeId, entry.employeeId),
          eq(timeEntries.date, entry.date),
          eq(timeEntries.projectName, entry.projectName),
          eq(timeEntries.taskDescription, entry.taskDescription),
          eq(timeEntries.startTime, entry.startTime)
        )
      ).limit(1);

      if (existing) {
        return existing;
      }

      const [newEntry] = await db.insert(timeEntries).values({
        ...entry,
        toolsUsed: entry.toolsUsed || [],
      }).returning();
      return newEntry;
    } catch (err: any) {
      // If pms_id column doesn't exist, insert via raw SQL without it
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        console.warn("pms_id column missing; inserting without it via raw SQL");
        const result = await pool.query(
          `INSERT INTO time_entries 
            (id, employee_id, employee_code, employee_name, date, project_name, task_description,
             problem_and_issues, quantify, achievements, scope_of_improvements, tools_used,
             start_time, end_time, total_hours, percentage_complete, status,
             approved_by, approved_at, manager_approved_by, manager_approved_at,
             rejection_reason, approval_comment, submitted_at)
           VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
           RETURNING *`,
          [
            entry.id || crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9),
            entry.employeeId,
            entry.employeeCode,
            entry.employeeName,
            entry.date,
            entry.projectName,
            entry.taskDescription,
            entry.problemAndIssues || null,
            entry.quantify || "",
            entry.achievements || null,
            entry.scopeOfImprovements || null,
            entry.toolsUsed || [],
            entry.startTime,
            entry.endTime,
            entry.totalHours,
            entry.percentageComplete || 0,
            entry.status || "pending",
            entry.approvedBy || null,
            entry.approvedAt || null,
            entry.managerApprovedBy || null,
            entry.managerApprovedAt || null,
            entry.rejectionReason || null,
            entry.approvalComment || null,
            new Date(),
          ]
        );
        return result.rows[0] as TimeEntry;
      }
      throw err;
    }
  }

  async updateTimeEntry(id: string, data: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    try {
      const [updated] = await db.update(timeEntries)
        .set(data)
        .where(eq(timeEntries.id, id))
        .returning();
      return updated;
    } catch (err: any) {
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const { pmsId, ...safeData } = data as any;
        const result = await pool.query(
          `UPDATE time_entries SET ${Object.keys(safeData).map((k, i) => `${k} = $${i + 1}`).join(", ")} WHERE id = $${Object.keys(safeData).length + 1} RETURNING *`,
          [...Object.values(safeData), id]
        );
        return result.rows[0] as TimeEntry | undefined;
      }
      throw err;
    }
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
    return true;
  }        

  async updateTimeEntryStatus(
    id: string,
    status: string,
    approvedBy?: string,
    rejectionReason?: string
  ): Promise<TimeEntry | undefined> {
    try {
      const [updated] = await db.update(timeEntries)
        .set({
          status,
          approvedBy,
          approvedAt: new Date(),
          rejectionReason,
        })     
        .where(eq(timeEntries.id, id))
        .returning();
      return updated;
    } catch (err: any) {
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const result = await pool.query(
          `UPDATE time_entries SET status = $1, approved_by = $2, approved_at = $3, rejection_reason = $4 WHERE id = $5 RETURNING *`,
          [status, approvedBy || null, new Date(), rejectionReason || null, id]
        );
        return result.rows[0] as TimeEntry | undefined;
      }
      throw err;
    }
  }

  async managerApproveTimeEntry(id: string, managerId: string): Promise<TimeEntry | undefined> {
    try {
      const [updated] = await db.update(timeEntries)
        .set({
          status: "manager_approved",
          managerApprovedBy: managerId,
          managerApprovedAt: new Date(),
        })
        .where(eq(timeEntries.id, id))
        .returning();
      return updated;
    } catch (err: any) {
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const result = await pool.query(
          `UPDATE time_entries SET status = $1, manager_approved_by = $2, manager_approved_at = $3 WHERE id = $4 RETURNING *`,
          ["manager_approved", managerId, new Date(), id]
        );
        return result.rows[0] as TimeEntry | undefined;
      }
      throw err;
    }
  }

  async adminApproveTimeEntry(id: string, adminId: string): Promise<TimeEntry | undefined> {
    try {
      const [updated] = await db.update(timeEntries)
        .set({ 
          status: "approved",
          approvedBy: adminId,
          approvedAt: new Date(),                  
        })
        .where(eq(timeEntries.id, id))
        .returning();
      return updated;
    } catch (err: any) {
      if (err && err.code === "42703" && err.message && err.message.includes("pms_id")) {
        const result = await pool.query(
          `UPDATE time_entries SET status = $1, approved_by = $2, approved_at = $3 WHERE id = $4 RETURNING *`,
          ["approved", adminId, new Date(), id]
        );
        return result.rows[0] as TimeEntry | undefined;
      }
      throw err;
    }
  }

  // Managers
  async getManagers(): Promise<Manager[]> {
    return await db.select().from(managers);
  }

  async createManager(manager: InsertManager): Promise<Manager> {
    const [newManager] = await db.insert(managers).values(manager).returning();
    return newManager;
  }

  async seedManagers(): Promise<void> {   
    try {
      console.log("🌱 Seeding managers...");
      const existingManagers = await this.getManagers();
      if (existingManagers.length > 0) {
        console.log("✅ Managers already seeded.");
        return;
      }

      const managerList = [
        { name: "Vikram Sen", employeeCode: "MGR003", email: "vikram@ctint.in", department: "Sales" },
        { name: "Neha Thomas", employeeCode: "MGR004", email: "neha@ctint.in", department: "Marketing" },
        { name: "Kiran Dev", employeeCode: "MGR005", email: "kiran@ctint.in", department: "Finance" },
        { name: "Priya Sharma", employeeCode: "MGR006", email: "priya@ctint.in", department: "Operations" },
        { name: "Rahul Gupta", employeeCode: "MGR007", email: "rahul@ctint.in", department: "IT" },
        { name: "Ananya Patel", employeeCode: "MGR008", email: "ananya@ctint.in", department: "Admin" },
        { name: "Arjun Reddy", employeeCode: "MGR009", email: "arjun@ctint.in", department: "Legal" },
        { name: "Meera Nair", employeeCode: "MGR010", email: "meera@ctint.in", department: "Quality" },
        { name: "Sanjay Kumar", employeeCode: "MGR011", email: "sanjay@ctint.in", department: "Support" },
        { name: "Ritu Singh", employeeCode: "MGR012", email: "ritu@ctint.in", department: "Design" },
        { name: "Deepak Joshi", employeeCode: "MGR013", email: "deepak@ctint.in", department: "Research" },
        { name: "Kavitha Menon", employeeCode: "MGR014", email: "kavitha@ctint.in", department: "Training" },
        { name: "Suresh Iyer", employeeCode: "MGR015", email: "suresh@ctint.in", department: "Procurement" },
      ];      

      for (const manager of managerList) {
        await this.createManager(manager);
      }
      console.log("✅ Managers seeded successfully.");
    } catch (error) {
      console.error("❌ Error seeding managers:", error);
      // We don't rethrow here to allow server startup to continue even if seeding fails
    }
  }

  async seedDefaultEmployees(): Promise<void> {
    try {
      console.log("🌱 Seeding default employees...");
      const defaultEmployees = [
        { employeeCode: "E0046", name: "Rebecasuji", email: "rebeca@ctint.in", password: "admin123", role: "admin", department: "Software" },
        { employeeCode: "E0001", name: "Samprakash", email: "sp@ctint.in", password: "admin123", role: "admin", department: "Presales" },
        { employeeCode: "E0002", name: "Leo Celestine", email: "leo@ctint.in", password: "admin123", role: "admin", department: "Software" },
        { employeeCode: "E0041", name: "Mohanraj C", email: "mohan@ctint.in", password: "admin123", role: "employee", department: "Finance" },
        { employeeCode: "E0042", name: "Yuvaraj", password: "admin123", role: "employee", department: "Purchase" },
        { employeeCode: "E0032", name: "Sivaram C", password: "admin123", role: "employee", department: "Operations" },
        { employeeCode: "E0044", name: "Umar Farooque", password: "admin123", role: "employee", department: "Operations" },
        { employeeCode: "E0028", name: "Kaalipushpa R", password: "admin123", role: "employee", department: "Presales" },
        { employeeCode: "E0009", name: "Rajinth", password: "admin123", role: "employee", department: "Operations" },
        { employeeCode: "E0048", name: "Durga Devi", password: "admin123", role: "employee", department: "Software" },
        { employeeCode: "E0047", name: "Samyuktha", email: "samyuktha@ctint.in", password: "admin123", role: "employee", department: "HR & Admin" },
        { employeeCode: "E0049", name: "Pushpa Prithviraj", password: "admin123", role: "hr", department: "HR & Admin" },
        { employeeCode: "E0050", name: "Zameela Begam", password: "admin123", role: "employee", department: "Finance" },
        { employeeCode: "E0051", name: "Arunkumar", password: "admin123", role: "employee", department: "Purchase" },
        { employeeCode: "E0052", name: "Jyothsna Priya", password: "admin123", role: "employee", department: "Software" },
        { employeeCode: "E0053", name: "S.NAVEEN KUMAR", password: "admin123", role: "employee", department: "IT Support" },
        { employeeCode: "E0054", name: "KIRUBA", password: "admin123", role: "employee", department: "Presales" },
      ];

      const existingEmployees = await this.getEmployees();
      const existingCodes = new Set(existingEmployees.map(e => e.employeeCode));

      for (const emp of defaultEmployees) {
        if (!existingCodes.has(emp.employeeCode)) {
          await this.createEmployee(emp);
          console.log(`Created missing employee: ${emp.employeeCode} (${emp.name})`);
        }
      }

      await this.syncAllPasswords();
      console.log("✅ Default employees seeded/verified successfully.");
    } catch (error) {
      console.error("❌ Error seeding default employees:", error);
    }
  }

  async syncAllPasswords(): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.update(employees).set({ password: hashedPassword });
      console.log("All employee passwords synced to admin123");
    } catch (error) {
      console.error("Error syncing passwords:", error);
    }
  }   
}

export const storage = new DatabaseStorage();
