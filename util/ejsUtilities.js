
const turf = require("@turf/turf");


let getCentroidLink = function (bounds_str) {
    let bounds_arr = bounds_str.split(',');
    let bbox = bounds_arr.map(Number);

    let bboxPolygon = turf.bboxPolygon(bbox);
    let centroid = turf.centroid(bboxPolygon);

    let latitude = centroid.geometry.coordinates[1];
    let longitude = centroid.geometry.coordinates[0];
    let centroid_live_view_url = "/spotlight/?lat=" + latitude + "&lng=" + longitude;
    return centroid_live_view_url;
}

module.exports = { getCentroidLink };