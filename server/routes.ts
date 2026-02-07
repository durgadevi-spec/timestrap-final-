import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertOrganisationSchema,
  insertEmployeeSchema,
  insertTimeEntrySchema,
  insertDepartmentSchema,
  insertGroupSchema,
} from "@shared/schema";

// Store connected WebSocket clients for real-time updates
const clients: Set<WebSocket> = new Set();

function broadcast(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  // Seed managers and default employees on startup
  await storage.seedManagers();
  await storage.seedDefaultEmployees();

  // ============ AUTH ROUTES ============
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { employeeCode, password } = req.body;

      if (!employeeCode || !password) {
        return res.status(400).json({ error: "Employee code and password are required" });
      }

      const employee = await storage.validateEmployee(employeeCode, password);

      if (!employee) {
        return res.status(401).json({ error: "Invalid employee code or password" });
      }

      // Don't send password to client
      const { password: _, ...safeEmployee } = employee;
      res.json({ user: safeEmployee });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ============ EMAIL TEST ROUTE ============
  app.get("/api/test/email-config", async (req, res) => {
    res.json({
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "✓ Present" : "✗ Missing",
      FROM_EMAIL: process.env.FROM_EMAIL || "Not set",
      SENDER_EMAIL: process.env.SENDER_EMAIL || "Not set",
    });
  });

  // ============ ORGANISATION ROUTES ============
  app.get("/api/organisations", async (req, res) => {
    try {
      const orgs = await storage.getOrganisations();
      res.json(orgs);
    } catch (error) {
      console.error("Get organisations error:", error);
      res.status(500).json({ error: "Failed to fetch organisations" });
    }
  });

  app.post("/api/organisations", async (req, res) => {
    try {
      const result = insertOrganisationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const org = await storage.createOrganisation(result.data);
      broadcast("organisation_created", org);
      res.status(201).json(org);
    } catch (error) {
      console.error("Create organisation error:", error);
      res.status(500).json({ error: "Failed to create organisation" });
    }
  });

  app.patch("/api/organisations/:id", async (req, res) => {
    try {
      const org = await storage.updateOrganisation(req.params.id, req.body);
      if (!org) {
        return res.status(404).json({ error: "Organisation not found" });
      }
      broadcast("organisation_updated", org);
      res.json(org);
    } catch (error) {
      console.error("Update organisation error:", error);
      res.status(500).json({ error: "Failed to update organisation" });
    }
  });

  app.delete("/api/organisations/:id", async (req, res) => {
    try {
      await storage.deleteOrganisation(req.params.id);
      broadcast("organisation_deleted", { id: req.params.id });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete organisation error:", error);
      res.status(500).json({ error: "Failed to delete organisation" });
    }
  });

  // ============ DEPARTMENT ROUTES ============
  app.get("/api/departments", async (req, res) => {
    try {
      const depts = await storage.getDepartments();
      res.json(depts);
    } catch (error) {
      console.error("Get departments error:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const result = insertDepartmentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const dept = await storage.createDepartment(result.data);
      broadcast("department_created", dept);
      res.status(201).json(dept);
    } catch (error) {
      console.error("Create department error:", error);
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  app.patch("/api/departments/:id", async (req, res) => {
    try {
      const dept = await storage.updateDepartment(req.params.id, req.body);
      if (!dept) {
        return res.status(404).json({ error: "Department not found" });
      }
      broadcast("department_updated", dept);
      res.json(dept);
    } catch (error) {
      console.error("Update department error:", error);
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      broadcast("department_deleted", { id: req.params.id });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete department error:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  });

  // ============ GROUP ROUTES ============
  app.get("/api/groups", async (req, res) => {
    try {
      const grps = await storage.getGroups();
      res.json(grps);
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const result = insertGroupSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const group = await storage.createGroup(result.data);
      broadcast("group_created", group);
      res.status(201).json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.updateGroup(req.params.id, req.body);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      broadcast("group_updated", group);
      res.json(group);
    } catch (error) {
      console.error("Update group error:", error);
      res.status(500).json({ error: "Failed to update group" });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    try {
      await storage.deleteGroup(req.params.id);
      broadcast("group_deleted", { id: req.params.id });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete group error:", error);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  // ============ EMPLOYEE ROUTES ============
  app.get("/api/employees", async (req, res) => {
    try {
      const emps = await storage.getEmployees();
      // Remove passwords from response
      const safeEmps = emps.map(({ password, ...emp }) => emp);
      res.json(safeEmps);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const result = insertEmployeeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      // Check if employee code already exists
      const existing = await storage.getEmployeeByCode(result.data.employeeCode);
      if (existing) {
        return res.status(400).json({ error: "Employee code already exists" });
      }

      const emp = await storage.createEmployee(result.data);
      const { password, ...safeEmp } = emp;
      broadcast("employee_created", safeEmp);
      res.status(201).json(safeEmp);
    } catch (error) {
      console.error("Create employee error:", error);
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  // ============ MANAGER ROUTES ============
  app.get("/api/managers", async (req, res) => {
    try {
      const mgrs = await storage.getManagers();
      res.json(mgrs);
    } catch (error) {
      console.error("Get managers error:", error);
      res.status(500).json({ error: "Failed to fetch managers" });
    }
  });

  // ============ PROJECTS ROUTES ============
  app.get("/api/projects", async (req, res) => {
    try {
      const { userRole, userEmpCode, userDepartment } = req.query;
      const projects = await storage.getProjects(userRole as string, userEmpCode as string, userDepartment as string);
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const project = await storage.createProject(req.body);
      broadcast("project_created", project);
      res.status(201).json(project);
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // ============ TASKS ROUTES ============
  app.get("/api/tasks", async (req, res) => {
    try {
      const { projectId, userDepartment } = req.query;
      const tasks = await storage.getTasks(projectId as string, userDepartment as string);
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      broadcast("task_created", task);
      res.status(201).json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // ============ SUBTASKS ROUTES ============
  app.get("/api/subtasks", async (req, res) => {
    try {
      const { taskId, userDepartment } = req.query;

      // Get PMS subtasks
      const pmsSubtasks = await storage.getPMSSubtasks(taskId as string, userDepartment as string);

      // For now, only return PMS subtasks since local subtasks table may not exist
      res.json(pmsSubtasks);
    } catch (error) {
      console.error("Get subtasks error:", error);
      res.status(500).json({ error: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/subtasks", async (req, res) => {
    try {
      const subtask = await storage.createSubtask(req.body);
      broadcast("subtask_created", subtask);
      res.status(201).json(subtask);
    } catch (error) {
      console.error("Create subtask error:", error);
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });

  // ============ TIME ENTRY ROUTES ============
  app.get("/api/time-entries", async (req, res) => {
    try {
      const entries = await storage.getTimeEntries();
      res.json(entries);
    } catch (error) {
      console.error("Get time entries error:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  app.get("/api/time-entries/pending", async (req, res) => {
    try {
      const entries = await storage.getPendingTimeEntries();
      res.json(entries);
    } catch (error) {
      console.error("Get pending entries error:", error);
      res.status(500).json({ error: "Failed to fetch pending entries" });
    }
  });

  app.get("/api/time-entries/employee/:employeeId", async (req, res) => {
    try {
      const entries = await storage.getTimeEntriesByEmployee(req.params.employeeId);
      res.json(entries);
    } catch (error) {
      console.error("Get employee entries error:", error);
      res.status(500).json({ error: "Failed to fetch employee entries" });
    }
  });

  app.post("/api/time-entries", async (req, res) => {
    try {
      // Manual field extraction to ensure all data is captured
      const entryData = {
        ...req.body,
        employeeId: req.body.employeeId,
        employeeCode: req.body.employeeCode,
        employeeName: req.body.employeeName,
        date: req.body.date,
        projectName: req.body.projectName,
        taskDescription: req.body.taskDescription,
        problemAndIssues: req.body.problemAndIssues || null,
        quantify: req.body.quantify || "",
        achievements: req.body.achievements || null,
        scopeOfImprovements: req.body.scopeOfImprovements || null,
        toolsUsed: req.body.toolsUsed || [],
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        totalHours: req.body.totalHours,
        percentageComplete: parseInt(req.body.percentageComplete) || 0,
      };

      const result = insertTimeEntrySchema.safeParse(entryData);
      if (!result.success) {
        console.error("Validation error:", result.error.errors);
        return res.status(400).json({ error: result.error.errors });
      }

      const entry = await storage.createTimeEntry(result.data);
      broadcast("time_entry_created", entry);

      // NOTE: Email notifications are now sent per day (not per task) via /api/time-entries/submit-daily
      // This prevents multiple emails for multiple tasks submitted on the same day
      console.log('[EMAIL] Task created - email will be sent with daily digest endpoint');

      res.status(201).json(entry);
    } catch (error) {
      console.error("Create time entry error:", error);
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  // Update a time entry (only if pending)
  app.put("/api/time-entries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.getTimeEntry(id);

      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      if (entry.status !== 'pending') {
        return res.status(400).json({ error: "Cannot edit entry that is not pending" });
      }

      const updatedEntry = await storage.updateTimeEntry(id, req.body);
      broadcast("time_entry_updated", updatedEntry);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Update time entry error:", error);
      res.status(500).json({ error: "Failed to update time entry" });
    }
  });

  // Delete a time entry (only if pending)
  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.getTimeEntry(id);

      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      if (entry.status !== 'pending') {
        return res.status(400).json({ error: "Cannot delete entry that is not pending" });
      }

      await storage.deleteTimeEntry(id);
      broadcast("time_entry_deleted", { id });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete time entry error:", error);
      res.status(500).json({ error: "Failed to delete time entry" });
    }
  });

  // Submit daily tasks summary email
  app.post("/api/time-entries/submit-daily/:employeeId/:date", async (req, res) => {
    try {
      const { employeeId, date } = req.params;
      
      // Get all time entries for the employee on that date
      const allEntries = await storage.getTimeEntriesByEmployee(employeeId);
      const dailyEntries = allEntries.filter(entry => entry.date === date);

      if (dailyEntries.length === 0) {
        return res.status(404).json({ error: "No tasks found for this date" });
      }

      // Get employee info
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Calculate total hours for the day
      const totalHours = dailyEntries.reduce((sum, entry) => {
        const hours = parseFloat(entry.totalHours);
        return sum + (isNaN(hours) ? 0 : hours);
      }, 0);

      // Prepare task data for email
      const tasks = dailyEntries.map(entry => ({
        projectName: entry.projectName,
        taskDescription: entry.taskDescription,
        problemAndIssues: entry.problemAndIssues || undefined,
        quantify: entry.quantify,
        achievements: entry.achievements || undefined,
        scopeOfImprovements: entry.scopeOfImprovements || undefined,
        toolsUsed: entry.toolsUsed || undefined,
        startTime: entry.startTime,
        endTime: entry.endTime,
        totalHours: entry.totalHours,
        percentageComplete: entry.percentageComplete ?? 0,
      }));

      // Send daily summary email
      const { sendDailyTasksSummaryEmail } = await import('./email');
      const emailResult = await sendDailyTasksSummaryEmail({
        employeeId: employee.id,
        employeeName: employee.name,
        employeeCode: employee.code,
        date: date,
        tasks: tasks,
        totalHoursForDay: totalHours.toFixed(2),
        submittedAt: new Date().toISOString(),
      });

      if (!emailResult.success) {
        return res.status(500).json({ 
          error: "Failed to send daily summary email",
          details: emailResult.error 
        });
      }

      console.log(`[DAILY SUBMIT] Daily summary sent for ${employee.name} on ${date}`);
      res.json({
        success: true,
        message: `Daily summary email sent for ${date} with ${dailyEntries.length} tasks`,
        taskCount: dailyEntries.length,
        totalHours: totalHours.toFixed(2),
        emailId: emailResult.result?.id,
      });
    } catch (error) {
      console.error("Submit daily summary error:", error);
      res.status(500).json({ error: "Failed to submit daily summary" });
    }
  });

  // Manager approval (first stage of dual approval)
  app.patch("/api/time-entries/:id/manager-approve", async (req, res) => {
    try {
      const { approvedBy } = req.body;
      const entry = await storage.managerApproveTimeEntry(req.params.id, approvedBy);

      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      // Send email notification
      try {
        const { sendApprovalEmail } = await import('./email');
        const approver = await storage.getEmployee(approvedBy);
        await sendApprovalEmail({
          employeeName: entry.employeeName,
          employeeCode: entry.employeeCode,
          date: entry.date,
          status: 'manager_approved',
          approverName: approver?.name,
        });
      } catch (emailError) {
        console.error('[EMAIL] Failed to send manager approval email:', emailError);
      }

      broadcast("time_entry_updated", entry);
      res.json(entry);
    } catch (error) {
      console.error("Manager approve entry error:", error);
      res.status(500).json({ error: "Failed to approve entry" });
    }
  });

  // Admin approval (final stage of dual approval)
  app.patch("/api/time-entries/:id/approve", async (req, res) => {
    try {
      const { approvedBy } = req.body;
      const entry = await storage.adminApproveTimeEntry(req.params.id, approvedBy);

      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      // Send email notification
      try {
        const { sendApprovalEmail } = await import('./email');
        const approver = await storage.getEmployee(approvedBy);
        await sendApprovalEmail({
          employeeName: entry.employeeName,
          employeeCode: entry.employeeCode,
          date: entry.date,
          status: 'approved',
          approverName: approver?.name,
        });
      } catch (emailError) {
        console.error('[EMAIL] Failed to send admin approval email:', emailError);
      }

      broadcast("time_entry_updated", entry);
      res.json(entry);
    } catch (error) {
      console.error("Approve entry error:", error);
      res.status(500).json({ error: "Failed to approve entry" });
    }
  });

  app.patch("/api/time-entries/:id/reject", async (req, res) => {
    try {
      const { approvedBy, reason } = req.body;
      const entry = await storage.updateTimeEntryStatus(req.params.id, "rejected", approvedBy, reason);

      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      // Send email notification
      try {
        const { sendApprovalEmail } = await import('./email');
        const approver = await storage.getEmployee(approvedBy);
        await sendApprovalEmail({
          employeeName: entry.employeeName,
          employeeCode: entry.employeeCode,
          date: entry.date,
          status: 'rejected',
          approverName: approver?.name,
          rejectionReason: reason,
        });
      } catch (emailError) {
        console.error('[EMAIL] Failed to send rejection email:', emailError);
      }

      broadcast("time_entry_updated", entry);
      res.json(entry);
    } catch (error) {
      console.error("Reject entry error:", error);
      res.status(500).json({ error: "Failed to reject entry" });
    }
  });

  // ============ NOTIFICATION ROUTES ============
  app.post("/api/notifications/timesheet-submitted", async (req, res) => {
    try {
      const {
        employeeId,
        employeeName,
        employeeCode,
        date,
        projectName,
        taskDescription,
        problemAndIssues,
        quantify,
        achievements,
        scopeOfImprovements,
        toolsUsed,
        startTime,
        endTime,
        totalHours,
        percentageComplete,
        status,
        submittedAt,
      } = req.body;

      console.log(`[NOTIFICATION] Timesheet submitted by ${employeeName} (${employeeCode})`);
      console.log(`  Date: ${date}, Total Hours: ${totalHours}`);
      console.log(`  Recipients: pushpa.p@ctint.in, sp@ctint.in`);

      // Send email notification via Resend
      try {
        const { sendTimesheetSubmittedEmail } = await import('./email');
        await sendTimesheetSubmittedEmail({
          employeeId,
          employeeName,
          employeeCode,
          date,
          projectName,
          taskDescription,
          problemAndIssues,
          quantify,
          achievements,
          scopeOfImprovements,
          toolsUsed,
          startTime,
          endTime,
          totalHours,
          percentageComplete,
          status,
          submittedAt,
        });
        console.log('[EMAIL] Timesheet notification email sent successfully');
      } catch (emailError) {
        console.error('[EMAIL] Failed to send email:', emailError);
      }

      // Broadcast to connected managers for real-time notification
      broadcast("timesheet_submitted", {
        employeeName,
        employeeCode,
        date,
        projectName,
        totalHours,
        submittedAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Notification sent to managers",
        recipients: process.env.SENDER_EMAIL || "Not configured"
      });
    } catch (error) {
      console.error("Notification error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // ============ PMS INTEGRATION ROUTES ============
  app.get("/api/projects", async (req, res) => {
    try {
      const { userRole, userEmpCode, userDepartment } = req.query;
      const { getProjects } = await import('./pmsSupabase');
      const projects = await getProjects(userRole as string, userEmpCode as string, userDepartment as string);
      res.json(projects);
    } catch (error) {
      console.error("PMS projects error:", error);
      res.status(500).json({ error: "Failed to fetch PMS projects" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const { projectId, userDepartment } = req.query;
      const { getTasks } = await import('./pmsSupabase');
      const tasks = await getTasks(projectId as string, userDepartment as string);
      res.json(tasks);
    } catch (error) {
      console.error("PMS tasks error:", error);
      res.status(500).json({ error: "Failed to fetch PMS tasks" });
    }
  });

  app.get("/api/subtasks", async (req, res) => {
    try {
      const { taskId, userDepartment } = req.query;
      const { getSubtasks } = await import('./pmsSupabase');
      const subtasks = await getSubtasks(taskId as string, userDepartment as string);
      res.json(subtasks);
    } catch (error) {
      console.error("PMS subtasks error:", error);
      res.status(500).json({ error: "Failed to fetch PMS subtasks" });
    }
  });

  return httpServer;
}
