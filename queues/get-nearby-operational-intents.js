const tile38_host = process.env.TILE38_SERVER || "0.0.0.0";
const tile38_port = process.env.TILE38_PORT || 9851;
const redis_client = require("../routes/redis-client");

const { randomUUID: uuidv4 } = require("crypto");
const { sendStdMsg } = require("../util/io");
var Tile38 = require("tile38");
const tile38_client = new Tile38({ host: tile38_host, port: tile38_port });
const axios = require("axios");
require("dotenv").config();
const qs = require("qs");
let passport_helper = require("../routes/passport_helper");

function setFlightDeclarationsLocally(query_uuid, operational_intent_detail) {
  console.log("Setting operational intents locally...");
  console.log(
    "Found " +
      operational_intent_detail.features.length +
      " operational intents to set locally."
  );

  let random_operational_intent_id = "";
  for (const operational_intent_feature of operational_intent_detail.features) {
    // Create a new operational intent

    let upper_limit = operational_intent_feature["properties"]["max_altitude"];
    let lower_limit = operational_intent_feature["properties"]["min_altitude"];
    let operational_intent_id =
      operational_intent_feature["properties"][
        "operational_intent_reference_id"
      ] || "unknown_id";
    let operational_intent_manager =
      operational_intent_feature["properties"]["operational_intent_manager"] ||
      "unknown_manager";
    let operational_intent_state =
      operational_intent_feature["properties"]["state"] || "unknown_state";

    console.debug("Setting nearby operational intent geojson..");
    random_operational_intent_id = uuidv4();

    tile38_client.set(
      "operational_intents_in_aoi",
      random_operational_intent_id,
      operational_intent_feature["geometry"],
      {
        "upper_limit": upper_limit,
        "lower_limit": lower_limit,
        "operational_intent_id": operational_intent_id,
        "operational_intent_manager": operational_intent_manager,
        "operational_intent_state": operational_intent_state,
      },
      {
        expire: 20,
      }
    );
  }
}

const getNearbyOperationalIntentsProcess = async (job) => {
  await new Promise((r) => setTimeout(r, 1000));

  const { viewport, job_id, job_type } = job.data;
  try {
    const passport_token = await passport_helper.getPassportToken();
    const cred = `Bearer ${passport_token}`;
    const base_url = process.env.BLENDER_BASE_URL || "http://local.test:8000";
    const axios_instance = axios.create({
      headers: {
        "Content-Type": "application/json",
        Authorization: cred,
      },
    });

    const viewport_str = viewport.join(",");
    const network_flight_declarations_url = `${base_url}/flight_declaration_ops/network_flight_declarations_by_view?view=${viewport_str}`;

    const blender_response = await axios_instance.get(
      network_flight_declarations_url
    );

    const nearby_flight_declaration_geo_json = blender_response.data;

    if (nearby_flight_declaration_geo_json.features) {
      setFlightDeclarationsLocally(job_id, nearby_flight_declaration_geo_json);
    }

    console.debug("Completed retrieving nearby operational intent GeoJSON...");

    console.debug("Nearby operational intents query complete..");
  } catch (error) {
    console.error(
      "Error in retrieving nearby operational intents:",
      error.response?.data || error.message
    );
  }
  await new Promise((r) => setTimeout(r, 2500));
  const operational_intent_query = tile38_client
    .intersectsQuery("operational_intents_in_aoi")
    .bounds(viewport[0], viewport[1], viewport[2], viewport[3]);

  operational_intent_query
    .execute()
    .then((operational_intent_search_results) => {
      console.log(
        "Found " +
          operational_intent_search_results.objects.length +
          " nearby operational intents.."
      );

      const userEmail = job.data.userEmail;

      sendStdMsg(userEmail, {
        type: "message",
        alert_type: "operational_intents_in_aoi",
        results: operational_intent_search_results,
      });
    })
    .catch((err) => {
      console.error("Error executing operational intent query: " + err);
    });
};

module.exports = {
  getNearbyOperationalIntentsProcess,
};
