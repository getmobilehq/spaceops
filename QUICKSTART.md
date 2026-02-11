# SpaceOps Quickstart Guide

A step-by-step tutorial for getting started with SpaceOps — the quality control platform for commercial janitorial companies.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Logging In](#2-logging-in)
3. [Admin Setup](#3-admin-setup)
   - [Organization Settings](#31-organization-settings)
   - [Creating Buildings & Floors](#32-creating-buildings--floors)
   - [Adding Spaces](#33-adding-spaces)
   - [Creating Checklists](#34-creating-checklists)
   - [Assigning Checklists to Spaces](#35-assigning-checklists-to-spaces)
4. [User Management](#4-user-management)
   - [Inviting Users](#41-inviting-users)
   - [Assigning Supervisors to Buildings](#42-assigning-supervisors-to-buildings)
5. [Floor Plans & Maps](#5-floor-plans--maps)
   - [Uploading a Floor Plan](#51-uploading-a-floor-plan)
   - [Placing Pins on the Map](#52-placing-pins-on-the-map)
   - [Reading the Live Map](#53-reading-the-live-map)
6. [Running an Inspection](#6-running-an-inspection)
   - [Scanning a QR Code](#61-scanning-a-qr-code)
   - [Starting the Inspection](#62-starting-the-inspection)
   - [Completing the Checklist](#63-completing-the-checklist)
   - [Submitting the Inspection](#64-submitting-the-inspection)
   - [Editing a Past Inspection](#65-editing-a-past-inspection)
7. [Deficiencies & Tasks](#7-deficiencies--tasks)
   - [How Deficiencies Are Created](#71-how-deficiencies-are-created)
   - [Managing Tasks](#72-managing-tasks)
   - [Creating Manual Tasks](#73-creating-manual-tasks)
   - [Bulk Task Actions](#74-bulk-task-actions)
   - [Staff Workflow](#75-staff-workflow)
8. [Dashboards](#8-dashboards)
   - [Supervisor Home Dashboard](#81-supervisor-home-dashboard)
   - [Building Dashboard](#82-building-dashboard)
   - [Client Dashboard](#83-client-dashboard)
9. [Reports](#9-reports)
   - [Generating a Report](#91-generating-a-report)
   - [Auto-Reports on Completion](#92-auto-reports-on-completion)
10. [Notifications](#10-notifications)
    - [In-App Notifications](#101-in-app-notifications)
    - [SMS & WhatsApp Notifications](#102-sms--whatsapp-notifications)
    - [SLA Warnings & Overdue Alerts](#103-sla-warnings--overdue-alerts)
    - [Setting Notification Preferences](#104-setting-notification-preferences)
11. [Client Access](#11-client-access)
    - [Setting Up Client Organizations](#111-setting-up-client-organizations)
    - [Sharing a Dashboard Link](#112-sharing-a-dashboard-link)
12. [QR Code Printing](#12-qr-code-printing)
13. [Profile & Preferences](#13-profile--preferences)
14. [Navigation Reference](#14-navigation-reference)
15. [Tips & Best Practices](#15-tips--best-practices)

---

## 1. Overview

SpaceOps helps janitorial companies prove service quality to their clients and manage operational quality internally. The core workflow is:

```
Scan QR code on room door
    --> Complete inspection checklist (pass/fail each item)
        --> Failed items auto-create deficiencies + tasks
            --> Floor plan map updates with live status pins
                --> Clients see dashboards + receive auto-generated reports
```

**Four user roles:**

| Role | What they do |
|------|-------------|
| **Admin** | Creates the organization, buildings, spaces, checklists. Manages all users. Full access to everything. |
| **Supervisor** | Performs inspections via QR scan. Manages tasks and deficiencies. Assigned to specific buildings. |
| **Staff** | Receives task assignments via SMS/WhatsApp. Updates task status. Minimal interface. |
| **Client** | Read-only access to linked buildings. Views dashboards, maps, and reports. |

---

## 2. Logging In

Navigate to your SpaceOps URL and enter your email and password.

- If you received an invitation email, click the link to create your account first. The invitation link expires after 72 hours.
- If you forgot your password, click **Forgot password?** to receive a reset link by email.
- After logging in, you are redirected to your role-specific home page:
  - Admin/Supervisor: Home Dashboard
  - Client: Client Portfolio Dashboard
  - Staff: My Tasks

---

## 3. Admin Setup

### 3.1 Organization Settings

Go to **Profile > Admin Settings** (or navigate to `/admin/settings`).

**Organization Info:**
- **Name**: Your company name (e.g., "CleanCo Services")
- **Contact Email**: Primary contact for the organization
- **Logo**: Upload your company logo (displayed in reports and headers)
- **Brand Color**: Pick a hex color for your brand accent

**Space Types:**
SpaceOps comes with 10 default space types: Office, Restroom, Kitchen, Conference Room, Lobby, Hallway, Stairwell, Elevator, Storage, and Other. You can add custom types specific to your organization (e.g., "Server Room", "Break Room").

### 3.2 Creating Buildings & Floors

1. Go to **Buildings** in the bottom navigation
2. Tap **+ Add Building**
3. Fill in the building details:
   - **Name** (required): e.g., "Acme Tower"
   - **Street Address**: e.g., "123 Main St"
   - **City**, **State**, **Zip**
   - **Square Footage** (optional)
4. Tap **Create Building**

Once inside a building, add floors:

1. In the building dashboard, find the **Floors** section
2. Tap **+ Add Floor**
3. Enter the floor name (e.g., "Floor 1", "Basement", "Penthouse")
4. Set the display order (floors are shown in this order)
5. Repeat for each floor

### 3.3 Adding Spaces

Spaces are the individual rooms or areas that will be inspected. Navigate to a building and tap **Manage Spaces**.

**Add spaces one at a time:**
1. Tap **+ Add Space**
2. Enter the space name (e.g., "Restroom 2A", "Conference Room B")
3. Select the floor
4. Choose a space type (optional but recommended)
5. Tap **Create** — a QR code is automatically generated

**Bulk import from CSV:**
1. Tap **Import CSV**
2. Upload a CSV file with columns: `name`, `floor`, `space_type`
3. The system validates against your existing floors
4. Up to 500 spaces per import
5. QR codes are auto-generated for all imported spaces

### 3.4 Creating Checklists

Go to **Admin > Checklists** (or navigate to `/admin/checklists`).

**Using a canned template:**
SpaceOps includes 5 ready-made templates:
- General Office Cleaning (8 items)
- Restroom Cleaning (10 items)
- Kitchen / Break Room (8 items)
- Lobby & Common Areas (8 items)
- Conference Room (8 items)

Tap **Clone** on any canned template to create an editable copy for your organization.

**Creating a custom template:**
1. Tap **+ New Template**
2. Enter the template name (e.g., "Executive Floor Checklist")
3. You are taken to the item editor

**Adding checklist items:**
1. Inside the template editor, tap **+ Add Item**
2. Enter the item description (e.g., "Floors are clean and free of debris")
3. Choose a category (e.g., "Floors", "Surfaces", "Fixtures") — items are grouped by category during inspections
4. Set the display order
5. Toggle **Photo Required** if inspectors must attach a photo when this item fails
6. Repeat for all items

Editing a checklist after inspections have been recorded creates a new version. Historical inspections keep their original checklist snapshot.

### 3.5 Assigning Checklists to Spaces

Spaces need an assigned checklist before they can be inspected.

1. Go to **Buildings > [Building] > Manage Spaces**
2. Tap **Assign Checklist**
3. Select the checklist template
4. Choose which spaces to assign it to:
   - **All spaces** on a floor
   - **By space type** (e.g., all Restrooms)
   - **Individual spaces**
5. Tap **Assign**

---

## 4. User Management

### 4.1 Inviting Users

Go to **Admin > Users** (or navigate to `/admin/users`).

1. Tap **+ Invite User**
2. Enter the user's email address
3. Select their role:
   - **Supervisor**: Performs inspections, manages tasks
   - **Staff**: Receives and works on tasks
   - **Client**: Read-only access to linked buildings
   - **Admin**: Full access (use sparingly)
4. For client users, select the client organization
5. Tap **Send Invitation**

The user receives an email with a signup link. They click the link, set their name and password, and can immediately log in with their pre-assigned role.

Pending invitations appear at the top of the user list with a yellow indicator. Invitations expire after 72 hours.

### 4.2 Assigning Supervisors to Buildings

Supervisors and staff only see buildings they are assigned to.

1. In the user list, find the supervisor or staff member
2. Tap the **building assignment** button
3. Select one or more buildings
4. Tap **Save**

The user now sees only their assigned buildings in the Buildings page and Home Dashboard.

---

## 5. Floor Plans & Maps

Floor plans turn your building into a visual, interactive map with live status pins showing inspection results at a glance.

### 5.1 Uploading a Floor Plan

1. Navigate to **Buildings > [Building] > View Map** (or select a floor)
2. If no floor plan exists, you will see an **Upload Floor Plan** button
3. Select a PDF file of your floor plan
4. SpaceOps renders the PDF to a high-resolution image automatically
5. The map appears with zoom and pan controls

### 5.2 Placing Pins on the Map

After uploading a floor plan, place pins to mark where each space is located.

1. Tap **Edit Pins** (top-left of the map)
2. The right panel shows **Unplaced Spaces** — spaces without a pin position
3. Tap a space name in the panel
4. Tap on the map where that space is located — a pin is placed
5. Drag pins to reposition them
6. Repeat for all spaces
7. Tap **Save** to confirm pin positions

### 5.3 Reading the Live Map

Once pins are placed, the map becomes a live status dashboard:

| Pin Color | Meaning |
|-----------|---------|
| **Green** | Passed inspection today, no open deficiencies |
| **Amber** | Has open deficiencies or pending tasks |
| **Red** | Critical failures or overdue tasks |
| **Grey** | Not yet inspected today |

- **Tap a pin** to see the space name, last inspection time, and navigate to the space detail page
- **Pinch to zoom** on mobile, or use the floating zoom controls
- **Pan** by dragging the map
- The **Status Summary Bar** at the top shows counts for each color

If a building has multiple floors, use the **floor selector tabs** to switch between them.

The map updates in real time — when an inspector submits a checklist, the pin color changes within seconds.

If no floor plan has been uploaded, spaces are shown as a scrollable list instead.

---

## 6. Running an Inspection

### 6.1 Scanning a QR Code

Every space has a unique QR code. There are two ways to scan:

**Option A — Native Camera (recommended):**
Open your phone's camera app and point it at the QR code on the room door. Your phone recognizes the URL and opens SpaceOps directly to that space.

**Option B — In-App Scanner:**
1. Tap the **Scan** button (the elevated circular button in the bottom navigation)
2. Allow camera access when prompted
3. Point your phone at the QR code
4. The scanner detects the code and navigates to the space automatically

If you are not logged in, you are redirected to the login page. After logging in, you are taken directly to the scanned space (the deep link is preserved).

### 6.2 Starting the Inspection

After scanning, you land on the **Space Detail** page showing:
- Space name, floor, and building
- Last inspection date and result (or "Never inspected")
- The assigned checklist name

Tap **Start Inspection** to begin. If a previous inspection is still in progress (not yet submitted), you will see a **Resume Inspection** button instead.

### 6.3 Completing the Checklist

The checklist screen shows:
- **Timer** at the top tracking elapsed time
- **Progress bar** showing how many items you have answered (e.g., "5/12")
- **Items grouped by category** (e.g., "Floors", "Surfaces", "Fixtures")

For each item:
1. Read the item description (e.g., "Floors are clean and free of debris")
2. Tap **Pass** (green) or **Fail** (red)
3. If you tap **Fail**, a panel slides open:
   - Type an optional **comment** describing the issue
   - Tap the **camera button** to take a photo of the problem
   - Photos are automatically compressed for fast upload on mobile networks
   - You can attach multiple photos per item
   - If the item requires a photo (marked with a camera icon), you must attach at least one

**Auto-save:** Your progress is saved automatically. If you lose connection or close the app, your answers are preserved. When you return, tap **Resume Inspection** to pick up where you left off.

### 6.4 Submitting the Inspection

Once all items are answered, the **Submit Inspection** button at the bottom becomes active.

Tap **Submit** to finalize. Here is what happens automatically:
1. All responses are saved to the database
2. For each **failed** item, a **deficiency** is created (e.g., DEF-0042)
3. For each deficiency, a **task** is auto-created and assigned for resolution
4. The space's **map pin** updates to reflect the new status
5. If all spaces in the building have been inspected today, an **auto-report** is generated and emailed to configured recipients

You are redirected back to the space detail page showing the completed inspection.

### 6.5 Editing a Past Inspection

Inspections can be edited within a 3-month window by the original inspector or an admin.

1. Go to the space detail page (scan the QR code again, or find it in the building)
2. Scroll to **Inspection History**
3. Find the inspection you want to edit and tap the **Edit** button
4. The checklist reopens with your previous answers pre-filled
5. Make changes and tap **Submit**

Note: Editing an inspection updates existing responses but does not create additional deficiencies or tasks.

---

## 7. Deficiencies & Tasks

### 7.1 How Deficiencies Are Created

Deficiencies are created automatically when a checklist item fails during an inspection. Each deficiency:
- Gets a unique number (e.g., DEF-0042)
- Is linked to the specific space, inspection, and checklist item
- Starts with status **Open**
- Automatically generates a task for resolution

You can view all deficiencies at **Deficiencies** (navigate to `/deficiencies`). Filter by status (Open / In Progress / Closed) and by building.

### 7.2 Managing Tasks

Go to **Tasks** in the bottom navigation.

**Filtering tasks:**
Use the filter pills at the top to narrow down tasks:
- **Status**: All, Open, In Progress, Closed
- **Priority**: All, Critical, High, Medium, Low
- **Building**: Select a specific building
- **Assignee**: All, Unassigned, or a specific team member

**Task cards show:**
- Priority badge (color-coded: Critical = red, High = orange, Medium = amber, Low = grey)
- Status badge
- "Auto" tag if created from a failed inspection item
- "Recurring" tag if the same item has failed 3+ times in this space
- Description (truncated to 2 lines)
- Space name, building name, and timestamp
- Assigned person (or "Unassigned")
- Due date (shown in red if overdue)

**Tap a task** to open the detail sheet:
- **Assign To**: Select a staff member from the dropdown. They receive an SMS/WhatsApp notification immediately.
- **Priority**: Set to Critical, High, Medium, or Low
- **Due Date**: Set a deadline. SLA warnings are sent 4 hours before the due date.
- **Status Workflow**:
  1. **Open** — Tap **Start Work** to move to In Progress
  2. **In Progress** — Tap **Complete Task** to open the resolution form
  3. Enter a resolution comment (optional) and tap **Close Task**
- **View Linked Deficiency**: If the task was auto-created, tap to see the original deficiency

### 7.3 Creating Manual Tasks

Not all tasks come from inspections. Supervisors and admins can create tasks manually:

1. On the Tasks page, tap **+ New Task**
2. Select the **building** and **space**
3. Enter a **description** of what needs to be done
4. Set **priority** and **due date**
5. Optionally **assign** to a staff member
6. Tap **Create Task**

Manual tasks are tagged differently from auto-created tasks.

### 7.4 Bulk Task Actions

For managing multiple tasks at once (admin and supervisor only):

1. Tap the **checkbox** on each task you want to select, or use **Select All**
2. A bulk action bar appears at the bottom:
   - **Close All**: Marks all selected tasks as closed
   - **Reassign**: Select a new assignee and tap **Reassign** to reassign all selected tasks

### 7.5 Staff Workflow

Staff members have a simplified interface focused on their assigned tasks:

1. Log in — the home page shows **My Tasks** (only tasks assigned to you)
2. When a new task is assigned, you receive an SMS and/or WhatsApp message with the task details
3. Tap a task to view details
4. Tap **Start Work** when you begin
5. Tap **Complete Task** when finished, add an optional comment
6. Tap **Close Task** to mark it done

---

## 8. Dashboards

### 8.1 Supervisor Home Dashboard

The home page (`/`) for admins and supervisors shows an operational overview:

**KPI Cards (top row):**
- **Buildings**: Total number of active buildings
- **Inspections Today**: Number of inspections completed today
- **Open Deficiencies**: Total open deficiencies across all buildings
- **Active Staff**: Number of active staff members

**Overdue Tasks Alert:**
If any tasks are past their due date, a red alert box appears listing each overdue task with its priority, space name, and how many days overdue.

**Buildings List:**
Each building card shows:
- Building name and address
- Today's pass rate percentage
- Open deficiency count
- Inspection progress (e.g., "8/12 spaces inspected")
- A completion bar

**Completion Trend Chart:**
A line chart showing inspection completion rates over time. Toggle between 7-day, 30-day, and 90-day views.

**Repeat Failures Widget:**
Highlights spaces where the same checklist item has failed 3 or more times. These patterns help identify systemic issues that need attention.

### 8.2 Building Dashboard

Tap a building from the home page or the Buildings list to see its dedicated dashboard:

**KPI Cards:**
- Today's Pass Rate
- Inspections Today
- Open Deficiencies
- Open Tasks

**Sections:**
- **Floors**: List of all floors with edit/delete options
- **View Map**: Large button linking to the floor plan map
- **Spaces**: Space count and a link to manage spaces
- **Recent Inspections**: Last 5 inspections with space name, inspector, timestamp, and pass/fail ratio
- **Completion Trend**: Same chart as the home dashboard, scoped to this building

### 8.3 Client Dashboard

Clients see a portfolio view of all buildings linked to their organization:

**KPI Cards:**
- **Buildings**: Number of linked buildings
- **Avg Pass Rate**: Average pass rate across all linked buildings
- **Open Deficiencies**: Total across all linked buildings

**Building Cards:**
Same format as the supervisor view, showing each linked building with its pass rate, deficiency count, and inspection progress. Clients can tap into a building to view its dashboard and floor plan map (read-only).

---

## 9. Reports

### 9.1 Generating a Report

Go to **Reports** (navigate to `/reports`).

1. Select a **Building** from the dropdown
2. Set the **Date Range** (defaults to the last 30 days)
3. Choose a **Report Type**:
   - **Summary**: High-level KPIs, inspection counts, pass/fail rates, and a list of inspections
   - **Detailed**: Everything in Summary plus item-level results with comments and photos
4. Tap **Generate Report**
5. A PDF downloads to your device

**The PDF report contains:**
- Header with your organization logo and building details
- Date range and generation timestamp
- KPI summary: pass rate, total inspections, open deficiencies, completion rate
- Inspections table with pass/fail counts per space
- In detailed mode: item-level responses with comments and attached photos
- Open deficiencies table

### 9.2 Auto-Reports on Completion

Configure automatic report delivery when all spaces in a building are inspected:

1. Go to **Admin > Settings**
2. Find the **Report Configuration** section
3. For each building:
   - Toggle **Auto-send report on completion** to ON
   - Enter recipient email addresses (comma-separated)
4. Tap **Save**

When the last space in the building is inspected for the day, SpaceOps automatically generates a detailed PDF report and emails it to all configured recipients.

---

## 10. Notifications

### 10.1 In-App Notifications

The **bell icon** in the header shows your unread notification count. Tap it to open the Notification Center.

Notifications are grouped by date (Today, Yesterday, This Week, Earlier) and include:
- Task assignments
- SLA warnings (task due soon)
- Overdue task alerts
- New deficiency alerts
- Inspection completions
- Report delivery confirmations

Tap a notification to mark it as read and navigate to the relevant page. Use **Mark All as Read** to clear all unread indicators.

### 10.2 SMS & WhatsApp Notifications

When a task is assigned to a staff member, they receive a message with the task details and a link to view it in SpaceOps.

**SMS** is enabled by default. **WhatsApp** is opt-in (must be enabled in notification preferences).

Both channels deliver:
- Task assignment notifications
- SLA warnings (4 hours before a task is due)
- Overdue task alerts

### 10.3 SLA Warnings & Overdue Alerts

**SLA Warnings** are sent automatically when a task is due within 4 hours. The system checks every 30 minutes and sends a warning to the assigned person via their enabled channels (in-app, SMS, WhatsApp).

**Overdue Alerts** are sent when a task passes its due date. The system checks every hour and notifies both the task assignee and the supervisor who created the task.

Each warning is sent only once per cycle (no duplicate alerts within 4 hours for SLA warnings, or within 1 hour for overdue alerts).

### 10.4 Setting Notification Preferences

Go to **Profile** and find the **Notification Preferences** section.

Four independent toggles:
| Channel | Default | Description |
|---------|---------|-------------|
| **SMS** | ON | Task assignments and SLA warnings via text message |
| **In-App** | ON | Notifications in the notification center |
| **Email** | ON | Reports and summaries by email |
| **WhatsApp** | OFF | Task assignments and SLA warnings via WhatsApp |

Toggle any channel on or off. Changes save immediately. You need a phone number on your account for SMS and WhatsApp to work.

---

## 11. Client Access

### 11.1 Setting Up Client Organizations

Clients are external companies (building owners/managers) who need read-only visibility into your work.

1. Go to **Admin > Settings**
2. In the **Client Organizations** section, tap **+ Add Client Org**
3. Enter the client organization name
4. Tap **Link Buildings** to select which buildings this client can see
5. Invite client users (Admin > Users, select role "Client" and the client org)

Client users see only the buildings linked to their organization. They can view dashboards, floor plans, and generate reports, but cannot modify any data.

### 11.2 Sharing a Dashboard Link

For clients or stakeholders who do not have SpaceOps accounts, you can share a public read-only link:

1. Go to a **Building Dashboard**
2. Tap **Share Dashboard** (top-right)
3. A unique link is generated (e.g., `https://app.spaceops.app/share/abc123`)
4. Copy the link and send it to anyone

The shared dashboard shows:
- Building name and address
- Today's KPIs (pass rate, inspections, deficiencies, tasks)
- Completion progress bar

No login is required. The link can be revoked or set to expire.

---

## 12. QR Code Printing

Every space gets a unique QR code when it is created. To print QR codes for physical placement:

**Individual QR code:**
1. Go to **Buildings > [Building] > Manage Spaces**
2. Find the space and tap the **QR icon**
3. A dialog shows the QR code with the space name
4. Tap **Download PNG** to save the image, or **Print** to send to a printer

**Batch print all QR codes:**
1. In the space manager, tap **Batch Print QR Codes**
2. A PDF is generated with a grid of QR codes, each labeled with the space name and building
3. Print the PDF and cut out individual codes
4. Affix the QR codes to room doors or entrances

Each QR code encodes the URL `https://app.spaceops.app/inspect/{spaceId}`, so scanning it takes the user directly to that space in SpaceOps.

---

## 13. Profile & Preferences

Access your profile by tapping **Profile** in the bottom navigation.

**Your profile shows:**
- Your name, role, and email address
- Organization ID

**Notification Preferences:**
Toggle SMS, In-App, Email, and WhatsApp notifications independently (see [Section 10.4](#104-setting-notification-preferences)).

**Logout:**
Tap the **Logout** button to sign out and return to the login screen. Your session is cleared.

---

## 14. Navigation Reference

### Admin / Supervisor

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| Home | Home | `/` | Dashboard with KPIs, buildings, alerts |
| Building | Buildings | `/buildings` | List of all buildings |
| QR (elevated) | Scan | `/scan` | In-app QR code scanner |
| Clipboard | Tasks | `/tasks` | Task management |
| User | Profile | `/profile` | Settings and preferences |

Additional pages accessible via navigation:
- `/buildings/[id]` — Building dashboard
- `/buildings/[id]/spaces` — Space management
- `/buildings/[id]/map/[floorId]` — Floor plan map
- `/buildings/[id]/inspections` — Inspection history
- `/inspect/[spaceId]` — Space detail (QR destination)
- `/inspect/[spaceId]/checklist` — Active inspection
- `/deficiencies` — Deficiency list
- `/reports` — Report generation
- `/notifications` — Notification center
- `/admin/users` — User management
- `/admin/checklists` — Checklist templates
- `/admin/settings` — Organization settings

### Client

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| Layout | Dashboard | `/client` | Portfolio dashboard |
| Building | Buildings | `/buildings` | Linked buildings (read-only) |
| File | Reports | `/reports` | Report generation |
| User | Profile | `/profile` | Settings and preferences |

### Staff

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| Clipboard | My Tasks | `/tasks` | Assigned tasks |
| Bell | Alerts | `/notifications` | Notification center |
| User | Profile | `/profile` | Settings and preferences |

---

## 15. Tips & Best Practices

**For Admins:**
- Set up auto-reports before onboarding clients — they receive professional PDF reports automatically.
- Assign supervisors to specific buildings so they see only what is relevant to them.
- Use the Repeat Failures widget on the home dashboard to spot systemic cleaning issues.
- Archive buildings that are no longer under contract instead of deleting them — data is preserved.

**For Supervisors:**
- Use the floor plan map as your daily starting point — grey pins show what still needs inspection today.
- Set due dates on tasks to activate SLA warnings for staff.
- Use the batch print feature to generate QR code sheets for new buildings.
- Check the Completion Trend chart weekly to track team performance.

**For Staff:**
- Enable WhatsApp or SMS notifications in your profile so you never miss a task assignment.
- Tap "Start Work" on a task when you begin so supervisors can track progress.
- Always add a resolution comment when closing a task — it helps with quality tracking.

**For Clients:**
- Bookmark your client dashboard for daily quick checks.
- Use the shared dashboard link to show stakeholders without giving them SpaceOps accounts.
- Generate detailed reports with photos for evidence of completed work.

**General:**
- Photos taken during inspections are automatically compressed for fast upload, even on slow mobile networks.
- If you lose internet during an inspection, your progress is auto-saved locally. Reconnect and resume — nothing is lost.
- The map updates in real time. As inspections are submitted, pin colors change within seconds.
