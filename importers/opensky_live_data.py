from lib.opensky_api import OpenSkyApi
import os
from dotenv import load_dotenv, find_dotenv

ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

api = OpenSkyApi(username=os.environ.get('OPENSKY_NETWORK_USERNAME'), password= os.environ.get('OPENSKY_NETWORK_PASSWORD'))
# bbox = (min latitude, max latitude, min longitude, max longitude)
states = api.get_states(bbox=( 30.06305694580078, -2.0886562051188324,  30.23059844970703,  -1.8670019724560796 ))
# states = api.get_states(bbox=(45.8389, 47.8229, 5.9962, 10.5226))
for s in states.states:
    print("(%r, %r, %r, %r)" % (s.longitude, s.latitude, s.baro_altitude, s.velocity))