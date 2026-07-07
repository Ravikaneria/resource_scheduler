import frappe
from frappe.utils import get_datetime

@frappe.whitelist()
def get_scheduling_data():
    # 1. Fetch Engineers (Groups)
    engineers = frappe.get_all("Resource Engineer", 
        fields=["name as id", "engineer_name as content", "skillset as nestedGroups"])
        
    # 2. Fetch Allocations (Items) — linked to Task (and its subtasks via Task.parent_task)
    allocations = frappe.get_all("Resource Allocation Block",
        fields=[
            "name as id",
            "engineer as group",
            "task",
            "task.subject as content",
            "task.parent_task as parent_task",
            "start_datetime as start",
            "end_datetime as end",
            "color"
        ])

    for item in allocations:
        item['style'] = f"background-color: {item['color'] or '#3182ce'}; color: white; border-radius: 4px;"
        
    return {"groups": engineers, "items": allocations}

@frappe.whitelist()
def update_block_time(block_id, start, end, group_id=None):
    doc = frappe.get_doc("Resource Allocation Block", block_id)
    doc.start_datetime = get_datetime(start)
    doc.end_datetime = get_datetime(end)
    if group_id:
        doc.engineer = group_id
    doc.save()
    
    engineer_user = frappe.db.get_value("Resource Engineer", doc.engineer, "user_id")
    if engineer_user:
        task_subject = frappe.db.get_value("Task", doc.task, "subject") or doc.task

        frappe.publish_realtime('schedule_updated', {
            "message": f"Your schedule for {task_subject} has been updated.",
            "task": doc.task
        }, user=engineer_user)

        frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": engineer_user,
            "subject": f"Schedule Shift: {task_subject}",
            "type": "Alert"
        }).insert(ignore_permissions=True)

    return {"status": "success"}
