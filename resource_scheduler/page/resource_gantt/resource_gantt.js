frappe.pages['resource-gantt'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Resource Scheduling Board',
        single_column: true
    });

    frappe.require([
        "https://cdnjs.cloudflare.com/ajax/libs/vis-timeline/7.7.3/vis-timeline-graph2d.min.css",
        "https://cdnjs.cloudflare.com/ajax/libs/vis-timeline/7.7.3/vis-timeline-graph2d.min.js"
    ], function() {
        initialize_resource_board(page);
    });
};

function initialize_resource_board(page) {
    $(page.body).html('<div id="visualization" style="background: #fff; padding: 15px; border-radius: 4px; box-shadow: var(--card-shadow);"></div>');

    frappe.call({
        method: 'resource_scheduler.api.get_scheduling_data',
        callback: function(r) {
            if (!r.message) return;

            var container = document.getElementById('visualization');
            var groups = new vis.DataSet(r.message.groups);
            var items = new vis.DataSet(r.message.items);

            var options = {
                editable: true,
                selectable: true,
                snap: function (date, scale, step) {
                    var hour = 30 * 60 * 1000;
                    return new Date(Math.round(date.getTime() / hour) * hour);
                },
                orientation: 'top',
                stack: false,
                start: new Date(),
                end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) 
            };

            var timeline = new vis.Timeline(container, items, groups, options);

            timeline.on('itemmove', function (properties) {
                var item = items.get(properties.id);
                frappe.call({
                    method: 'resource_scheduler.api.update_block_time',
                    args: {
                        block_id: item.id,
                        start: item.start,
                        end: item.end,
                        group_id: item.group
                    },
                    callback: function(r) {
                        frappe.show_alert({message: __('Timeline updated & Engineer notified!'), indicator: 'green'});
                    }
                });
            });
        }
    });
}
