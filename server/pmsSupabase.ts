import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// PMS Project interface matching Supabase schema
export interface PMSProject {
  project_code: string;
  project_name: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  created_by_emp_code?: string;
  progress_percentage?: number;
  client_name?: string;
  department?: string; // Legacy single department field
  departments?: string[] | string; // New multiple departments field (array or comma-separated string)
  dept?: string; // Alternative department field name
  department_name?: string; // Alternative department field name
}

// PMS Task interface matching Supabase schema
export interface PMSTask {
  id: string;
  project_id: string;
  key_step_id?: string;
  task_name: string;
  description?: string;
  priority?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  assignee?: string;
  task_members?: string[];
  created_at?: string;
  assigner_id?: string;
  updated_at?: string;
}

// PMS Subtask interface matching Supabase schema
export interface PMSSubtask {
  id: string;
  task_id: string;
  title: string;
  assigned_to?: string;
  is_completed?: boolean;
  created_at?: string;
}

// Department name normalization mapping
const normalizeDepartment = (dept: string): string => {
  const normalized = dept.toLowerCase().trim();
  // Map variations to standard department names
  const departmentMappings: Record<string, string> = {
    'software': 'software',
    'software developers': 'software',
    'software developer': 'software',
    'finance': 'finance',
    'purchase': 'purchase',
    'purchases': 'purchase',
    'hr': 'hr',
    'hr & admin': 'hr',
    'hr and admin': 'hr',
    'human resources': 'hr',
    'human resources & admin': 'hr',
    'operations': 'operations',
    'operation': 'operations',
    'marketing': 'marketing',
    'sales': 'sales',
    'admin': 'admin',
    'administration': 'admin',
    'it': 'it',
    'information technology': 'it',
    'qa': 'qa',
    'quality assurance': 'qa',
    'testing': 'qa',
    'presales': 'presales',
    'pre-sales': 'presales',
    'it support': 'it',
    'support': 'it'
  };

  return departmentMappings[normalized] || normalized;
};

// Check if two departments are equivalent
const isDepartmentMatch = (userDept: string, projectDept: string): boolean => {
  return normalizeDepartment(userDept) === normalizeDepartment(projectDept);
};

export const getProjects = async (userRole?: string, userEmpCode?: string, userDepartment?: string): Promise<PMSProject[]> => {
  try {
    console.log("🔍 PMS getProjects called with:", { userRole, userEmpCode, userDepartment });

    // For now, fetch all projects since roles aren't implemented in PMS yet
    // Later this can be enhanced with role-based filtering
    let query = supabase
      .from("Projects")
      .select("*")
      .order("project_name");

    console.log("📡 Executing PMS query...");

    // If user department is provided, try to filter projects by department
    // Try multiple possible column names and approaches
    if (userDepartment) {
      console.log("🏢 Attempting to filter by department:", userDepartment);

      // If user is admin, don't filter by department - they should see all projects
      if (userRole === 'admin') {
        console.log("👑 User is admin, returning all projects");
      } else {
        // For non-admin users, skip database filtering and rely on client-side filtering
        // This ensures we get all projects first, then filter by department matching
        console.log("👤 Non-admin user, will apply client-side department filtering");
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ PMS 'Projects' table error:", error.message);
      console.error("❌ Full error:", error);

      // Try alternative table names
      console.log("🔄 Trying alternative table names...");

      const alternativeTables = ['projects', 'Project', 'project', 'tbl_projects', 'tbl_project', 'pms_projects'];
      for (const tableName of alternativeTables) {
        try {
          console.log(`📡 Trying table: ${tableName}`);
          const { data: altData, error: altError } = await supabase
            .from(tableName)
            .select("*")
            .order("project_name")
            .limit(10);

          if (!altError && altData) {
            console.log(`✅ Found ${altData.length} projects in table '${tableName}'`);
            if (altData.length > 0) {
              console.log("📋 Sample:", altData[0]);
              console.log("📋 All columns:", Object.keys(altData[0]));
              return altData;
            }
          } else if (altError) {
            console.log(`❌ Table '${tableName}' error: ${altError.message}`);
          }
        } catch (altErr) {
          console.log(`💥 Exception checking table '${tableName}': ${(altErr as Error).message}`);
        }
      }

      return []; // Return empty array if no table works
    }

    let projects = data || [];
    console.log(`📊 PMS projects returned: ${projects.length} projects`);
    if (projects.length > 0) {
      console.log("📋 First project sample:", projects[0]);
      console.log("📋 Available columns:", Object.keys(projects[0]));
    } else {
      console.log("⚠️ No projects found in PMS database");
    }

    // Apply client-side department filtering if user has department (including admins)
    if (userDepartment) {
      console.log("🔄 Applying client-side department filtering for:", userDepartment);
      const filteredProjects = projects.filter(project => {
        // Handle multiple possible department field names and formats
        let projectDepts: string[] = [];

        // Check for department array field (new multiple departments format)
        if (project.department && Array.isArray(project.department)) {
          projectDepts = project.department;
        }
        // Check for departments array field (alternative naming)
        else if (project.departments && Array.isArray(project.departments)) {
          projectDepts = project.departments;
        }
        // Check for single department field (legacy format)
        else if (typeof project.department === 'string') {
          projectDepts = [project.department];
        }
        else if (project.dept) {
          projectDepts = [project.dept];
        }
        else if (project.department_name) {
          projectDepts = [project.department_name];
        }
        // Check for comma-separated string in departments field
        else if (typeof project.departments === 'string') {
          projectDepts = project.departments.split(',').map((d: string) => d.trim());
        }

        if (projectDepts.length === 0) {
          console.log(`⚠️ Project ${project.project_name} has no department field`);
          return false; // Exclude projects without department
        }

        // Check if user's department matches any of the project's departments
        const isMatch = projectDepts.some(dept => isDepartmentMatch(userDepartment, dept));
        console.log(`🔍 Project "${project.project_name}" depts [${projectDepts.join(', ')}] matches "${userDepartment}": ${isMatch}`);
        return isMatch;
      });

      console.log(`📊 After department filtering: ${filteredProjects.length} projects (from ${projects.length})`);
      projects = filteredProjects;
    }

    return projects;
  } catch (error) {
    console.error("💥 Error connecting to PMS:", error);
    return []; // Return empty array on connection issues
  }
};

export const getTasks = async (projectId?: string, userDepartment?: string): Promise<PMSTask[]> => {
  try {
    let query = supabase
      .from("project_tasks")
      .select("*")
      .order("task_name");

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    console.log("📡 Executing PMS getTasks query for project:", projectId);

    const { data, error } = await query;
    if (error) {
      console.error("❌ PMS 'project_tasks' table error:", error.message);
      console.error("❌ Full error:", error);

      // Try alternative table names
      console.log("🔄 Trying alternative task table names...");

      const alternativeTables = ['tasks', 'Task', 'task', 'tbl_tasks', 'tbl_task', 'pms_tasks'];
      for (const tableName of alternativeTables) {
        try {
          console.log(`📡 Trying table: ${tableName}`);
          const { data: altData, error: altError } = await supabase
            .from(tableName)
            .select("*")
            .order("task_name")
            .limit(10);

          if (!altError && altData) {
            console.log(`✅ Found ${altData.length} tasks in table '${tableName}'`);
            if (altData.length > 0) {
              console.log("📋 Sample:", altData[0]);
              console.log("📋 All columns:", Object.keys(altData[0]));
              return altData;
            }
          } else if (altError) {
            console.log(`❌ Table '${tableName}' error: ${altError.message}`);
          }
        } catch (altErr) {
          console.log(`💥 Exception checking table '${tableName}': ${(altErr as Error).message}`);
        }
      }

      return []; // Return empty array if no table works
    }

    let tasks = data || [];
    console.log(`📊 PMS tasks returned: ${tasks.length} tasks`);
    if (tasks.length > 0) {
      console.log("📋 First task sample:", tasks[0]);
      console.log("📋 Available columns:", Object.keys(tasks[0]));
    } else {
      console.log("⚠️ No tasks found in PMS database");
    }

    return tasks;
  } catch (error) {
    console.error("💥 Error connecting to PMS:", error);
    return []; // Return empty array on connection issues
  }
};

export const getTasksByProject = async (projectId: string, userDepartment?: string): Promise<PMSTask[]> => {
  try {
    console.log("🔍 PMS getTasksByProject called with projectId:", projectId);

    let query = supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("task_name");

    console.log("📡 Executing PMS getTasksByProject query...");

    const { data, error } = await query;
    if (error) {
      console.error("❌ PMS 'project_tasks' table error:", error.message);
      console.error("❌ Full error:", error);

      // Try alternative table names
      console.log("🔄 Trying alternative task table names...");

      const alternativeTables = ['tasks', 'Task', 'task', 'tbl_tasks', 'tbl_task', 'pms_tasks'];
      for (const tableName of alternativeTables) {
        try {
          console.log(`📡 Trying table: ${tableName}`);
          const { data: altData, error: altError } = await supabase
            .from(tableName)
            .select("*")
            .eq("project_id", projectId)
            .order("task_name")
            .limit(10);

          if (!altError && altData) {
            console.log(`✅ Found ${altData.length} tasks in table '${tableName}' for project ${projectId}`);
            if (altData.length > 0) {
              console.log("📋 Sample:", altData[0]);
              console.log("📋 All columns:", Object.keys(altData[0]));
              return altData;
            }
          } else if (altError) {
            console.log(`❌ Table '${tableName}' error: ${altError.message}`);
          }
        } catch (altErr) {
          console.log(`💥 Exception checking table '${tableName}': ${(altErr as Error).message}`);
        }
      }

      return []; // Return empty array if no table works
    }

    let tasks = data || [];
    console.log(`📊 PMS tasks returned for project ${projectId}: ${tasks.length} tasks`);
    if (tasks.length > 0) {
      console.log("📋 First task sample:", tasks[0]);
      console.log("📋 Available columns:", Object.keys(tasks[0]));
    } else {
      console.log(`⚠️ No tasks found in PMS database for project ${projectId}`);
    }

    return tasks;
  } catch (error) {
    console.error("💥 Error connecting to PMS:", error);
    return []; // Return empty array on connection issues
  }
};

export const getSubtasks = async (taskId?: string, userDepartment?: string): Promise<PMSSubtask[]> => {
  try {
    console.log("🔍 PMS getSubtasks called with taskId:", taskId, "userDepartment:", userDepartment);

    let query = supabase
      .from("subtasks")
      .select("*")
      .order("created_at");

    // Don't filter by taskId in query - fetch all and filter client-side
    console.log("📡 Executing PMS getSubtasks query (fetching all subtasks)...");

    const { data, error } = await query;
    if (error) {
      console.error("❌ PMS 'subtasks' table error:", error.message);
      console.error("❌ Full error:", error);
      return [];
    }

    let subtasks = data || [];
    console.log(`📊 PMS subtasks returned: ${subtasks.length} subtasks`);
    if (subtasks.length > 0) {
      console.log("📋 First subtask sample:", subtasks[0]);
      console.log("📋 Available columns:", Object.keys(subtasks[0]));
      // Filter by taskId using various possible column names
      if (taskId) {
        console.log(`🔍 Filtering subtasks for taskId: ${taskId}`);
        subtasks = subtasks.filter(subtask => {
          const matches = subtask.task_id == taskId || subtask.taskid == taskId || subtask.task == taskId ||
                         subtask.parent_task_id == taskId || subtask.parent_task == taskId || subtask.task_ref == taskId ||
                         subtask.taskId == taskId;
          if (matches) {
            console.log(`✅ Found matching subtask:`, subtask);
          }
          return matches;
        });
        console.log(`📊 Filtered to ${subtasks.length} subtasks for task ${taskId}`);
      }    } else {
      console.log("⚠️ No subtasks found in PMS database");
    }

    return subtasks;
  } catch (error) {
    console.error("💥 Error connecting to PMS:", error);
    return []; // Return empty array on connection issues
  }
};
