function render_timeline(timeline_data) {
    const all_flight_declarations = timeline_data['flight_declarations'];
    const view_type = timeline_data['view_type'];
    if (all_flight_declarations.length > 0) {
        var container = document.getElementById('visualization');
        const declarations_len = all_flight_declarations.length;
        var op_types = { 1: 'VLOS', 2: 'BVLOS' };
        const dataset_items = []
        if (declarations_len !== 0) {
            for (var j1 = 0; j1 < declarations_len; j1++) {
                var cur_declaration = all_flight_declarations[j1];
                const start_date_time = new Date(cur_declaration.start_datetime);
                const end_date_time = new Date(cur_declaration.end_datetime);
                dataset_items.push({ id: cur_declaration['id'], content: cur_declaration.originating_party, start: start_date_time, end: end_date_time })

            }
            // Create a DataSet (allows two way data-binding)
            var items = new vis.DataSet(dataset_items);
            // Configuration for the Timeline
            var options = {
                "editable": false, 
                "moment": function (date) {
                    return vis.moment(date).utc();
                }
            };

            // Create a Timeline
            var timeline = new vis.Timeline(container, items, options);
            if (view_type =='map'){
                timeline.on('select', function (properties) {
                    const selected_id = properties.items[0];
                    
                    highlight_flight_declaration(selected_id);
                  });
            }
            
        }
    }
    function move(percentage) {
        var range = timeline.getWindow();
        var interval = range.end - range.start;

        timeline.setWindow({
            start: range.start.valueOf() - interval * percentage,
            end: range.end.valueOf() - interval * percentage
        });
    }

    // attach events to the navigation buttons
    document.getElementById('zoomIn').onclick = function () { timeline.zoomIn(0.2); };
    document.getElementById('zoomOut').onclick = function () { timeline.zoomOut(0.2); };
    document.getElementById('moveLeft').onclick = function () { move(0.2); };
    document.getElementById('moveRight').onclick = function () { move(-0.2); };

}