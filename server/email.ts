// Resend email integration for Time Strap
import { Resend } from "resend";
import "dotenv/config";

/* ============================
   CONFIGURATION
============================ */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Time Strap <noreply@resend.dev>";
const SENDER_EMAILS = process.env.SENDER_EMAIL || "pushpa.p@ctint.in,sp@ctint.in";

console.log("[EMAIL CONFIG] RESEND_API_KEY:", RESEND_API_KEY ? "✓ Present" : "✗ Missing");
console.log("[EMAIL CONFIG] FROM_EMAIL:", FROM_EMAIL);
console.log("[EMAIL CONFIG] SENDER_EMAILS:", SENDER_EMAILS);

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY not found in environment variables");
}

const resend = new Resend(RESEND_API_KEY);

/* ============================
   NOTIFICATION RECIPIENTS
============================ */

// Parse sender emails from comma-separated string
const NOTIFICATION_RECIPIENTS = SENDER_EMAILS.split(",").map((email: string) => email.trim());
console.log("[EMAIL CONFIG] Recipients:", NOTIFICATION_RECIPIENTS);

/* ============================
   SEND SUBMISSION EMAIL
============================ */

export async function sendTimesheetSubmittedEmail(data: {
  // Employee Information
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  
  // Work Details
  date: string;
  projectName: string;
  taskDescription: string;
  problemAndIssues?: string;
  quantify: string;
  achievements?: string;
  scopeOfImprovements?: string;
  toolsUsed?: string[];
  
  // Time Information
  startTime: string;
  endTime: string;
  totalHours: string;
  
  // Status Information
  percentageComplete: number;
  status: string;
  submittedAt?: string;
}) {
  try {
    const toolsUsedList = Array.isArray(data.toolsUsed) 
      ? data.toolsUsed.join(", ") 
      : data.toolsUsed || "N/A";
    
    const status = data.status || "pending"; // Default to pending if not provided

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFICATION_RECIPIENTS,
      subject: `Timesheet Submitted - ${data.employeeName} (${data.employeeCode}) - ${data.date}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background:#0f172a;padding:20px;text-align:center;">
          <h1 style="color:#3b82f6;margin:0;">Time Strap</h1>
          <p style="color:#94a3b8;">Timesheet Submission Notification</p>
        </div>

        <div style="padding:30px;background:#f8fafc;">
          <h2 style="color:#0f172a;margin-top:0;">New Timesheet Submitted</h2>

          <!-- Employee Information -->
          <div style="margin-bottom:25px;">
            <h3 style="color:#475569;font-size:14px;margin-bottom:10px;border-bottom:2px solid #3b82f6;padding-bottom:5px;">EMPLOYEE INFORMATION</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Employee Name</td>
                <td style="padding:8px;color:#475569;">${data.employeeName}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Employee Code</td>
                <td style="padding:8px;color:#475569;">${data.employeeCode}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Employee ID</td>
                <td style="padding:8px;color:#475569;">${data.employeeId}</td>
              </tr>
            </table>
          </div>

          <!-- Work Details -->
          <div style="margin-bottom:25px;">
            <h3 style="color:#475569;font-size:14px;margin-bottom:10px;border-bottom:2px solid #3b82f6;padding-bottom:5px;">WORK DETAILS</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Date</td>
                <td style="padding:8px;color:#475569;">${data.date}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Project Name</td>
                <td style="padding:8px;color:#475569;">${data.projectName}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Task Description</td>
                <td style="padding:8px;color:#475569;">${data.taskDescription}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Quantify</td>
                <td style="padding:8px;color:#475569;">${data.quantify}</td>
              </tr>
              ${data.achievements ? `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Achievements</td>
                <td style="padding:8px;color:#475569;">${data.achievements}</td>
              </tr>` : ''}
              ${data.problemAndIssues ? `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Problems & Issues</td>
                <td style="padding:8px;color:#475569;">${data.problemAndIssues}</td>
              </tr>` : ''}
              ${data.scopeOfImprovements ? `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Scope of Improvements</td>
                <td style="padding:8px;color:#475569;">${data.scopeOfImprovements}</td>
              </tr>` : ''}
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Tools Used</td>
                <td style="padding:8px;color:#475569;">${toolsUsedList}</td>
              </tr>
            </table>
          </div>

          <!-- Time Information -->
          <div style="margin-bottom:25px;">
            <h3 style="color:#475569;font-size:14px;margin-bottom:10px;border-bottom:2px solid #3b82f6;padding-bottom:5px;">TIME INFORMATION</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Start Time</td>
                <td style="padding:8px;color:#475569;">${data.startTime}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">End Time</td>
                <td style="padding:8px;color:#475569;">${data.endTime}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Total Hours</td>
                <td style="padding:8px;color:#475569;"><b>${data.totalHours}</b></td>
              </tr>
            </table>
          </div>

          <!-- Status Information -->
          <div style="margin-bottom:25px;">
            <h3 style="color:#475569;font-size:14px;margin-bottom:10px;border-bottom:2px solid #3b82f6;padding-bottom:5px;">STATUS INFORMATION</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Percentage Complete</td>
                <td style="padding:8px;color:#475569;">${data.percentageComplete}%</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Status</td>
                <td style="padding:8px;">
                  <span style="background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:4px;font-weight:bold;">${status.toUpperCase()}</span>
                </td>
              </tr>
              ${data.submittedAt ? `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:bold;color:#334155;">Submitted At</td>
                <td style="padding:8px;color:#475569;">${data.submittedAt}</td>
              </tr>` : ''}
            </table>
          </div>

          <div style="background:#dbeafe;padding:15px;border-radius:8px;margin-top:20px;">
            <p style="margin:0;color:#1e40af;font-size:14px;">
              ✓ Please review and approve this timesheet through the Time Strap portal.
            </p>
          </div>
        </div>

        <div style="background:#1e293b;padding:15px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">
            Automated email from Time Strap System
          </p>
        </div>
      </div>
      `
    });

    console.log("[EMAIL SEND] Attempting to send email...");
    console.log("[EMAIL SEND] From:", FROM_EMAIL);
    console.log("[EMAIL SEND] To:", NOTIFICATION_RECIPIENTS);
    console.log("[EMAIL SEND] Subject:", `Timesheet Submitted - ${data.employeeName} (${data.employeeCode}) - ${data.date}`);

    if (error) {
      console.error("[EMAIL ERROR] Failed to send email:", error);
      return { success: false, error };
    }

    console.log("[EMAIL SUCCESS] Email sent with ID:", result?.id);
    return { success: true, result };

  } catch (err) {
    console.error("[EMAIL ERROR] Email service error:", err);
    return { success: false, err };
  }
}

/* ============================
   SEND APPROVAL EMAIL
============================ */

export async function sendApprovalEmail(data: {
  employeeName: string;
  employeeCode: string;
  date: string;
  status: "manager_approved" | "approved" | "rejected";
  approverName?: string;
  rejectionReason?: string;
}) {
  try {

    const statusText =
      data.status === "approved"
        ? "Fully Approved"
        : data.status === "manager_approved"
        ? "Manager Approved"
        : "Rejected";

    const statusColor =
      data.status === "approved"
        ? "#22c55e"
        : data.status === "manager_approved"
        ? "#3b82f6"
        : "#ef4444";

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFICATION_RECIPIENTS,
      subject: `Timesheet ${statusText} - ${data.employeeName}`,
      html: `
      <div style="font-family: Arial; max-width:600px; margin:auto;">
        <h2>Status Update</h2>

        <div style="padding:10px;border-left:5px solid ${statusColor}">
          <b style="color:${statusColor};">${statusText}</b>
        </div>

        <table style="width:100%;margin-top:20px;">
          <tr><td>Employee</td><td>${data.employeeName}</td></tr>
          <tr><td>Code</td><td>${data.employeeCode}</td></tr>
          <tr><td>Date</td><td>${data.date}</td></tr>

          ${
            data.approverName
              ? `<tr><td>Approved By</td><td>${data.approverName}</td></tr>`
              : ""
          }

          ${
            data.rejectionReason
              ? `<tr><td>Reason</td><td>${data.rejectionReason}</td></tr>`
              : ""
          }
        </table>
      </div>
      `
    });

    if (error) {
      console.error("Approval email error:", error);
      return { success: false, error };
    }

    console.log("Approval email sent:", result?.id);
    return { success: true, result };

  } catch (err) {
    console.error("Email service error:", err);
    return { success: false, err };
  }
}
